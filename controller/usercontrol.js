const createError = require('http-errors');
const httpCreate = require('../middleware/httpCreate');
const userService = require('../services/userservice');
// Menggunakan multi-path untuk kompatibilitas Vercel
const path = require('path');
let userDao;

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
    console.log(`Trying to load userDao in usercontrol from: ${p}`);
    userDao = require(p);
    console.log(`Successfully loaded userDao in usercontrol from: ${p}`);
    loaded = true;
    break;
  } catch (e) {
    console.log(`Failed to load from ${p} in usercontrol: ${e.message}`);
  }
}

// Jika semua gagal, gunakan implementasi minimal
if (!loaded) {
  console.warn('All paths failed in usercontrol, using minimal implementation for userDao');
  userDao = {
    findUserByUsername: async () => null,
    findUserByEmail: async () => null,
    findUserById: async () => ({})
  };
}

const userController = {
  // GET /designerdetails?uid=xxx
  handleDesignerDetails: async (req, res, next) => {
    try {
      const { uid } = req.query;
      if (!uid) return res.status(400).json({ success: false, message: 'uid diperlukan' });
      const user = await userService.getDesignerDetailsByUid(uid);
      if (!user) return res.status(404).json({ success: false, message: 'Designer tidak ditemukan' });
      // Only expose safe fields
      const { uname, uid: userId, ppict, user_desc, user_job, email, status, instagram, whatsapp, location } = user;
      return res.status(200).json({
        success: true,
        data: { uname, uid: userId, ppict, user_desc, user_job, email, status, instagram, whatsapp, location }
      });
    } catch (error) {
      // Always return JSON error
      return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
  },
  // Self delete (pending 7 hari)
  handleSelfDelete: async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const { email, password, confirmPassword } = req.body;
      const result = await userService.selfDeleteLogic(userId, { email, password, confirmPassword });
      return httpCreate.success(res, 200, result.message);
    } catch (error) {
      return next(createError(400, error.message || 'Gagal menghapus akun'));
    }
  },
  // Admin delete
  handleAdminDelete: async (req, res, next) => {
    try {
      const { uid } = req.params;
      const result = await userService.adminDeleteLogic(Number(uid));
      return httpCreate.success(res, 200, result.message);
    } catch (error) {
      return next(createError(400, error.message || 'Gagal menghapus user'));
    }
  },
  // Admin undelete
  handleAdminUndelete: async (req, res, next) => {
    try {
      const { uid } = req.params;
      const result = await userService.adminUndeleteLogic(Number(uid));
      return httpCreate.success(res, 200, result.message);
    } catch (error) {
      return next(createError(400, error.message || 'Gagal restore user'));
    }
  },
  handleRegister: async (req, res, next) => {
    try {
      console.log('Received register request:', {
        body: req.body,
        file: req.file ? { 
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          size: req.file.size,
          path: req.file.path 
        } : 'No file uploaded'
      });
      
      // Pastikan semua field wajib ada
      const { uname, password, confirmPassword, email } = req.body;
      
      if (!uname || !password || !confirmPassword || !email) {
        const missingFields = [];
        if (!uname) missingFields.push('uname');
        if (!password) missingFields.push('password');
        if (!confirmPassword) missingFields.push('confirmPassword');
        if (!email) missingFields.push('email');
        
        const errorMsg = `Field berikut wajib diisi: ${missingFields.join(', ')}`;
        console.log('Register validation error:', errorMsg);
        return res.status(400).json({
          success: false,
          message: errorMsg
        });
      }

      let ppict;
      if (req.file) {
        // Proses gambar di memory tanpa menulis ke file system
        // Gunakan nama file virtual untuk disimpan di database
        const filename = `profile_${uname}_${Date.now()}.jpg`;
        ppict = `/prisma/profil/${filename}`;
        
        // Jika di development, kita bisa log informasi file
        console.log(`Profile picture processed: ${filename}`);
        console.log(`File size: ${req.file.size} bytes, MIME type: ${req.file.mimetype}`);
        
        // Di Vercel production, kita tidak bisa menulis file
        // Untuk implementasi lengkap, gunakan layanan cloud storage seperti S3/Cloudinary
        // Untuk saat ini, kita hanya menyimpan referensi di database
      } else {
        ppict = undefined;
        console.log('No profile picture uploaded.');
      }

      const userData = { uname, password, confirmPassword, email, ppict };
      
      try {
        const result = await userService.registerControllerLogic(userData);
        // Log hanya field aman
        console.log('Registration success:', {
          uname: result.uname,
          email: result.email,
          status: result.status,
        });
        // Hanya expose uname, email, status
        return httpCreate.success(res, 201, 'Selamat Datang!', {
          uname: result.uname,
          email: result.email,
          status: result.status || 'View',
        });
      } catch (serviceError) {
        console.error('Registration service error:', serviceError);
        return res.status(400).json({
          success: false,
          message: serviceError.message || 'Terjadi kesalahan saat register'
        });
      }
    } catch (error) {
      console.error('Uncaught register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan sistem saat register'
      });
    }
  },

  handleLogin: async (req, res, next) => {
    try {
      console.log('[LOGIN DEBUG] Payload:', req.body);
      const { uname, password, setCookie } = req.body;
      const result = await userService.loginControllerLogic({ uname, password });
      // Jika request minta set cookie, set accessToken dan refreshToken ke cookie
      if (setCookie) {
        res.cookie('accessToken', result.token, { httpOnly: true, maxAge: 10 * 60 * 60 * 1000 }); // 10 jam
        res.cookie('refreshToken', result.refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 hari
      }
      return res.json(result);
    } catch (err) {
      return next(createError(401, err.message || 'Login gagal'));
    }
  },

  handleRefreshToken: async (req, res, next) => {
    try {
      // Ambil refreshToken dari body atau cookie
      let refreshToken = req.body.refreshToken;
      if (!refreshToken && req.cookies && req.cookies.refreshToken) {
        refreshToken = req.cookies.refreshToken;
      }
      if (!refreshToken) {
        return next(createError(400, 'Refresh token wajib diisi'));
      }
      const result = await userService.refreshTokenLogic(refreshToken);
      // Jika request minta set cookie, set accessToken baru ke cookie
      // Fix: Node.js 18+ req.query is readonly, only access if exists and is object
      if (req.body.setCookie || (typeof req.query === 'object' && req.query.setCookie)) {
        res.cookie('accessToken', result.token, { httpOnly: true, maxAge: 10 * 60 * 60 * 1000 }); // 10 jam
      }
      return res.json(result);
    } catch (err) {
      return next(createError(401, err.message || 'Refresh token tidak valid'));
    }
  },

  getUserProfile: async (req, res, next) => {
    try {
      // req.user diperoleh dari middleware auth
      const userId = req.user.uid;
      
      // Dapatkan data user dari database
      const user = await userDao.findUserById(userId);
      
      if (!user) {
        return next(createError(404, 'User tidak ditemukan'));
      }
      
      // Sesuaikan data yang ditampilkan berdasarkan status user
      let userData = {};
      
      // Data dasar yang selalu ditampilkan sesuai urutan yang diminta
      userData = {
        ppict: user.ppict ? (
          user.ppict.startsWith('http') 
            ? user.ppict 
            : `${process.env.BASE_URL || 'http://localhost:3000'}/${user.ppict.startsWith('/') ? user.ppict.substring(1) : user.ppict}`
        ) : null,
        uname: user.uname,
        email: user.email,
        user_desc: user.user_desc || null,
        status: user.status,
        created_at: user.created_at
      };
      
      console.log('Created at from database:', user.created_at);
      
      // Jika status user adalah Post atau Admin, tambahkan data tambahan
      if (user.status === 'Post' || user.status === 'Admin') {
        userData = {
          ...userData,
          user_job: user.user_job || null,
          location: user.location || null,
          whatsapp: user.whatsapp || null,
          instagram: user.instagram || null
        };
      }
      
      return httpCreate.success(res, 200, 'Profil berhasil diambil', userData);
    } catch (error) {
      return next(createError(400, error.message || 'Gagal mengambil profil'));
    }
  },

  updateUserProfile: async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const updateData = req.body;
      const ppict = req.file ? req.file.path.replace(/\\/g, "/") : undefined;
      
      if (ppict) {
        updateData.ppict = ppict;
      }

      const updatedProfile = await userService.updateUserProfileLogic(userId, updateData);
      return httpCreate.success(res, 200, 'Profil berhasil diperbarui', updatedProfile);
    } catch (error) {
      return next(createError(400, error.message || 'Gagal memperbarui profil'));
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
      
      await userService.changePasswordLogic(userId, currentPassword, newPassword, confirmNewPassword);
      return httpCreate.success(res, 200, 'Password berhasil diubah');
    } catch (error) {
      return next(createError(400, error.message || 'Gagal mengubah password'));
    }
  },
  // Controller: GET 5 user random status Post yang punya minimal 1 portofolio aktif
  handleRandomPostUsersWithPortfolio: async (req, res, next) => {
    try {
      const users = await userService.getRandomPostUsersWithPortfolio(5);
      return res.status(200).json({ users });
    } catch (error) {
      return next(createError(500, error.message || 'Gagal mengambil user'));
    }
  },
  // GET /designer-list?page=1&limit=8
  handleDesignerList: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8;
      const result = await userService.getDesignerListWithPortfolioCount(page, limit);
      return res.status(200).json(result);
    } catch (error) {
      return next(createError(500, error.message || 'Gagal mengambil daftar designer'));
    }
  },
  // POST /user/profile-image
  updateProfileImage: async (req, res, next) => {
    try {
      const uid = req.user ? req.user.uid : req.body.uid;
      if (!uid) return res.status(400).json({ success: false, message: 'uid diperlukan' });
      if (!req.file) return res.status(400).json({ success: false, message: 'File gambar diperlukan' });
      
      // Proses gambar di memory tanpa menulis ke file system
      // Gunakan nama file virtual untuk disimpan di database
      const filename = `profile_${uid}_${Date.now()}.jpg`;
      
      // Log informasi file untuk debugging
      console.log(`Profile picture processed: ${filename}`);
      console.log(`File size: ${req.file.size} bytes, MIME type: ${req.file.mimetype}`);
      
      // PENTING: Di Vercel, kita menggunakan virtual path
      // Ini adalah path yang tidak benar-benar ada di filesystem
      // Tapi kita simpan di database untuk kompatibilitas dengan data yang sudah ada
      // Untuk implementasi lengkap, gunakan layanan cloud storage seperti S3/Cloudinary
      
      // Simpan path virtual ke DB (sama seperti sebelumnya untuk menjaga kompatibilitas data)
      const virtualPath = `/prisma/profil/${filename}`;
      
      // Update DB user dengan path virtual
      await userService.updateProfilePicture(uid, virtualPath);
      
      // Buat URL absolut untuk frontend (gunakan BASE_URL dari environment variable)
      const baseUrl = process.env.BASE_URL || 'https://web-homera.vercel.app';
      const absoluteUrl = `${baseUrl}/api/images/${uid}/${filename}`;
      
      return res.status(200).json({ 
        success: true, 
        message: 'Foto profil berhasil diupdate', 
        path: virtualPath,
        url: absoluteUrl
      });
    } catch (error) {
      console.error('Uncaught updateProfileImage error:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat upload foto profil'
      });
    }
  },
  
  // GET /profile - Mendapatkan profil user yang sedang login
  getUserProfile: async (req, res, next) => {
  try {
    const userId = req.user.uid;
    console.log('Getting profile for user ID:', userId);
    
    // Dapatkan raw user data dari database
    const user = await userDao.findUserById(userId);
    console.log('Raw user data from database:', user);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    
    // Sesuaikan data yang ditampilkan berdasarkan status user
    let userData = {};
    
    // Data dasar yang selalu ditampilkan
    // Untuk path gambar, kita perlu menangani dengan benar di Vercel
    const baseUrl = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://web-homera.vercel.app' : 'http://localhost:3000');
    
    userData = {
      // Jika ppict sudah berupa URL lengkap, gunakan apa adanya
      // Jika ppict adalah path virtual, ubah menjadi URL API images
      ppict: user.ppict ? (
        user.ppict.startsWith('http') 
          ? user.ppict 
          : user.ppict.includes('/prisma/profil/')
            ? `${baseUrl}/api/images/${user.uid}/${user.ppict.split('/').pop()}`
            : `${baseUrl}/${user.ppict.startsWith('/') ? user.ppict.substring(1) : user.ppict}`
      ) : null,
      uname: user.uname,
      email: user.email,
      user_desc: user.user_desc || null,
      status: user.status,
      created_at: user.created_at
    };
    
    console.log('Created at from database:', user.created_at);
    
    // Jika status user adalah Post atau Admin, tambahkan data tambahan
    if (user.status === 'Post' || user.status === 'Admin') {
      userData = {
        ...userData,
        instagram: user.instagram || null,
        whatsapp: user.whatsapp || null,
        user_job: user.user_job || null,
        location: user.location || null
      };
    }
    
    return res.status(200).json({ 
      success: true, 
      data: userData
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal mengambil profil user' });
  }
},

  getProfilePictureOnly: async (req, res, next) => {
    try {
      const userId = req.user.uid;
      console.log('Getting profile picture for user ID:', userId);
      
      // Dapatkan raw user data dari database untuk debugging
      const rawUser = await userDao.findUserById(userId);
      console.log('Raw user data from database:', rawUser);
      
      // Gunakan data langsung dari database karena getUserProfileLogic mungkin belum diimplementasi
      const user = rawUser;
    
    if (!user || !user.ppict) {
      console.log('Profile picture not found for user:', userId);
      return res.status(404).json({ success: false, message: 'Foto profil tidak ditemukan' });
    }
    
    // Kembalikan URL foto profil yang benar
    console.log('Raw ppict value:', user.ppict);
    
    // Pastikan URL memiliki format yang benar
    let finalUrl = user.ppict;
    if (finalUrl && !finalUrl.includes('://')) {
      // Jika tidak ada protokol, tambahkan http://
      finalUrl = `http://localhost:3000/${finalUrl.startsWith('/') ? finalUrl.substring(1) : finalUrl}`;
      console.log('Fixed URL:', finalUrl);
    }
    
    return res.status(200).json({ success: true, ppict: finalUrl });
  } catch (error) {
    console.error('Error in getProfilePictureOnly:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal mengambil foto profil' });
  }
},

};

module.exports = userController;
