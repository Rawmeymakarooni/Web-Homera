const createError = require('http-errors');
const httpCreate = require('../middleware/httpCreate');
const userService= require('../services/userservice');

const userController = {
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
     console.log('Isi req.body:', req.body);
    try {
      const { uname, password } = req.body;
      const result = await userService.loginControllerLogic({ uname, password });

      return httpCreate.success(res, 200, 'Login berhasil', result);
    } catch (error) {
      return next(createError(401, error.message || 'Login gagal'));
    }
  },

};

module.exports = userController;
