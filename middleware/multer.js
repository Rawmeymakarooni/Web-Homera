/**
 * Multer configuration for file upload
 * Enhanced security and validation
 * Vercel-compatible: Uses memoryStorage in production
 */
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const createError = require('http-errors');
const config = require('../config');
const { logger } = require('./logger');

// PENTING: Tidak ada operasi file system di sini untuk kompatibilitas Vercel
// Semua operasi file system (fs) dihapus untuk mencegah error di Vercel

// Gunakan memoryStorage untuk semua environment (termasuk development)
// Ini memastikan kode berjalan sama di Vercel maupun lokal
const storage = multer.memoryStorage();
logger.info('Using memory storage for file uploads');

// Fungsi untuk generate nama file (hanya untuk referensi di database)
const generateFilename = (originalname, prefix = '') => {
  const sanitizedName = path.parse(originalname).name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 50);
    
  const fileHash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const fileExt = path.extname(originalname).toLowerCase();
  
  return `${prefix}${sanitizedName}-${timestamp}-${fileHash}${fileExt}`;
};

/**
 * Filter file yang diupload
 * Hanya izinkan file gambar dengan tipe tertentu
 */
function fileFilter(req, file, cb) {
  // Validasi MIME type
  if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
    const errorMsg = `Tipe file '${file.mimetype}' tidak diizinkan. Hanya izinkan: ${config.upload.allowedMimeTypes.join(', ')}`;
    logger.warn(`File upload rejected: ${file.originalname} (${file.mimetype})`);
    return cb(createError(400, errorMsg), false);
  }
  
  // Validasi ekstensi file
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  if (!allowedExts.includes(ext)) {
    const errorMsg = `Ekstensi file '${ext}' tidak diizinkan. Hanya izinkan: ${allowedExts.join(', ')}`;
    logger.warn(`File upload rejected (extension): ${file.originalname} (${ext})`);
    return cb(createError(400, errorMsg), false);
  }
  
  // File valid
  cb(null, true);
}

// Middleware untuk Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: config.upload.maxFileSize // Dari config.js
  }
});

// Error handler untuk Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Error dari Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(createError(400, `File terlalu besar. Maksimal ${config.upload.maxFileSize / (1024 * 1024)} MB`));
    }
    return next(createError(400, `Error upload file: ${err.message}`));
  } else if (err) {
    // Error dari fileFilter atau lainnya
    return next(err);
  }
  next();
};

module.exports = {
  upload,
  handleMulterError
};
