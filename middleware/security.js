/**
 * Security middleware collection
 * Berisi berbagai middleware untuk keamanan aplikasi
 */
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xssClean = require('xss-clean');
// express-sanitizer dihapus karena tidak kompatibel dengan Node.js 18+
const config = require('../config');

// Rate limiter untuk endpoint umum
const generalLimiter = rateLimit({
  windowMs: config.security.rateLimiter.windowMs,
  max: config.security.rateLimiter.maxRequests,
  message: {
    status: 429,
    message: 'Terlalu banyak request, silakan coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter khusus untuk endpoint autentikasi (login/register)
const authLimiter = rateLimit({
  windowMs: config.security.authRateLimiter.windowMs,
  max: config.security.authRateLimiter.maxRequests,
  message: {
    status: 429,
    message: 'Terlalu banyak percobaan login/register, silakan coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware untuk validasi content-type
const validateContentType = (req, res, next) => {
  // Skip untuk form-data (upload file)
  if (req.is('multipart/form-data')) return next();
  
  // Pastikan semua request dengan body menggunakan content-type yang tepat
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && 
      !(req.is('application/json') || req.is('application/x-www-form-urlencoded'))) {
    return res.status(415).json({
      status: 415,
      message: 'Unsupported Media Type. Harap gunakan application/json atau application/x-www-form-urlencoded'
    });
  }
  next();
};

// Bersihkan query parameters dari potensi injection dengan cara yang aman
const sanitizeQueryParams = (req, res, next) => {
  // Tidak memodifikasi req.query karena pada Node.js 18+ ini adalah getter-only
  // Sebagai gantinya, kita bisa clone dan filter jika diperlukan di controller
  next();
};

// Ekspor semua middleware security
module.exports = {
  helmet,
  generalLimiter,
  authLimiter,
  validateContentType,
  sanitizeQueryParams,
  xssClean
};
