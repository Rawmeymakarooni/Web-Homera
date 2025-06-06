const express = require('express');
const router = express.Router();
const userController = require('../controller/usercontrol');
const userService = require('../services/userservice');
const createError = require('http-errors');
const { upload } = require('../middleware/multer');
const auth = require('../middleware/auth');
const httpCreate = require('../middleware/httpCreate');

// Endpoint publik (tidak perlu autentikasi)

// List designer dengan pagination dan jumlah portofolio
router.get('/designer-list', userController.handleDesignerList);

// Detail designer by UID
router.get('/designerdetails', userController.handleDesignerDetails);

// endpoint jadi: http://localhost:3000/register
router.post('/register', upload('ppict'), userController.handleRegister);

// Endpoint: http://localhost:3000/login
router.post('/login', userController.handleLogin);

// Endpoint: http://localhost:3000/refresh-token
router.post('/refresh-token', userController.handleRefreshToken);

// Endpoint terproteksi (perlu autentikasi)

// Endpoint: http://localhost:3000/profile
// Untuk mendapatkan profil pengguna yang sedang login
router.get('/profile', auth.verifyToken, userController.getUserProfile);

// Endpoint: http://localhost:3000/profile-picture
// Untuk mendapatkan foto profil saja (ppict) user yang sedang login
router.get('/profile-picture', auth.verifyToken, userController.getProfilePictureOnly);

// Endpoint: http://localhost:3000/profile
// Untuk mengupdate profil pengguna yang sedang login
router.put('/profile', auth.verifyToken, upload('ppict'), userController.updateUserProfile);

// Endpoint: http://localhost:3000/user/profile-image
// Untuk update foto profil saja (bisa dipakai di edit profil & PictureCut)
router.post('/user/profile-image', auth.verifyToken, upload('ppict'), userController.updateProfileImage);

// Endpoint: http://localhost:3000/change-password
// Untuk mengubah password pengguna yang sedang login
router.post('/change-password', auth.verifyToken, userController.changePassword);

// Endpoint: http://localhost:3000/logout
// Untuk logout (invalidasi refresh token)
router.post('/logout', auth.verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return next(createError(400, 'Refresh token diperlukan'));
    }

    await userService.logoutLogic(userId, refreshToken);
    return httpCreate.success(res, 200, 'Logout berhasil');
  } catch (error) {
    return next(createError(400, error.message || 'Gagal logout'));
  }
});

// Self delete (user sendiri, pending 7 hari)
router.delete('/profile', auth.verifyToken, userController.handleSelfDelete);
// Admin delete user langsung soft delete
router.delete('/mod/user/:uid', auth.verifyToken, auth.verifyAdmin, userController.handleAdminDelete);
// Admin undelete user
router.patch('/mod/user/:uid/undelete', auth.verifyToken, auth.verifyAdmin, userController.handleAdminUndelete);


module.exports = router;
