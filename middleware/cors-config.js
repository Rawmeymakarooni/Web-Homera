/**
 * Konfigurasi CORS yang lebih robust untuk Vercel
 * Memastikan frontend dapat mengakses backend dengan benar
 * Mendukung multiple origins dan fallback yang aman
 */

// Daftar origin yang diizinkan
const allowedOrigins = [
  // Frontend Vercel domains
  /\.vercel\.app$/,
  /^https:\/\/frontend-homera.*\.vercel\.app$/,
  /^https:\/\/homera.*\.vercel\.app$/,
  
  // Development origins
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  
  // Tambahkan domain production jika sudah ada
  // 'https://homera.com',
  // 'https://www.homera.com',
];

// Fungsi untuk memeriksa apakah origin diizinkan
const isOriginAllowed = (origin) => {
  if (!origin) return false;
  
  // Cek apakah origin cocok dengan salah satu pattern atau string yang diizinkan
  return allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return allowedOrigin === origin;
  });
};

// Konfigurasi CORS untuk Express
const corsOptions = {
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (seperti mobile apps atau curl)
    if (!origin) {
      console.log('CORS: Request tanpa origin diizinkan');
      return callback(null, true);
    }
    
    // Cek apakah origin diizinkan
    if (isOriginAllowed(origin)) {
      console.log(`CORS: Origin diizinkan: ${origin}`);
      return callback(null, true);
    }
    
    // Mode permisif untuk development dan Vercel preview
    if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview') {
      console.log(`CORS: Mode permisif - origin diizinkan: ${origin}`);
      return callback(null, true);
    }
    
    // Jika tidak diizinkan dan dalam mode production
    console.log(`CORS: Origin ditolak: ${origin}`);
    callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  credentials: true,
  maxAge: 86400, // 24 jam
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Konfigurasi CORS untuk Vercel.json
const vercelCorsHeaders = [
  { key: "Access-Control-Allow-Credentials", value: "true" },
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
  { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
];

module.exports = {
  corsOptions,
  vercelCorsHeaders,
  isOriginAllowed,
  allowedOrigins
};
