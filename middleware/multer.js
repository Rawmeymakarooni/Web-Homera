/**
 * Multer configuration for file upload
 * Enhanced security and validation
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const createError = require('http-errors');
const config = require('../config');
const { logger } = require('./logger');

// Pastikan direktori upload ada
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
};

// Buat direktori penyimpanan jika belum ada
ensureDirExists('prisma/portofolio'); // Folder untuk cover portofolio
ensureDirExists('prisma/furnitur'); // Folder untuk foto furniture
ensureDirExists('prisma/profil'); // Folder untuk foto profil

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let destPath;
    
    if (file.fieldname === 'cover') {
      destPath = 'prisma/portofolio'; // Simpan cover portofolio di folder portofolio
    } else if (file.fieldname.startsWith('furniturImage_')) {
      destPath = 'prisma/furnitur'; // Simpan foto furniture di folder furnitur
    } else { // ppict, etc.
      destPath = 'prisma/profil';
    }
    
    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    // Buat nama file yang aman dengan sanitasi & penambahan hash
    const sanitizedOriginalName = path.parse(file.originalname).name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 50);
      
    // Tambahkan random hash ke nama file
    const fileHash = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    // Format: timestamp-hash-sanitizedname.ext
    const filename = `${timestamp}-${fileHash}-${sanitizedOriginalName}${fileExt}`;
    
    cb(null, filename);
  }
});

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
