/**
 * Config centralized untuk aplikasi
 * Mengelola environment variables dengan fallback yang aman
 */
require('dotenv').config();

const config = {
  // Basic app config
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  
  // JWT config
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '10h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
  },
  
  // Upload limits
  upload: {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  
  // Security settings
  security: {
    bcryptRounds: 12,
    rateLimiter: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100 // limit each IP to 100 requests per windowMs
    },
    authRateLimiter: {
      windowMs: 2 * 60 * 1000, // 2 minutes
      maxRequests: 50 // limit each IP to 50 auth requests per windowMs (dev longgar)
    }
  }
};

// Critical check for JWT secret
if (!config.jwt.secret) {
  console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: JWT_SECRET tidak ditemukan di environment variables');
  console.error('\x1b[33m%s\x1b[0m', 'Aplikasi tidak dapat berjalan dengan aman. Harap set JWT_SECRET di file .env');
  process.exit(1);
}

module.exports = config;
