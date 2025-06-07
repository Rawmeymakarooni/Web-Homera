/**
 * Script untuk mengosongkan seluruh database
 * Gunakan script ini dengan hati-hati karena akan menghapus SEMUA data
 */
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../middleware/logger');

// Import PrismaClient singleton
let prisma;
try {
  prisma = require('./client').prismaClient;
  logger.info('Menggunakan PrismaClient singleton');
} catch (error) {
  logger.warn('Tidak bisa import PrismaClient singleton, menggunakan instance baru');
  prisma = new PrismaClient();
}

async function main() {
  console.log('🚨 PERHATIAN: Script ini akan menghapus SEMUA data dari database!');
  console.log('Menunggu 5 detik sebelum melanjutkan... Tekan Ctrl+C untuk membatalkan.');
  
  // Tunggu 5 detik untuk memberikan kesempatan membatalkan
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('🔄 Memulai proses pengosongan database...');
  
  // Hapus semua data dari tabel dengan urutan yang memperhatikan relasi foreign key
  try {
    console.log('Menghapus data furnitur...');
    await prisma.furnitur.deleteMany();
    console.log('✓ Semua data furnitur berhasil dihapus');
    
    console.log('Menghapus data portofolio...');
    await prisma.portofolio.deleteMany();
    console.log('✓ Semua data portofolio berhasil dihapus');
    
    console.log('Menghapus data comments...');
    await prisma.comments.deleteMany();
    console.log('✓ Semua data comments berhasil dihapus');
    
    console.log('Menghapus data request status...');
    await prisma.requestStatus.deleteMany();
    console.log('✓ Semua data request status berhasil dihapus');
    
    console.log('Menghapus data refresh token...');
    await prisma.refreshToken.deleteMany();
    console.log('✓ Semua data refresh token berhasil dihapus');
    
    console.log('Menghapus data user...');
    await prisma.user.deleteMany();
    console.log('✓ Semua data user berhasil dihapus');
    
    console.log('✅ Database berhasil dikosongkan!');
  } catch (error) {
    console.error('❌ Error saat mengosongkan database:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
