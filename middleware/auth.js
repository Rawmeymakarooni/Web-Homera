const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const config = require('../config');
const { logger } = require('./logger');

/**
 * Middleware untuk autentikasi dan otorisasi
 */
const auth = {
  /**
   * Middleware untuk verifikasi token
   * Mendukung token dari header Authorization atau cookie
   */
  verifyToken: (req, res, next) => {
    try {
      // Ambil token dari header Authorization atau cookie
      let token;
      const authHeader = req.headers['authorization'];
      
      if (authHeader) {
        // Format header: "Bearer [token]"
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        } else {
          return next(createError(401, 'Format Authorization header tidak valid'));
        }
      } else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
      }
      
      if (!token) {
        return next(createError(401, 'Akses ditolak. Token tidak disediakan'));
      }

      // Verifikasi token
      jwt.verify(token, config.jwt.secret, (err, decoded) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            return next(createError(401, 'Token telah kedaluwarsa'));
          }
          logger.warn(`Token invalid: ${err.message}`);
          return next(createError(401, 'Token tidak valid'));
        }
        
        // Simpan data user ke req.user
        req.user = decoded;
        return next();
      });
    } catch (error) {
      logger.error(`Error verifikasi token: ${error.message}`);
      return next(createError(500, 'Gagal memverifikasi token'));
    }
  },

  /**
   * Middleware untuk memeriksa role admin
   */
  verifyAdmin: (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Autentikasi diperlukan'));
    }
    
    if (req.user.status && req.user.status.toLowerCase() === 'admin') {
      return next();
    }
    
    logger.warn(`Percobaan akses admin ditolak: ${req.user.uid} (${req.user.status}) - ${req.method} ${req.originalUrl}`);
    return next(createError(403, 'Akses ditolak. Anda bukan admin'));
  },
  
  /**
   * Middleware untuk memeriksa user poster
   */
  verifyPoster: (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Autentikasi diperlukan'));
    }
    
    const userStatus = req.user.status ? req.user.status.toLowerCase() : '';
    if (userStatus === 'post' || userStatus === 'admin') {
      return next();
    }
    
    return next(createError(403, 'Akses ditolak. Anda bukan Poster atau Admin'));
  },
  
  /**
   * Middleware untuk validasi kepemilikan resource
   * @param {Function} fetchResource - Function untuk fetch resource dari database
   * @param {String} resourceIdParam - Nama parameter URL yang berisi resource ID
   * @param {String} uidField - Nama field UID di resource (default: uid)
   */
  verifyOwnership: (fetchResource, resourceIdParam = 'id', uidField = 'uid') => {
    return async (req, res, next) => {
      try {
        // Pastikan user terautentikasi
        if (!req.user || !req.user.uid) {
          return next(createError(401, 'Autentikasi diperlukan'));
        }
        
        // Admin bisa mengakses semua resource
        if (req.user.status && req.user.status.toLowerCase() === 'admin') {
          return next();
        }
        
        // Ambil ID resource dari parameter
        const resourceId = req.params[resourceIdParam];
        if (!resourceId) {
          return next(createError(400, `Parameter '${resourceIdParam}' tidak ditemukan`));
        }
        
        // Ambil resource dari database
        const resource = await fetchResource(resourceId);
        if (!resource) {
          return next(createError(404, 'Resource tidak ditemukan'));
        }
        
        // Periksa kepemilikan
        if (resource[uidField] !== req.user.uid) {
          logger.warn(`Akses resource ditolak: User ${req.user.uid} mencoba akses resource ${resourceIdParam}=${resourceId} milik ${resource[uidField]}`);
          return next(createError(403, 'Anda tidak memiliki akses ke resource ini'));
        }
        
        // Simpan resource di req untuk penggunaan di controller
        req.resource = resource;
        return next();
      } catch (error) {
        logger.error(`Error verifikasi kepemilikan: ${error.message}`);
        return next(createError(500, 'Gagal memverifikasi kepemilikan resource'));
      }
    };
  }
};

module.exports = auth;
