/**
 * API HOMERA - Main Application Entry Point
 * Express server dengan middleware keamanan dan best practices
 */

// Import dependencies
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const createError = require('http-errors');
const xssClean = require('xss-clean');

const fs = require('fs');

// Import konfigurasi
require('dotenv').config();
const config = require('./config');

// Import middleware custom
const { logger, morganMiddleware, errorLogger, requestLogger } = require('./middleware/logger');
const security = require('./middleware/security');
const errorHandler = require('./middleware/error-handler');
const { handleMulterError } = require('./middleware/multer');

// Create express app
const app = express();
app.set('trust proxy', 1); // Agar express-rate-limit bisa membaca X-Forwarded-For

// PENTING: Tidak ada operasi file system di Vercel
// Kode untuk membuat direktori logs dihapus untuk kompatibilitas Vercel

// Log ketika aplikasi mulai
logger.info(`Homera API starting in ${config.nodeEnv} mode`);

// ===== MIDDLEWARE UMUM =====
// Security middleware
app.use(security.helmet());
app.use(xssClean());
app.disable('x-powered-by');

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Tidak menggunakan express-sanitizer karena tidak kompatibel dengan Node.js 18+

app.use(security.validateContentType);

// Middleware lainnya
app.use(cookieParser());
app.use(compression());
app.use(morganMiddleware);

// Import konfigurasi CORS yang lebih robust
const { corsOptions } = require('./middleware/cors-config');

// Log konfigurasi CORS
logger.info(`CORS configuration loaded for environment: ${process.env.NODE_ENV || 'development'}`);
if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
  logger.info('Using production CORS settings with permissive fallback for Vercel');
} else {
  logger.info('Using development CORS settings');
}

// Log CORS configuration
logger.info(`CORS configured with ${process.env.NODE_ENV === 'production' ? 'all origins allowed' : 'specific origins only'}`);

// Apply CORS middleware
app.use(cors(corsOptions));

// Handler untuk favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content response untuk favicon
});

// Root endpoint dengan welcome page yang informatif
app.get('/', (req, res, next) => {
  try {
    // Tampilkan HTML yang lebih informatif seperti referensi teman
    res.set('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Homera API</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
          h1 { color: #0070f3; }
          pre { background: #f6f8fa; padding: 1rem; border-radius: 5px; overflow-x: auto; }
          code { font-family: monospace; }
          .container { margin-top: 2rem; }
          .endpoints { margin-top: 2rem; }
          .endpoint { margin-bottom: 1rem; padding: 1rem; border: 1px solid #eaeaea; border-radius: 5px; }
          .status { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 3px; background: #0070f3; color: white; }
        </style>
      </head>
      <body>
        <h1>🏠 Homera API is running!</h1>
        <p>Welcome to Homera's backend service!</p>
        
        <div class="status">Status: ONLINE</div>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p>Server Time: ${new Date().toLocaleString()}</p>
        
        <div class="container">
          <h2>API Documentation</h2>
          <p>Below are some example endpoints to get started:</p>
          
          <div class="endpoints">
            <div class="endpoint">
              <h3>Home Portofolios</h3>
              <pre><code>GET ${req.protocol}://${req.get('host')}/home-portos</code></pre>
              <p>Returns random featured portofolios for the home page</p>
            </div>
            
            <div class="endpoint">
              <h3>Designer List</h3>
              <pre><code>GET ${req.protocol}://${req.get('host')}/designer-list?page=1&limit=8</code></pre>
              <p>Returns a paginated list of designers</p>
            </div>
            
            <div class="endpoint">
              <h3>API Health Check</h3>
              <pre><code>GET ${req.protocol}://${req.get('host')}/health</code></pre>
              <p>Check API health and version information</p>
            </div>
          </div>
          
          <p>For more information, please refer to the <a href="https://github.com/yourusername/homera" target="_blank">project documentation</a>.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error in root endpoint:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process request'
    });
  }
});

// Health check endpoint untuk status API
app.get('/health', (req, res, next) => {
  try {
    // Avoid requiring package.json as it might not be available in production
    const version = '1.0.0';
    return res.status(200).json({ 
      status: 'healthy',
      version: version,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    logger.error('Error in health endpoint:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check health'
    });
  }
});

// Test endpoint untuk verifikasi koneksi API yang lebih sederhana
app.get('/api-test', (req, res, next) => {
  try {
    return res.status(200).json({ message: 'API connection successful', timestamp: new Date().toISOString() });
  } catch (error) {
    return next(error);
  }
});

// ===== ROUTES STATIC =====
// Akses file-file statis dengan CORS headers
const setStaticFileHeaders = (res, path) => {
  // Izinkan akses cross-origin untuk file statis
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
};

// Detect environment: Vercel production vs local development
const isProduction = process.env.NODE_ENV === 'production' || process.env.DISABLE_FS_OPERATIONS === 'true';

if (isProduction) {
  // PENTING: Di Vercel production environment, kita tidak bisa mengakses file system
  // Oleh karena itu, kita akan menggunakan Cloudinary untuk menyimpan dan mengakses file
  logger.info('Production environment detected: Setting up Cloudinary image endpoints');
  
  // Cek apakah Cloudinary service tersedia
  let cloudinaryEnabled = false;
  try {
    const cloudinaryService = process.env.CLOUDINARY_CLOUD_NAME ? require('./services/cloudinaryService') : null;
    cloudinaryEnabled = !!cloudinaryService;
    if (cloudinaryEnabled) {
      logger.info('Cloudinary service detected and enabled');
    }
  } catch (error) {
    logger.error('Error checking Cloudinary service:', error.message);
  }
  
  // Helper untuk redirect ke URL yang benar
  // URL bisa dari Cloudinary atau fallback ke placeholder
  const redirectToImage = (res, type, filename) => {
    // Set CORS dan cache headers untuk semua image requests
    res.set({
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, max-age=86400'
    });
    
    // Jika filename sudah merupakan URL lengkap (dari Cloudinary)
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      logger.debug(`Redirecting to full URL: ${filename}`);
      return res.redirect(filename);
    }
    
    // Coba ekstrak Cloudinary ID dari filename jika tersedia
    // Format: nama-file_cloudinary_res.cloudinary.com/cloudname/image/upload/v123456/path/to/file.jpg
    const cloudinaryMatch = filename.match(/cloudinary_([^_]+)/i);
    if (cloudinaryEnabled && cloudinaryMatch && cloudinaryMatch[1]) {
      // Decode URL yang diembed dalam filename
      try {
        const decodedUrl = decodeURIComponent(cloudinaryMatch[1]);
        logger.debug(`Redirecting to Cloudinary URL: ${decodedUrl}`);
        return res.redirect(decodedUrl);
      } catch (error) {
        logger.error('Error decoding Cloudinary URL from filename:', error);
        // Fallback ke placeholder jika ada error
      }
    }
    
    // Jika tidak ada URL Cloudinary yang valid, gunakan placeholder
    useImagePlaceholder(res, type);
  };
  
  // Fungsi untuk menggunakan placeholder image berdasarkan tipe
  function useImagePlaceholder(res, type) {
    // Default placeholders berdasarkan tipe file
    let placeholderUrl;
    
    switch (type) {
      case 'profil':
        placeholderUrl = 'https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fill,r_max/sample.jpg';
        break;
      case 'portofolio':
        placeholderUrl = 'https://res.cloudinary.com/demo/image/upload/w_800,h_600,c_fill/sample.jpg';
        break;
      case 'furnitur':
        placeholderUrl = 'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/sample.jpg';
        break;
      default:
        placeholderUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    }
    
    logger.debug(`Using placeholder image for ${type}: ${placeholderUrl}`);
    res.redirect(placeholderUrl);
  }
  
  // Image endpoint untuk profil
  app.get(['/profil/:filename', '/prisma/profil/:filename'], (req, res) => {
    redirectToImage(res, 'profil', req.params.filename);
  });
  
  // Image endpoint untuk portofolio
  app.get(['/portofolio/:filename', '/prisma/portofolio/:filename'], (req, res) => {
    redirectToImage(res, 'portofolio', req.params.filename);
  });
  
  // Image endpoint untuk furnitur
  app.get(['/furnitur/:filename', '/prisma/furnitur/:filename'], (req, res) => {
    redirectToImage(res, 'furnitur', req.params.filename);
  });
  
} else {
  // Local development: Gunakan static file serving seperti biasa
  logger.info('Development environment: Serving static files from disk');
  
  // Akses file profil dari /profil dan /prisma/profil (untuk kompatibilitas)
  app.use('/profil', express.static(path.join(__dirname, 'prisma', 'profil'), { setHeaders: setStaticFileHeaders }));
  app.use('/prisma/profil', express.static(path.join(__dirname, 'prisma', 'profil'), { setHeaders: setStaticFileHeaders }));
  
  // Akses file portofolio dan furnitur dengan CORS headers
  app.use('/portofolio', express.static(path.join(__dirname, 'prisma', 'portofolio'), { setHeaders: setStaticFileHeaders }));
  app.use('/furnitur', express.static(path.join(__dirname, 'prisma', 'furnitur'), { setHeaders: setStaticFileHeaders }));
}

// Tambahkan akses ke file statis untuk frontend
app.use(express.static(path.join(__dirname, 'public')));
// Jika ada folder images khusus
app.use('/images', express.static(path.join(__dirname, 'images')));
// Jika ada folder assets khusus
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ===== API ROUTES =====
// Rate limiter untuk endpoint autentikasi
app.use(['/login', '/register', '/refresh-token'], security.authLimiter);

// Rate limiter umum untuk endpoint API lainnya
app.use('/api', security.generalLimiter);

// Include semua routes
const userRoute = require('./routes/userroute');
const authGoogleRoute = require('./routes/authgoogleroute');
const requestStatusRoute = require('./routes/requeststatusroute');
const portofolioRoute = require('./routes/portofolioroute');
const imageRoute = require('./routes/imageRoute');
const portofolioController = require('./controller/portofoliocontrol');

// Global endpoints tanpa prefix '/portofolio'
app.get('/porto', portofolioController.getAllPortofolios);
app.get('/porto/:porto_id', portofolioController.getPortofolioDetail);
app.get('/porto/category/:category', portofolioController.getPortofoliosByCategory);
app.get('/porto/explore/:category', portofolioController.getExplorePortofolios);
app.get('/home-portos', portofolioController.getHomeRandomPortos);
const commentRoute = require('./routes/commentroute');
const userController = require('./controller/usercontrol');
const { upload } = require('./middleware/multer');

// Endpoint publik: GET 5 user random status Post dengan minimal 1 portofolio aktif
app.get('/api/randompost', userController.handleRandomPostUsersWithPortfolio);

// Pasang endpoint autentikasi langsung di root

app.post('/refresh-token', userController.handleRefreshToken);

// Tambahkan endpoint /api/register yang mengarahkan ke handler yang sama
app.post('/api/register', upload('ppict'), userController.handleRegister);

// Handle metode yang tidak diizinkan untuk endpoint /api/register
app.all('/api/register', (req, res, next) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Metode HTTP tidak diizinkan untuk endpoint ini. Gunakan metode POST.',
      error: 'Method Not Allowed',
      allowedMethods: ['POST']
    });
  }
  next(); // Lanjutkan ke handler berikutnya jika metode adalah POST
});

// Route lainnya tetap dengan prefix
// app.use('/user', userRoute); // Dihapus karena menyebabkan konflik routing
app.use('/', userRoute); // Cukup mount di root saja untuk endpoint /register, /login, dll
app.use('/user', authGoogleRoute);
app.use('/', requestStatusRoute);
app.use('/portofolio', portofolioRoute);
app.use('/comment', commentRoute);
app.use('/api/images', imageRoute); // Route untuk mengakses gambar

// ===== ERROR HANDLING =====
// Handle multer error
app.use(handleMulterError);

// Log semua error
app.use(errorLogger);

// Custom 404 middleware - memastikan mengembalikan JSON valid
app.use((req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  
  // Respons JSON untuk 404 Not Found
  return res.status(404).json({
    success: false,
    message: 'Data atau halaman yang Anda cari tidak ditemukan.',
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// ===== START SERVER =====
// Untuk development lokal
if (process.env.NODE_ENV !== 'production') {
  const PORT = config.port || 3000;
  app.listen(PORT, () => {
    logger.info(`🚀 Server berjalan di http://localhost:${PORT}`);
  });
}

// Tangkap unhandled rejection
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥', err);
  console.error('UNHANDLED REJECTION!', err);
});

// Export app untuk Vercel Serverless
module.exports = app;
