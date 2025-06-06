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
const logger = require('../utils/logger');

// Deteksi environment
const isProduction = process.env.NODE_ENV === 'production';

// PENTING: Konfigurasi berbeda untuk development dan production
let storage;

// Di production (Vercel), kita gunakan memoryStorage untuk hindari file system
if (process.env.NODE_ENV === 'production') {
  storage = multer.memoryStorage();
  logger.info('Production: Using memory storage for file uploads');
} else {
  // Di development, kita bisa gunakan diskStorage
  const fs = require('fs'); // Hanya import fs di development
  
  // Fungsi untuk memastikan direktori ada
  const ensureDirExists = (dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created directory: ${dirPath}`);
      }
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}: ${error.message}`);
      // Jangan throw error, biarkan proses lanjut
    }
  };
  
  // Buat direktori yang diperlukan di development
  try {
    ensureDirExists('prisma/portofolio');
    ensureDirExists('prisma/furnitur');
    ensureDirExists('prisma/profil');
  } catch (error) {
    logger.error(`Error creating directories: ${error.message}`);
  }
  
  // Setup disk storage untuk development
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      let destPath;
      if (file.fieldname === 'cover') {
        destPath = 'prisma/portofolio';
      } else if (file.fieldname.startsWith('furniturImage_')) {
        destPath = 'prisma/furnitur';
      } else { // ppict, etc.
        destPath = 'prisma/profil';
      }
      cb(null, destPath);
    },
    filename: function (req, file, cb) {
      const sanitizedName = path.parse(file.originalname).name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-_]/g, '')
        .slice(0, 50);
      const fileHash = crypto.randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const fileExt = path.extname(file.originalname).toLowerCase();
      cb(null, `${sanitizedName}-${timestamp}-${fileHash}${fileExt}`);
    }
  });
  logger.info('Development: Using disk storage for file uploads');
}

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
