/**
 * API HOMERA - Main Application Entry Point
 * Express server dengan middleware keamanan dan best practices
 * (Dipindahkan ke /api agar kompatibel dengan Vercel)
 */

// Semua path relatif perlu diubah satu tingkat ke atas
const path = require('path');

try {
  // Patch __dirname agar tetap menunjuk ke root Backend
  const appRoot = path.join(__dirname, '..');
  process.chdir(appRoot);

  // Setelah patch, require file utama
  module.exports = require(path.join(appRoot, 'index.js'));
} catch (error) {
  console.error('Error loading backend application:', error);
  
  // Fallback minimal API jika terjadi error fatal
  const express = require('express');
  const app = express();
  
  app.get('*', (req, res) => {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Backend initialization failed. Please check server logs.',
      path: req.path
    });
  });
  
  module.exports = app;
}
