/**
 * Global error handler untuk aplikasi
 * Memastikan semua error dikembalikan dalam format JSON yang konsisten
 * Menangani berbagai jenis error termasuk Prisma dan HTTP errors
 */
const { logger } = require('./logger');

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Jika headers sudah dikirim, lanjutkan ke default Express error handler
  if (res.headersSent) {
    logger.warn('Headers already sent, delegating to default Express error handler');
    return next(err);
  }

  // Log error untuk debugging
  logger.error(`Error handling: ${err.message}`, {
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || err.status,
    name: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Tentukan status code berdasarkan error
  const statusCode = err.statusCode || err.status || 500;
  
  // Fungsi helper untuk memastikan response JSON valid
  const sendJsonResponse = (code, data) => {
    try {
      // Set header content-type secara eksplisit
      res.setHeader('Content-Type', 'application/json');
      
      // Pastikan data adalah object
      const responseData = typeof data === 'object' ? data : { message: String(data) };
      
      // Tambahkan success flag jika belum ada
      if (responseData.success === undefined) {
        responseData.success = code < 400;
      }
      
      // Kirim response
      return res.status(code).json(responseData);
    } catch (responseError) {
      logger.error('Error sending JSON response:', responseError);
      // Fallback jika terjadi error saat mengirim response
      return res.status(500).send(JSON.stringify({ 
        success: false, 
        message: 'Error processing response' 
      }));
    }
  };
  
  // Tentukan pesan yang user-friendly berdasarkan status code
  let userFriendlyMessage;
  switch (statusCode) {
    case 400:
      userFriendlyMessage = 'Permintaan tidak valid. Mohon periksa data yang Anda masukkan.';
      break;
    case 401:
      userFriendlyMessage = 'Anda tidak memiliki akses. Silakan login terlebih dahulu.';
      break;
    case 403:
      userFriendlyMessage = 'Anda tidak memiliki izin untuk mengakses fitur ini.';
      break;
    case 404:
      userFriendlyMessage = 'Data atau halaman yang Anda cari tidak ditemukan.';
      break;
    case 405:
      userFriendlyMessage = 'Metode HTTP tidak diizinkan untuk endpoint ini.';
      break;
    case 409:
      userFriendlyMessage = 'Terjadi konflik dengan data yang sudah ada.';
      break;
    default:
      userFriendlyMessage = process.env.NODE_ENV === 'production' 
        ? 'Terjadi kesalahan pada server. Tim kami sedang menyelesaikannya.' 
        : err.message || 'Internal Server Error';
  }
  
  // Menangani berbagai jenis error
  
  // 1. Validation errors (400)
  if (err.name === 'ValidationError' || err.type === 'validation') {
    return sendJsonResponse(400, {
      success: false,
      message: userFriendlyMessage,
      error: 'Validation Error',
      details: err.errors || undefined
    });
  }
  
  // 2. Authentication errors (401)
  if (err.name === 'UnauthorizedError' || err.name === 'AuthenticationError' || 
      err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendJsonResponse(401, {
      success: false,
      message: userFriendlyMessage,
      error: 'Authentication Error'
    });
  }
  
  // 3. Permission errors (403)
  if (err.name === 'ForbiddenError' || statusCode === 403) {
    return sendJsonResponse(403, {
      success: false,
      message: userFriendlyMessage,
      error: 'Permission Denied'
    });
  }
  
  // 4. Not Found errors (404)
  if (statusCode === 404 || err.name === 'NotFoundError') {
    return sendJsonResponse(404, {
      success: false,
      message: userFriendlyMessage,
      error: 'Not Found',
      path: req.originalUrl
    });
  }
  
  // 5. Method Not Allowed errors (405)
  if (statusCode === 405) {
    return sendJsonResponse(405, {
      success: false,
      message: userFriendlyMessage,
      error: 'Method Not Allowed',
      allowedMethods: err.allowedMethods || ['GET', 'POST']
    });
  }
  
  // 6. Conflict errors (409)
  if (err.name === 'ConflictError' || statusCode === 409) {
    return sendJsonResponse(409, {
      success: false,
      message: userFriendlyMessage,
      error: 'Resource Conflict'
    });
  }
  
  // 7. Prisma errors
  if (err.name && err.name.startsWith('PrismaClient')) {
    logger.error('Prisma error:', { code: err.code, meta: err.meta });
    
    // Handle specific Prisma errors
    if (err.code === 'P2002') { // Unique constraint violation
      return sendJsonResponse(409, {
        success: false,
        message: 'Data dengan identifikasi yang sama sudah ada',
        error: 'Unique Constraint Violation',
        fields: err.meta?.target || []
      });
    }
    
    if (err.code === 'P2025') { // Record not found
      return sendJsonResponse(404, {
        success: false,
        message: 'Data yang dicari tidak ditemukan',
        error: 'Record Not Found'
      });
    }
    
    if (err.code === 'P2003') { // Foreign key constraint failed
      return sendJsonResponse(400, {
        success: false,
        message: 'Data referensi tidak valid',
        error: 'Foreign Key Constraint Failed'
      });
    }
    
    // Default Prisma error handler
    return sendJsonResponse(500, {
      success: false,
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Database Error'
    });
  }
  
  // 8. Default error handler (500)
  return sendJsonResponse(statusCode, {
    success: false,
    message: userFriendlyMessage,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
};

// Export middleware
module.exports = errorHandler;
