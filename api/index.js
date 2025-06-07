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
  
  // Pastikan PrismaClient menggunakan singleton pattern
  try {
    // Cek apakah prisma/client.js sudah ada
    const fs = require('fs');
    const prismaClientPath = path.join(process.cwd(), 'prisma', 'client.js');
    
    if (!fs.existsSync(prismaClientPath)) {
      console.log('Creating PrismaClient singleton pattern file...');
      // Buat file client.js dengan singleton pattern
      const prismaClientContent = `/**
 * Prisma Client Singleton
 * Memastikan hanya ada satu instance PrismaClient di seluruh aplikasi
 * Menghindari warning "too many clients" di Vercel
 * 
 * PENTING: Gunakan file ini untuk semua koneksi database di aplikasi
 * Import dengan: const { prisma } = require('./prisma/client');
 */

const { PrismaClient } = require('@prisma/client');

// Fungsi untuk membuat PrismaClient dengan konfigurasi yang tepat
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
    // Tambahkan connection pooling untuk Vercel
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Retry logic untuk koneksi yang gagal
    __internal: {
      engine: {
        retry: {
          maxRetries: 3,
          retryDelay: 100 // ms
        }
      }
    }
  });
};

// Gunakan globalThis untuk Node.js versi baru
const globalForPrisma = globalThis;

// Cek apakah sudah ada instance PrismaClient di global scope
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Simpan instance ke global scope jika bukan di production
// Di Vercel (serverless) ini tidak akan efektif antar invokasi
// tapi akan membantu selama satu invokasi function
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Log status koneksi untuk debugging
console.log(\`PrismaClient initialized with environment: \${process.env.NODE_ENV || 'undefined'}\`); 

// Tambahkan signal handler untuk cleanup koneksi
process.on('beforeExit', async () => {
  console.log('Disconnecting Prisma Client');
  await prisma.$disconnect();
});

// Export sebagai object dengan nama yang jelas
module.exports = { prisma };
`;
      
      fs.writeFileSync(prismaClientPath, prismaClientContent);
      console.log('PrismaClient singleton file created successfully');
    } else {
      console.log('PrismaClient singleton file already exists');
    }
  } catch (prismaError) {
    console.error('Error setting up PrismaClient singleton:', prismaError);
  }
  
  // Load aplikasi utama
  app = require('../index.js');
  console.log('Backend application loaded successfully');
  
  // Log informasi penting untuk debugging
  console.log('Routes registered:', Object.keys(app._router.stack
    .filter(r => r.route)
    .map(r => r.route.path)));
  
  // Pastikan endpoint /register dan /api/register tersedia
  const hasRegisterRoute = app._router.stack.some(r => r.route && r.route.path === '/register');
  const hasApiRegisterRoute = app._router.stack.some(r => r.route && r.route.path === '/api/register');
  
  console.log('Register routes available:', {
    '/register': hasRegisterRoute,
    '/api/register': hasApiRegisterRoute
  });
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
