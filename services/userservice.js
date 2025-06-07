// Menggunakan multi-path untuk kompatibilitas Vercel
const path = require('path');
// Import imageUtils untuk menangani URL gambar
const { formatImageUrl, formatDefaultImage, isDefaultImage } = require('../utils/imageUtils');
let userDao;

// Import cloudinaryService untuk file processing
let cloudinaryService;
try {
  cloudinaryService = require('./cloudinaryService');
  console.log('Cloudinary service loaded successfully');
} catch (e) {
  console.warn('Failed to load cloudinaryService, using fallback:', e.message);
  // Fallback jika tidak bisa load cloudinaryService
  cloudinaryService = {
    uploadToCloudinary: async () => ({
      url: null,
      publicId: null,
      filePath: null
    }),
    deleteFromCloudinary: async () => true
  };
}

// Daftar kemungkinan path untuk userDao
const possiblePaths = [
  '../dao/userdao',                                // Path relatif normal
  path.join(process.cwd(), 'dao', 'userdao.js'),   // Path absolut root
  path.join(process.cwd(), 'api/dao', 'userdao.js'), // Path absolut di api/dao
  '../../dao/userdao',                             // Path relatif lain
  '../api/dao/userdao'                             // Path ke api/dao folder
];

// Coba setiap path sampai salah satu berhasil
let loaded = false;
for (const p of possiblePaths) {
  try {
    console.log(`Trying to load userDao from: ${p}`);
    userDao = require(p);
    console.log(`Successfully loaded userDao from: ${p}`);
    loaded = true;
    break;
  } catch (e) {
    console.log(`Failed to load from ${p}: ${e.message}`);
  }
}

// Jika semua gagal, gunakan implementasi minimal
if (!loaded) {
  console.warn('All paths failed, using minimal implementation for userDao');
  userDao = {
    findUserByUsername: async () => null,
    findUserByEmail: async () => null,
    createUser: async () => ({}),
    findUserById: async () => ({})
  };
}
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Gunakan singleton Prisma Client untuk menghindari error di Vercel
const prisma = require('../prisma/client');

// Token store in-memory (for demo/dev)
const tokenStore = {};

const JWT_SECRET = process.env.JWT_SECRET || 'homera_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'homera_refresh_secret';

// Helper: mapping user DB ke response uniform, human readable, efektif
function userToResponse(user, opts = {}) {
  if (!user || user.isdelete || (user.pending_delete_until && new Date(user.pending_delete_until) > new Date())) {
    return {
      userId: user?.uid || null,
      username: '[Deleted_User]',
      profilePicture: null,
      description: null,
      email: null,
      status: null,
      statusLabel: null,
      createdAt: user?.created_at || null
    };
  }
  // Mapping field
  return {
    userId: user.uid,
    username: user.uname,
    profilePicture: user.ppict ? (
      // Support for Cloudinary URLs (already https://)
      user.ppict.startsWith('http') 
        ? user.ppict 
        // Support for file system paths (development mode)
        : `${process.env.BASE_URL || 'http://localhost:3000'}/${user.ppict.startsWith('/') ? user.ppict.substring(1) : user.ppict}`
    ) : null,
    description: user.user_desc || null,
    email: user.email,
    status: user.status,
    statusLabel: user.status === 'Admin' ? 'Admin' : (user.status === 'Post' ? 'Poster' : 'Viewer'),
    instagram: user.instagram || null,
    whatsapp: user.whatsapp || null,
    job: user.user_job || null,
    location: user.location || null,
    createdAt: user.created_at,
    ...(opts.includePendingDelete ? { pendingDeleteUntil: user.pending_delete_until } : {})
  };
}

const userService = {
  // Ambil detail designer by UID
  getDesignerDetailsByUid: async (uid) => {
    if (!uid) return null;
    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uname: true,
        uid: true,
        ppict: true,
        user_desc: true,
        user_job: true,
        email: true,
        status: true,
        instagram: true,
        whatsapp: true,
        location: true
      }
    });
    return user;
  },
  // PAGINATED DESIGNER LIST
  getDesignerListWithPortfolioCount: async (page = 1, limit = 6) => {
    try {
      console.log(`[DEBUG] Fetching designers with page=${page}, limit=${limit}`);
      const skip = (page - 1) * limit;
      
      // Periksa terlebih dahulu apakah ada user dengan status 'Post' tanpa kondisi portofolio
      const justPostUsers = await prisma.user.count({
        where: {
          status: 'Post',
          isdelete: false,
        }
      });
      console.log(`[DEBUG] Total users with status 'Post' (tanpa kondisi portofolio): ${justPostUsers}`);
      
      // Periksa terlebih dahulu apakah ada user dengan status 'Post' dan memiliki portofolio
      const debugCount = await prisma.user.count({
        where: {
          status: 'Post',
          isdelete: false,
          portofolio: { some: { isdelete: false } }
        }
      });
      console.log(`[DEBUG] Total users with status 'Post' and active portfolios: ${debugCount}`);
      
      // Jika tidak ada user dengan portofolio, kita tampilkan semua user dengan status Post
      // Ini solusi sementara untuk menampilkan data
      const shouldFilterPortfolio = debugCount > 0;
      console.log(`[DEBUG] Filtering by portfolio: ${shouldFilterPortfolio}`);
      
      // Query utama - disesuaikan berdasarkan ketersediaan portofolio
      const whereCondition = {
        status: 'Post',
        isdelete: false,
        ...(shouldFilterPortfolio ? { portofolio: { some: { isdelete: false } } } : {})
      };
      
      const [designers, total] = await Promise.all([
        prisma.user.findMany({
          where: whereCondition,
          include: {
            portofolio: {
              where: { isdelete: false },
              select: { porto_id: true }
            }
          },
          orderBy: shouldFilterPortfolio
            ? [
                { portofolio: { _count: 'desc' } },
                { uid: 'asc' }
              ]
            : [{ uid: 'asc' }],  // Jika tidak filter portofolio, urutkan berdasarkan uid saja
          skip,
          take: limit
        }),
        prisma.user.count({
          where: whereCondition
        })
      ]);
      
      console.log(`[DEBUG] Found ${designers.length} designers for page ${page}`);
      
      // Proses hasil
      const processedDesigners = designers.map(u => {
        // Menangani ppict dengan aman
        let profilePicture = null;
        if (u.ppict) {
          // Jika sudah merupakan URL lengkap, gunakan apa adanya
          if (u.ppict.startsWith('http')) {
            profilePicture = u.ppict;
          } else {
            // Normalkan path relatif menjadi URL lengkap
            // Foto profil disimpan di /prisma/profil/
            profilePicture = (process.env.BASE_URL || 'http://localhost:3000') + '/' + u.ppict;
          }
        }
        
        return {
          uid: u.uid,
          uname: u.uname,
          ppict: profilePicture,
          portfolioCount: Array.isArray(u.portofolio) ? u.portofolio.length : 0
        };
      });
      
      return {
        designers: processedDesigners,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('[ERROR] getDesignerListWithPortfolioCount failed:', error);
      throw error;
    }
  },

  // 5 RANDOM POST USERS WITH PORTFOLIO
  getRandomPostUsersWithPortfolio: async (limit = 5) => {
    const users = await userDao.findRandomPostUsersWithPortfolio(limit);
    return users.map(u => {
      // Gunakan imageUtils untuk format URL gambar
      const profilePicture = formatImageUrl(u.ppict || 'profil/Default.JPG', 'profil');
      
      return {
        userId: u.uid,
        username: u.uname,
        profilePicture: profilePicture,
        // Tambahkan field lain yang mungkin dibutuhkan frontend
        status: u.status,
        user_job: u.user_job || null,
        location: u.location || null
      };
    });
  },

  isUserDeletedOrPending: (user) => {
    if (!user) return true;
    if (user.isdelete) return true;
    if (user.pending_delete_until && new Date(user.pending_delete_until) > new Date()) return true;
    return false;
  },

  registerControllerLogic: async ({ uname, password, confirmPassword, email, ppict }) => {
    if (!uname || !password || !confirmPassword || !email) {
      throw new Error('Semua field wajib diisi.');
    }
    if (password !== confirmPassword) {
      throw new Error('Password tidak cocok.');
    }
    const usernameUsed = await userDao.checkUsernameExists(uname);
    if (usernameUsed) {
      throw new Error('Username sudah digunakan.');
    }
    const emailUsed = await userDao.checkEmailExists(email);
    if (emailUsed) {
      throw new Error('Email sudah terdaftar.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userDao.createUser({
      uname,
      password: hashedPassword,
      email,
      ppict: ppict || 'profil/Default.JPG',
    });
    return user;
  },

  loginControllerLogic: async ({ uname, password }) => {
    if (!uname || !password) {
      throw new Error('Username dan password wajib diisi.');
    }
    const user = await userDao.findUserByUsernameOrEmail(uname);
    if (!user) {
      throw new Error('Username/email tidak ditemukan.');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Password salah.');
    }
    const token = jwt.sign(
      {
        uid: user.uid,
        status: user.status,
        uname: user.uname,
      },
      JWT_SECRET,
      { expiresIn: '10h' }
    );
    const refreshToken = jwt.sign(
      { uid: user.uid },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    await userDao.saveRefreshToken(user.uid, refreshToken);
    return {
      token,
      refreshToken,
      user: {
        uid: user.uid,
        uname: user.uname,
        status: user.status,
      },
    };
  },

  refreshTokenLogic: async (refreshToken) => {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      const storedToken = await userDao.findRefreshToken(decoded.uid, refreshToken);
      if (!storedToken) {
        throw new Error('Refresh token tidak valid');
      }
      const user = await userDao.findUserById(decoded.uid);
      if (!user) {
        throw new Error('User tidak ditemukan');
      }
      const newToken = jwt.sign(
        {
          uid: user.uid,
          status: user.status,
          uname: user.uname,
        },
        JWT_SECRET,
        { expiresIn: '10h' }
      );
      return {
        token: newToken,
        user: {
          uid: user.uid,
          uname: user.uname,
          status: user.status,
        },
      };
    } catch (error) {
      throw new Error('Refresh token tidak valid atau kedaluwarsa');
    }
  },

  getUserProfileLogic: async (userId) => {
    const user = await userDao.findUserById(userId);
    if (!user) {
      throw new Error('User tidak ditemukan');
    }
    return userToResponse(user);
  },

  updateUserProfileLogic: async (userId, updateData) => {
    if (updateData.email) {
      const emailUsed = await userDao.checkEmailExistsExcept(updateData.email, userId);
      if (emailUsed) {
        throw new Error('Email sudah terdaftar oleh pengguna lain');
      }
    }
    if (updateData.uname) {
      const usernameUsed = await userDao.checkUsernameExistsExcept(updateData.uname, userId);
      if (usernameUsed) {
        throw new Error('Username sudah digunakan oleh pengguna lain');
      }
    }
    if (updateData.password) {
      delete updateData.password;
    }
    const updatedUser = await userDao.updateUser(userId, updateData);
    if (!updatedUser) {
      throw new Error('Gagal memperbarui profil');
    }
    const { password, ...userProfile } = updatedUser;
    return userProfile;
  },

  changePasswordLogic: async (userId, currentPassword, newPassword, confirmNewPassword) => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      throw new Error('Semua field password wajib diisi');
    }
    if (newPassword !== confirmNewPassword) {
      throw new Error('Password baru dan konfirmasi tidak cocok');
    }
    const user = await userDao.findUserById(userId);
    if (!user) {
      throw new Error('User tidak ditemukan');
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Password saat ini salah');
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await userDao.updateUser(userId, { password: hashedNewPassword });
    return { message: 'Password berhasil diubah' };
  },

  deleteUserLogic: async (userId) => {
    const until = new Date(Date.now() + 7*24*60*60*1000);
    await userDao.setPendingDelete(userId, until);
    return { message: 'Akun Anda akan dihapus dalam 7 hari jika tidak ada aktivitas. Bisa direcover selama periode ini.' };
  },

  adminDeleteLogic: async (targetUid) => {
    const user = await userDao.findUserById(targetUid);
    if (!user) throw new Error('User tidak ditemukan');
    if (user.isdelete) throw new Error('Akun sudah dihapus');
    await userDao.setSoftDelete(targetUid);
    return { message: 'User berhasil dihapus (soft delete).' };
  },

  adminUndeleteLogic: async (targetUid) => {
    const user = await userDao.findUserById(targetUid);
    if (!user) throw new Error('User tidak ditemukan');
    if (!user.isdelete) throw new Error('User belum dihapus');
    await userDao.undeleteUser(targetUid);
    return { message: 'User berhasil direstore.' };
  },

  isUserDeletedOrPending: (user) => {
    if (!user) return true;
    if (user.isdelete) return true;
    if (user.pending_delete_until && new Date(user.pending_delete_until) > new Date()) return true;
    return false;
  },
  registerControllerLogic: async ({ uname, password, confirmPassword, email, ppict }) => {
    if (!uname || !password || !confirmPassword || !email) {
      throw new Error('Semua field wajib diisi.');
    }

    if (password !== confirmPassword) {
      throw new Error('Password tidak cocok.');
    }

    const usernameUsed = await userDao.checkUsernameExists(uname);
    if (usernameUsed) {
      throw new Error('Username sudah digunakan.');
    }

    const emailUsed = await userDao.checkEmailExists(email);
    if (emailUsed) {
      throw new Error('Email sudah terdaftar.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userDao.createUser({
      uname,
      password: hashedPassword,
      email,
      ppict: ppict || 'profil/Default.JPG',
    });

    return user;
  },

  loginControllerLogic: async ({ uname, password }) => {
    if (!uname || !password) {
      throw new Error('Username dan password wajib diisi.');
    }

    const user = await userDao.findUserByUsernameOrEmail(uname);
    if (!user) {
      throw new Error('Username/email tidak ditemukan.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Password salah.');
    }

    // Generate access token
    const token = jwt.sign(
      {
        uid: user.uid,
        status: user.status,
        uname: user.uname,
      },
      JWT_SECRET,
      { expiresIn: '10h' }
    );

    // Generate refresh token (lebih lama masa berlakunya)
    const refreshToken = jwt.sign(
      { uid: user.uid },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Simpan refresh token di database
    await userDao.saveRefreshToken(user.uid, refreshToken);

    return {
      token,
      refreshToken,
      user: {
        uid: user.uid,
        uname: user.uname,
        status: user.status,
      },
    };
  },

  refreshTokenLogic: async (refreshToken) => {
    try {
      // Verifikasi refresh token
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      
      // Cek apakah refresh token valid di database
      const storedToken = await userDao.findRefreshToken(decoded.uid, refreshToken);
      if (!storedToken) {
        throw new Error('Refresh token tidak valid');
      }

      // Ambil data user
      const user = await userDao.findUserById(decoded.uid);
      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      // Generate access token baru
      const newToken = jwt.sign(
        {
          uid: user.uid,
          status: user.status,
          uname: user.uname,
        },
        JWT_SECRET,
        { expiresIn: '10h' }
      );

      return {
        token: newToken,
        user: {
          uid: user.uid,
          uname: user.uname,
          status: user.status,
        },
      };
    } catch (error) {
      throw new Error('Refresh token tidak valid atau kedaluwarsa');
    }
  },

  getUserProfileLogic: async (userId) => {
    const user = await userDao.findUserById(userId);
    if (!user) {
      throw new Error('User tidak ditemukan');
    }
    return userToResponse(user);
  },

  updateUserProfileLogic: async (userId, updateData) => {
    // Cek apakah email baru sudah digunakan (jika email diupdate)
    if (updateData.email) {
      const emailUsed = await userDao.checkEmailExistsExcept(updateData.email, userId);
      if (emailUsed) {
        throw new Error('Email sudah terdaftar oleh pengguna lain');
      }
    }

    // Cek apakah username baru sudah digunakan (jika username diupdate)
    if (updateData.uname) {
      const usernameUsed = await userDao.checkUsernameExistsExcept(updateData.uname, userId);
      if (usernameUsed) {
        throw new Error('Username sudah digunakan oleh pengguna lain');
      }
    }

    // Pastikan password tidak bisa diupdate melalui endpoint ini
    if (updateData.password) {
      delete updateData.password;
    }

    const updatedUser = await userDao.updateUser(userId, updateData);
    if (!updatedUser) {
      throw new Error('Gagal memperbarui profil');
    }

    // Hapus informasi sensitif sebelum dikirim ke client
    const { password, ...userProfile } = updatedUser;
    return userProfile;
  },

  changePasswordLogic: async (userId, currentPassword, newPassword, confirmNewPassword) => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      throw new Error('Semua field password wajib diisi');
    }

    if (newPassword !== confirmNewPassword) {
      throw new Error('Password baru dan konfirmasi tidak cocok');
    }

    // Validasi password lama
    const user = await userDao.findUserById(userId);
    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Password saat ini salah');
    }

    // Hash password baru
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    const updated = await userDao.updatePassword(userId, hashedNewPassword);
    if (!updated) {
      throw new Error('Gagal mengubah password');
    }

    return true;
  },
  
  // Function untuk logout (invalidasi refresh token)
  logoutLogic: async (userId, refreshToken) => {
    await userDao.removeRefreshToken(userId, refreshToken);
    return true;
  },

  // Self delete (pending 7 hari)
  selfDeleteLogic: async (userId, { email, password, confirmPassword }) => {
    if (!email || !password || !confirmPassword) throw new Error('Email dan password wajib diisi');
    if (password !== confirmPassword) throw new Error('Konfirmasi password tidak cocok');
    const user = await userDao.findUserById(userId);
    if (!user) throw new Error('User tidak ditemukan');
    if (user.isdelete) throw new Error('Akun sudah dihapus');
    if (user.email !== email) throw new Error('Email tidak sesuai');
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error('Password salah');
    // Set pending_delete_until 7 hari ke depan
    const until = new Date(Date.now() + 7*24*60*60*1000);
    await userDao.setPendingDelete(userId, until);
    return { message: 'Akun Anda akan dihapus dalam 7 hari jika tidak ada aktivitas. Bisa direcover selama periode ini.' };
  },

  // Admin delete (langsung soft delete)
  adminDeleteLogic: async (targetUid) => {
    const user = await userDao.findUserById(targetUid);
    if (!user) throw new Error('User tidak ditemukan');
    if (user.isdelete) throw new Error('Akun sudah dihapus');
    await userDao.setSoftDelete(targetUid);
    return { message: 'User berhasil dihapus (soft delete).' };
  },

  // Admin undelete
  adminUndeleteLogic: async (targetUid) => {
    const user = await userDao.findUserById(targetUid);
    if (!user) throw new Error('User tidak ditemukan');
    if (!user.isdelete) throw new Error('User belum dihapus');
    await userDao.undeleteUser(targetUid);
    return { message: 'User berhasil direstore.' };
  },

  // Update profile picture (for controller updateProfileImage)
  updateProfilePicture: async (uid, relPath) => {
    // Gunakan singleton PrismaClient untuk menghindari multiple connections
    const prisma = require('../prisma/client');
    
    try {
      // Check if relPath is a local file path (development) or already a Cloudinary URL (production)
      // Jika sudah berupa URL Cloudinary (https://), gunakan langsung
      if (relPath.startsWith('http')) {
        console.log('Updating profile with existing Cloudinary URL:', relPath);
        const user = await prisma.user.update({
          where: { uid: Number(uid) },
          data: { ppict: relPath },
        });
        return user;
      }
      
      // Jika di production mode dan relPath adalah file path, upload ke Cloudinary
      if (process.env.NODE_ENV === 'production') {
        try {
          console.log('Production mode detected, converting local path to Cloudinary URL');
          
          // Get file path to read from filesystem - untuk dev environment saja
          // Di Vercel, ini akan di-skip karena file tidak ada secara fisik
          try {
            const fs = require('fs');
            const filePath = path.join(process.cwd(), relPath.startsWith('/') ? relPath.substring(1) : relPath);
            
            // Cek apakah file ada
            if (fs.existsSync(filePath)) {
              const fileBuffer = fs.readFileSync(filePath);
              const fileObject = {
                buffer: fileBuffer,
                originalname: path.basename(filePath)
              };
              
              // Upload ke Cloudinary
              const cloudinaryResult = await cloudinaryService.uploadToCloudinary(fileObject, 'profil');
              relPath = cloudinaryResult.url; // Update path ke Cloudinary URL
              console.log('File uploaded to Cloudinary:', cloudinaryResult.url);
            } else {
              console.log('File not found locally, using path as-is:', relPath);
            }
          } catch (fsError) {
            console.warn('Failed to read local file (expected in Vercel):', fsError.message);
            // Lanjutkan dengan path yang ada karena ini normal di Vercel
          }
        } catch (cloudinaryError) {
          console.error('Failed to upload to Cloudinary:', cloudinaryError);
          // Lanjutkan dengan path relatif jika upload gagal
        }
      } else {
        console.log('Development mode, using local file path:', relPath);
      }
      
      // Update user di database dengan path baru
      const user = await prisma.user.update({
        where: { uid: Number(uid) },
        data: { ppict: relPath },
      });
      
      return user;
    } catch (error) {
      console.error('Error updating profile picture:', error);
      throw new Error('Gagal update foto profil: ' + error.message);
    }
  }
};

module.exports = userService;
