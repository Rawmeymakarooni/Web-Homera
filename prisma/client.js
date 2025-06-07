/**
 * Prisma Client Singleton
 * Memastikan hanya ada satu instance PrismaClient di seluruh aplikasi
 * Menghindari warning "too many clients" di Vercel
 * 
 * PENTING: Gunakan file ini untuk semua koneksi database di aplikasi
 * Import dengan: const prisma = require('./prisma/client').prisma;
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
console.log(`PrismaClient initialized with environment: ${process.env.NODE_ENV || 'undefined'}`); 

// Tambahkan signal handler untuk cleanup koneksi
process.on('beforeExit', async () => {
  console.log('Disconnecting Prisma Client');
  await prisma.$disconnect();
});

// Export sebagai object dengan nama yang jelas
module.exports = { prisma };
