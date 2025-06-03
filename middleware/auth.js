const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const JWT_SECRET = process.env.JWT_SECRET || 'homera_secret';

const auth = {
  // Middleware untuk verifikasi token
  verifyToken: (req, res, next) => {
    try {
      // Ambil token dari header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return next(createError(401, 'Akses ditolak. Token tidak disediakan'));
      }

      // Format header: "Bearer [token]"
      const token = authHeader.split(' ')[1];
      if (!token) {
        return next(createError(401, 'Format token tidak valid'));
      }

      // Verifikasi token
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Simpan data user ke req.user
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(createError(401, 'Token telah kedaluwarsa'));
      }
      return next(createError(401, 'Token tidak valid'));
    }
  },

  // Middleware untuk memeriksa role admin (opsional)
  verifyAdmin: (req, res, next) => {
    if (req.user && req.user.status && req.user.status.toLowerCase() === 'admin') {
      return next();
    }
    return next(createError(403, 'Akses ditolak. Anda bukan admin'));
  }
};

module.exports = auth;
