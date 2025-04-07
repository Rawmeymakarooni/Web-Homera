const AuthService = require('../services/authService');

const AuthController = {
  register: async (req, res) => {
    try {
      const { name, password, gender } = req.body;
      const profilePicPath = req.file?.filename || null;

      const user = await AuthService.register(name, password, gender, profilePicPath);
      res.status(201).json({ message: 'Akun berhasil dibuat', user });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { name, password } = req.body;
      const user = await AuthService.login(name, password);
      res.json({ message: 'Login berhasil', user });
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }
};

module.exports = AuthController;
