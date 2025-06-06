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
  
  // Debugging struktur folder di Vercel
const fs = require('fs');
try {
  // Cek keberadaan folder dao
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  try {
    const files = fs.readdirSync(process.cwd());
    console.log('Files in root:', files);
    
    // Cek jika ada folder DAO atau dao
    if (files.includes('dao')) {
      console.log('dao folder exists (lowercase)');
      const daoFiles = fs.readdirSync(path.join(process.cwd(), 'dao'));
      console.log('Files in dao:', daoFiles);
    }
    if (files.includes('DAO')) {
      console.log('DAO folder exists (uppercase)');
      const daoFiles = fs.readdirSync(path.join(process.cwd(), 'DAO'));
      console.log('Files in DAO:', daoFiles);
    }
  } catch (err) {
    console.log('Error reading directory:', err);
  }
} catch (e) {
  console.log('Filesystem operations disabled, skipping directory check');
}

// Setelah patch, require file utama
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
