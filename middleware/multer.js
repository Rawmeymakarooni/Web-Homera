/**
 * Multer configuration for file upload
 * Enhanced security and validation
 * Vercel-compatible: Uses memoryStorage in production with Cloudinary integration
 */
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const createError = require('http-errors');
const { logger } = require('./logger');

// Deteksi environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.DISABLE_FS_OPERATIONS === 'true';

// Import Cloudinary service jika di production
let cloudinaryService = null;
if (isProduction) {
  try {
    cloudinaryService = require('../services/cloudinaryService');
    logger.info('Cloudinary service loaded for file uploads in production');
  } catch (error) {
    logger.warn('Cloudinary service not available:', error.message);
  }
}

// Import fs jika tidak di production
let fs = null;
if (!isProduction) {
  try {
    fs = require('fs');
  } catch (error) {
    logger.error('Error importing fs module:', error);
  }
}

// Helper function untuk membuat directory jika diperlukan
function ensureDirExists(dirPath) {
  if (!isProduction && fs) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Directory created: ${dirPath}`);
      }
    } catch (error) {
      logger.error(`Error creating directory ${dirPath}:`, error);
    }
  } else {
    logger.debug(`Directory creation skipped, running in production or fs not available: ${dirPath}`);
  }
}

// Fungsi untuk generate nama file unik
function generateFilename(originalname, prefix = '') {
  const timestamp = Date.now();
  const fileHash = crypto.randomBytes(8).toString('hex');
  const sanitizedName = path.parse(originalname).name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 50);
  const ext = path.extname(originalname).toLowerCase();
  return `${prefix}${sanitizedName}-${timestamp}-${fileHash}${ext}`;
}

// Konfigurasi storage berdasarkan environment dan tipe file
let profilStorage, portofolioStorage, furnitureStorage;

// Di production environment, gunakan Cloudinary
if (isProduction && cloudinaryService) {
  try {
    profilStorage = cloudinaryService.getCloudinaryStorage('homera/profil');
    portofolioStorage = cloudinaryService.getCloudinaryStorage('homera/portofolio');
    furnitureStorage = cloudinaryService.getCloudinaryStorage('homera/furnitur');
    logger.info('Cloudinary storage configured for all file types');
  } catch (error) {
    logger.error('Error configuring Cloudinary storage:', error);
    // Fallback ke memory storage
    profilStorage = multer.memoryStorage();
    portofolioStorage = multer.memoryStorage();
    furnitureStorage = multer.memoryStorage();
  }
} 
// Fallback ke memory storage jika Cloudinary tidak tersedia di production
else if (isProduction) {
  logger.warn('Cloudinary not available in production, using memory storage');
  profilStorage = multer.memoryStorage();
  portofolioStorage = multer.memoryStorage();
  furnitureStorage = multer.memoryStorage();
} 
// Di development environment, gunakan disk storage
else {
  logger.info('Development environment: Using disk storage for file uploads');
  
  // Buat directory penyimpanan
  const baseUploadDir = path.resolve(process.cwd(), 'prisma');
  ensureDirExists(path.join(baseUploadDir, 'profil'));
  ensureDirExists(path.join(baseUploadDir, 'portofolio'));
  ensureDirExists(path.join(baseUploadDir, 'furnitur'));
  
  // Storage untuk profil
  profilStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadPath = path.join(baseUploadDir, 'profil');
      cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
      cb(null, generateFilename(file.originalname, 'profil-'));
    }
  });
  
  // Storage untuk portofolio
  portofolioStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadPath = path.join(baseUploadDir, 'portofolio');
      cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
      cb(null, generateFilename(file.originalname, 'porto-'));
    }
  });
  
  // Storage untuk furnitur
  furnitureStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadPath = path.join(baseUploadDir, 'furnitur');
      cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
      cb(null, generateFilename(file.originalname, 'furnitur-'));
    }
  });
}

/**
 * Filter file yang diupload
 * Hanya izinkan file gambar dengan tipe tertentu
 */
const fileFilter = function(req, file, cb) {
  // List tipe MIME yang diizinkan
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // List ekstensi file yang diizinkan
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  // Validasi tipe MIME
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new createError(415, `Tipe file tidak diizinkan. Hanya ${allowedMimes.join(', ')} yang diizinkan.`), false);
  }
  
  // Validasi ekstensi file
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return cb(new createError(415, `Ekstensi file tidak diizinkan. Hanya ${allowedExts.join(', ')} yang diizinkan.`), false);
  }
  
  // File terlihat valid
  cb(null, true);
};

// Limits untuk semua upload
const limits = {
  fileSize: 5 * 1024 * 1024, // 5 MB
  files: 5 // Maks 5 file
};

// Memilih storage berdasarkan tipe upload
function getStorageForType(type) {
  switch (type) {
    case 'profil':
      return profilStorage;
    case 'portofolio':
      return portofolioStorage;
    case 'furnitur':
      return furnitureStorage;
    default:
      // Default ke profil storage
      return profilStorage;
  }
}

// Create multer instances untuk berbagai jenis upload
const profileUpload = multer({
  storage: profilStorage,
  fileFilter: fileFilter,
  limits: limits
});

const portfolioUpload = multer({
  storage: portofolioStorage,
  fileFilter: fileFilter,
  limits: limits
});

const furnitureUpload = multer({
  storage: furnitureStorage,
  fileFilter: fileFilter,
  limits: limits
});

// Mendapatkan tipe file dari request
function getFileTypeFromRequest(req) {
  // Tentukan tipe file dari path request atau field name
  if (req.path.includes('portofolio') || (req.body && req.body.type === 'portofolio')) {
    return 'portofolio';
  } else if (req.path.includes('furnitur') || req.path.includes('furniture') || 
             (req.body && (req.body.type === 'furnitur' || req.body.type === 'furniture'))) {
    return 'furnitur';
  }
  // Default ke profil
  return 'profil';
}

// Middleware dinamis yang memilih uploader berdasarkan tipe file
function dynamicUpload(fieldName, isMultiple = false) {
  return function(req, res, next) {
    const type = getFileTypeFromRequest(req);
    let uploadMiddleware;
    
    switch (type) {
      case 'portofolio':
        uploadMiddleware = isMultiple ? 
          portfolioUpload.array(fieldName) : 
          portfolioUpload.single(fieldName);
        break;
      case 'furnitur':
        uploadMiddleware = isMultiple ? 
          furnitureUpload.array(fieldName) : 
          furnitureUpload.single(fieldName);
        break;
      default:
        uploadMiddleware = isMultiple ? 
          profileUpload.array(fieldName) : 
          profileUpload.single(fieldName);
    }
    
    uploadMiddleware(req, res, function(err) {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  };
}

// Handler untuk error multer
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File terlalu besar. Maksimal 5 MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Unknown error during file upload' });
  }
  next();
}

/**
 * Middleware untuk memproses file setelah diupload oleh multer
 * Di production: Jika menggunakan memory storage, upload ke Cloudinary
 * @param {string} fieldName - Field name untuk file upload
 * @returns {Function} - Express middleware
 */
function processUploadedFile(fieldName) {
  return async function(req, res, next) {
    try {
      // Skip jika tidak ada file yang diupload
      if (!req.file) return next();
      
      // Di production dengan memory storage, upload file ke Cloudinary
      if (isProduction && req.file.buffer && cloudinaryService) {
        const fileType = getFileTypeFromRequest(req);
        const result = await cloudinaryService.uploadToCloudinary(req.file, fileType);
        
        if (result) {
          // Update req.file dengan info hasil upload
          req.file.cloudinaryId = result.publicId;
          req.file.url = result.url;
          req.file.filename = path.basename(result.url);
          logger.info(`File uploaded to Cloudinary: ${result.url}`);
        }
      }
      
      next();
    } catch (error) {
      logger.error('Error processing uploaded file:', error);
      next(error);
    }
  };
}

/**
 * Middleware untuk memproses multiple files setelah diupload oleh multer
 * @param {string} fieldName - Field name untuk file upload
 * @returns {Function} - Express middleware
 */
function processUploadedFiles(fieldName) {
  return async function(req, res, next) {
    try {
      // Skip jika tidak ada file yang diupload
      if (!req.files || !req.files.length) return next();
      
      // Di production dengan memory storage, upload files ke Cloudinary
      if (isProduction && cloudinaryService) {
        const fileType = getFileTypeFromRequest(req);
        const uploadPromises = req.files.map(async (file) => {
          if (file.buffer) {
            const result = await cloudinaryService.uploadToCloudinary(file, fileType);
            if (result) {
              file.cloudinaryId = result.publicId;
              file.url = result.url;
              file.filename = path.basename(result.url);
            }
            return file;
          }
          return file;
        });
        
        // Tunggu semua upload selesai
        await Promise.all(uploadPromises);
      }
      
      next();
    } catch (error) {
      logger.error('Error processing multiple uploaded files:', error);
      next(error);
    }
  };
}

module.exports = {
  // Expose multer instances untuk berbagai jenis upload
  profileUpload,
  portfolioUpload,
  furnitureUpload,
  
  // Expose dynamic uploader
  upload: dynamicUpload,
  
  // Helper functions
  handleMulterError,
  processUploadedFile,
  processUploadedFiles,
  getFileTypeFromRequest
};
