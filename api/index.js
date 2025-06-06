/**
 * API HOMERA - Main Application Entry Point
 * Express server dengan middleware keamanan dan best practices
 * (Dipindahkan ke /api agar kompatibel dengan Vercel)
 */

// Deteksi environment production (Vercel)
if (process.env.NODE_ENV === 'production') {
  // Disable file system operations yang tidak didukung Vercel
  process.env.DISABLE_FS_OPERATIONS = 'true';
  console.log('Running in production mode (Vercel). File system operations disabled.');
}

// Semua path relatif perlu diubah satu tingkat ke atas
const path = require('path');

try {
  // Ubah working directory ke root project
  process.chdir(path.join(__dirname, '..'));
  
  // Setelah patch, require file utama
  // PERBAIKAN: Gunakan path relatif yang benar ke file index.js di root folder
  const app = require('../index.js');
  
  // Export untuk Vercel
  module.exports = app;
} catch (error) {
  console.error('Error loading backend application:', error);
  
  // Fallback minimal API jika gagal load app utama
  const express = require('express');
  const app = express();
  
  app.all('*', (req, res) => {
    res.status(500).json({
      error: 'Backend initialization failed',
      message: error.message,
      stack: error.stack
    });
  });
  
  module.exports = app;
}
