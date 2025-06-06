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

// CORS dengan konfigurasi yang sangat permisif untuk development
// CORS dengan konfigurasi yang mendukung frontend di Vercel
app.use(cors({
  origin: function(origin, callback) {
    // Daftar origin yang diizinkan
    const allowedOrigins = [
      'http://localhost:5173',       // Vite development
      'http://localhost:3000',       // Local frontend
      'https://web-homera.vercel.app', // Frontend di Vercel
      'https://homera.vercel.app',    // Alternatif domain Vercel
      'https://frontend-homera-mdzs.vercel.app' // Domain frontend baru
    ];
    
    // Izinkan request tanpa origin (seperti dari Postman atau mobile app)
    if (!origin) return callback(null, true);
    
    // Periksa apakah origin ada dalam daftar yang diizinkan
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true
}));

// Root endpoint untuk verifikasi bahwa API berjalan
app.get('/', (req, res, next) => {
  try {
    return res.status(200).json({ 
      message: 'Homera API is running', 
      status: 'online',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return next(error);
  }
});

// Health check endpoint untuk status API
app.get('/health', (req, res, next) => {
  try {
    return res.status(200).json({ 
      status: 'healthy',
      version: require('./package.json').version || '1.0.0',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return next(error);
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

// Akses file profil dari /profil dan /prisma/profil (untuk kompatibilitas)
app.use('/profil', express.static(path.join(__dirname, 'prisma', 'profil'), { setHeaders: setStaticFileHeaders }));
app.use('/prisma/profil', express.static(path.join(__dirname, 'prisma', 'profil'), { setHeaders: setStaticFileHeaders }));

// Akses file portofolio dan furnitur dengan CORS headers
app.use('/portofolio', express.static(path.join(__dirname, 'prisma', 'portofolio'), { setHeaders: setStaticFileHeaders }));
app.use('/furnitur', express.static(path.join(__dirname, 'prisma', 'furnitur'), { setHeaders: setStaticFileHeaders }));

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

// Custom 404 middleware
app.use((req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  next(createError(404, 'Rute tidak ditemukan'));
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
