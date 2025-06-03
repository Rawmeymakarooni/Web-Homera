delete require.cache[require.resolve('../dao/userdao')];
const userDao = require('../dao/userdao');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
    profilePicture: user.ppict ? ((user.ppict.startsWith('http') ? user.ppict : (process.env.BASE_URL || 'http://localhost:3000/') + user.ppict)) : null,
    description: user.user_desc || null,
    email: user.email,
    status: user.status,
    statusLabel: user.status === 'Admin' ? 'Admin' : (user.status === 'Post' ? 'Poster' : 'Viewer'),
    instagram: user.instagram || null,
    whatsapp: user.whatsapp || null,
    job: user.user_job || null,
    location: user.location || null,
    createdAt: user.created_at,
    // Tambahan opsional jika diminta
    ...(opts.includePendingDelete ? { pendingDeleteUntil: user.pending_delete_until } : {})
  };
}

const userService = {
  // Helper: deteksi user terhapus/pending delete
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

    const user = await userDao.findUserByUsername(uname);
    if (!user) {
      throw new Error('Username tidak ditemukan.');
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
  }
};

module.exports = userService;
