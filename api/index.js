/**
 * API HOMERA - Main Application Entry Point
 * Express server dengan middleware keamanan dan best practices
 * (Dipindahkan ke /api agar kompatibel dengan Vercel)
 */

// Load environment variables
require('dotenv').config();

// Semua path relatif perlu diubah satu tingkat ke atas
const path = require('path');
let app = null;

// Log environment status untuk debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('__dirname:', __dirname);

// Deteksi environment production (Vercel)
if (process.env.NODE_ENV === 'production') {
  console.log('Running in production mode (Vercel)');
  console.log('Cloudinary environment:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
    api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
    api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
  });
}

try {
  // Ubah working directory ke root project
  process.chdir(path.join(__dirname, '..'));
  console.log('Current working directory:', process.cwd());
  
  // Debug folder structure di Vercel
  try {
    const fs = require('fs');
    const files = fs.readdirSync(process.cwd());
    console.log('Root directory files:', files.join(', '));
    
    // Cek folder-folder penting
    if (files.includes('prisma')) {
      const prismaFiles = fs.readdirSync(path.join(process.cwd(), 'prisma'));
      console.log('Prisma folder files:', prismaFiles.join(', '));
    }
  } catch (fsError) {
    console.log('Warning: File system check error -', fsError.message);
  }
  
  // Load aplikasi utama
  app = require('../index.js');
  console.log('Backend application loaded successfully');
} catch (error) {
  console.error('Error loading backend application:', error);
  
  // Fallback minimal API jika gagal load app utama
  const express = require('express');
  app = express();
  
  app.all('*', (req, res) => {
    res.status(500).json({
      error: 'Backend initialization failed',
      message: error.message,
      stack: error.stack
    });
  });
}

// Export aplikasi untuk Vercel
module.exports = app;
