const createError = require('http-errors');
const httpCreate = require('../middleware/httpCreate');
const userService= require('../services/userservice');

const userController = {
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
      const { uname, password, confirmPassword, email } = req.body;
      const ppict = req.file ? req.file.path.replace(/\\/g, "/") : undefined;

      const userData = { uname, password, confirmPassword, email, ppict };
      const result = await userService.registerControllerLogic(userData);

      return httpCreate.success(res, 201, 'Selamat Datang!');
    } catch (error) {
      return next(createError(400, error.message || 'Terjadi kesalahan saat register'));
    }
  },

  handleLogin: async (req, res, next) => {
    try {
      const { uname, password } = req.body;
      const result = await userService.loginControllerLogic({ uname, password });

      return httpCreate.success(res, 200, 'Login berhasil', result);
    } catch (error) {
      return next(createError(401, error.message || 'Login gagal'));
    }
  },

  handleRefreshToken: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return next(createError(400, 'Refresh token diperlukan'));
      }

      const result = await userService.refreshTokenLogic(refreshToken);
      return httpCreate.success(res, 200, 'Token berhasil diperbarui', result);
    } catch (error) {
      return next(createError(401, error.message || 'Gagal memperbarui token'));
    }
  },

  getUserProfile: async (req, res, next) => {
    try {
      // req.user diperoleh dari middleware auth
      const userId = req.user.uid;
      const userProfile = await userService.getUserProfileLogic(userId);
      
      return httpCreate.success(res, 200, 'Profil berhasil diambil', userProfile);
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
  }
};

module.exports = userController;
