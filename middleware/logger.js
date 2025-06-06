/**
 * Middleware logging untuk aplikasi
 * Menggunakan winston untuk logging yang lebih baik
 */
const winston = require('winston');
const morgan = require('morgan');
const path = require('path');
const config = require('../config');

// Konfigurasi format winston
const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'homera-api' },
  transports: [
    // Log error dan warning ke console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Tambahkan file transports hanya jika bukan di production/Vercel
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.File({ 
    filename: path.join(__dirname, '../logs/error.log'), 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: path.join(__dirname, '../logs/combined.log') 
  }));
}

// PENTING: Tidak ada operasi file system di Vercel
// Kode untuk membuat direktori logs dihapus untuk kompatibilitas Vercel

// Custom morgan format yang terintegrasi dengan winston
const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  }
);

// Custom error logger middleware
const errorLogger = (err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  next(err);
};

// Custom request logger middleware
const requestLogger = (req, res, next) => {
  // Hindari mengakses req.query langsung karena bisa menyebabkan error di Node.js terbaru
  logger.debug({
    path: req.path,
    method: req.method,
    // Jangan akses req.query langsung
    // query: req.query,
    ip: req.ip,
    user: req.user ? { uid: req.user.uid, status: req.user.status } : 'guest'
  });
  next();
};

module.exports = {
  logger,
  morganMiddleware,
  errorLogger,
  requestLogger
};
