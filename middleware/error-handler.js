/**
 * Global error handler untuk aplikasi
 * Memastikan semua error dikembalikan dalam format JSON yang konsisten
 * Ditambahkan penanganan khusus untuk error 405 Method Not Allowed
 */
const { logger } = require('./logger');

const errorHandler = (err, req, res, next) => {
  // Log error untuk debugging
  logger.error(`Error ${err.statusCode || 500}: ${err.message}`, {
    path: req.path,
    method: req.method,
    error: err.stack
  });
  
  // Variabel statusCode dihapus karena didefinisikan ulang di bawah
  let message = err.message || 'Internal Server Error';
  let userFriendlyMessage = message;

  // Mengubah pesan teknis menjadi pesan yang lebih ramah pengguna
  if (statusCode === 400) {
    userFriendlyMessage = 'Permintaan tidak valid. Mohon periksa data yang Anda masukkan.';
  } else if (statusCode === 401) {
    userFriendlyMessage = 'Anda tidak memiliki akses. Silakan login terlebih dahulu.';
  } else if (statusCode === 403) {
    userFriendlyMessage = 'Anda tidak memiliki izin untuk mengakses fitur ini.';
  } else if (statusCode === 404) {
    userFriendlyMessage = 'Data atau halaman yang Anda cari tidak ditemukan.';
  } else if (statusCode === 405) {
  }
  
  // Fungsi helper untuk memastikan response JSON valid
  const sendJsonResponse = (statusCode, data) => {
    try {
      // Set header content-type secara eksplisit
      res.setHeader('Content-Type', 'application/json');
      
      // Pastikan data adalah object
      const responseData = typeof data === 'object' ? data : { message: String(data) };
      
      // Tambahkan success flag jika belum ada
      if (responseData.success === undefined) {
        responseData.success = statusCode < 400;
      }
      
      // Kirim response
      return res.status(statusCode).json(responseData);
    } catch (responseError) {
      console.error('Error sending JSON response:', responseError);
      // Fallback jika terjadi error saat mengirim response
      return res.status(500).send(JSON.stringify({ 
        success: false, 
        message: 'Error processing response' 
      }));
    }
  };
  
  // Menangani berbagai jenis error
  
  // 1. Validation errors (400)
  if (err.name === 'ValidationError' || err.type === 'validation') {
    return sendJsonResponse(400, {
      success: false,
      message: err.message || 'Validation error',
      errors: err.errors || undefined
    });
  }
  
  // 2. Authentication errors (401)
  if (err.name === 'UnauthorizedError' || err.name === 'AuthenticationError') {
    return sendJsonResponse(401, {
      success: false,
      message: err.message || 'Authentication required'
    });
  }
  
  // 3. Permission errors (403)
  if (err.name === 'ForbiddenError' || err.statusCode === 403) {
    return sendJsonResponse(403, {
      success: false,
      message: err.message || 'Permission denied'
    });
  }
  
  // 4. Not Found errors (404)
  if (err.status === 404 || err.statusCode === 404 || err.name === 'NotFoundError') {
    return sendJsonResponse(404, {
      success: false,
      message: err.message || 'Resource not found'
    });
  }
  
  // 5. Method Not Allowed errors (405)
  if (err.status === 405 || err.statusCode === 405) {
    return sendJsonResponse(405, {
      success: false,
      message: err.message || 'Method not allowed for this endpoint'
    });
  }
  
  // 6. Conflict errors (409)
  if (err.name === 'ConflictError' || err.statusCode === 409) {
    return sendJsonResponse(409, {
      success: false,
      message: err.message || 'Resource conflict'
    });
  }
  
  // 7. Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    console.error('Prisma error code:', err.code);
    // Handle specific Prisma errors
    if (err.code === 'P2002') { // Unique constraint violation
      return sendJsonResponse(409, {
        success: false,
        message: 'Data already exists with this unique identifier'
      });
    }
    if (err.code === 'P2025') { // Record not found
      return sendJsonResponse(404, {
        success: false,
        message: 'Record not found'
      });
    }
  }
  
  // 8. Default error handler (500)
  const statusCode = err.statusCode || err.status || 500;
  
  return sendJsonResponse(statusCode, {
    success: false,
    message: err.message || 'Internal server error',
    // Hanya tampilkan stack trace di development
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
