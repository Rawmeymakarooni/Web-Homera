/**
 * Prisma seed script: Membuat akun admin, poster, viewer, portofolio, dan furnitur
 * Menggunakan PrismaClient singleton pattern untuk konsistensi dengan aplikasi
 */
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const path = require('path');

// Set faker locale ke Indonesia jika tersedia
try {
  faker.setLocale('id_ID');
} catch (error) {
  console.log('Locale id_ID tidak tersedia, menggunakan default locale');
}
const { logger } = require('../middleware/logger');

// Kategori portofolio sesuai dengan Explore.jsx
const CATEGORIES = ["Living", "Bath", "Bed", "Kitchen", "Terrace", "Pool", "Dining"];

// Daftar placeholder gambar untuk portofolio dan furnitur
const PORTFOLIO_PLACEHOLDERS = [
  'portofolio/living-room-1.jpg',
  'portofolio/bathroom-design.jpg',
  'portofolio/bedroom-modern.jpg',
  'portofolio/kitchen-minimalist.jpg',
  'portofolio/terrace-design.jpg',
  'portofolio/pool-area.jpg',
  'portofolio/dining-room.jpg'
];

const FURNITURE_PLACEHOLDERS = [
  'furnitur/sofa-modern.jpg',
  'furnitur/chair-wooden.jpg',
  'furnitur/table-glass.jpg',
  'furnitur/cabinet-storage.jpg',
  'furnitur/bed-frame.jpg',
  'furnitur/lamp-standing.jpg',
  'furnitur/shelf-wall.jpg'
];

// Import PrismaClient singleton
const { prisma } = require('./client');
console.log('Menggunakan PrismaClient singleton');

// Deteksi environment
const isProduction = process.env.NODE_ENV === 'production';

// Helper untuk format URL gambar
function formatImageUrl(imagePath) {
  if (!imagePath) return null;
  
  // Jika di production dan path berisi cloudinary URL, gunakan apa adanya
  if (isProduction && (imagePath.includes('cloudinary.com') || imagePath.includes('res.cloudinary.com'))) {
    return imagePath;
  }
  
  // Jika di production dan path tidak berisi cloudinary URL, tambahkan prefix cloudinary
  if (isProduction && !imagePath.includes('cloudinary.com')) {
    // Untuk Default.JPG, gunakan URL Cloudinary yang sudah diupload
    if (imagePath === 'profil/Default.JPG') {
      return 'https://res.cloudinary.com/dqpnrqvzi/image/upload/v1686138329/homera/profil/Default.jpg';
    }
    
    // Untuk gambar lain, format URL sesuai konvensi Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dqpnrqvzi';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${imagePath}`;
  }
  
  // Jika di development, gunakan BASE_URL + path
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/${imagePath}`;
}

// Helper untuk membuat portofolio dengan furnitur
async function createPortfolioWithFurniture(userId, category, numFurniture = 2) {
  // Pilih cover image berdasarkan kategori jika memungkinkan
  const categoryIndex = CATEGORIES.indexOf(category);
  const coverImage = PORTFOLIO_PLACEHOLDERS[categoryIndex !== -1 ? categoryIndex : Math.floor(Math.random() * PORTFOLIO_PLACEHOLDERS.length)];
  
  // Buat portofolio
  const portfolio = await prisma.portofolio.create({
    data: {
      uid: userId,
      judul: `${category} Design ${faker.word.adjective()}`,
      kategori: category,
      cover: coverImage,
      description: faker.lorem.paragraph(3),
      created_at: faker.date.past({ years: 1 })
    }
  });
  
  // Buat furnitur untuk portofolio ini
  for (let i = 0; i < numFurniture; i++) {
    await prisma.furnitur.create({
      data: {
        porto_id: portfolio.porto_id,
        nama_furnitur: faker.commerce.productName(),
        foto_furnitur: FURNITURE_PLACEHOLDERS[Math.floor(Math.random() * FURNITURE_PLACEHOLDERS.length)],
        keterangan_furnitur: faker.lorem.sentences(2),
        jumlah: faker.number.int({ min: 1, max: 10 })
      }
    });
  }
  
  return portfolio;
}

async function main() {
  console.log('🚀 Memulai proses seeding database baru...');
  
  // Cek apakah prisma client berfungsi dengan baik
  console.log('Memeriksa koneksi ke database...');
  try {
    // Cek model yang tersedia
    console.log('Model yang tersedia:', Object.keys(prisma));
    
    // 1. Hapus semua data relasi terlebih dahulu untuk menghindari constraint error
    console.log('Menghapus semua data relasi...');
    
    // Gunakan try-catch untuk setiap operasi delete
    try {
      await prisma.furnitur.deleteMany();
      console.log('✓ Semua data furnitur berhasil dihapus');
    } catch (error) {
      console.log('Gagal menghapus data furnitur:', error.message);
    }
    
    try {
      await prisma.portofolio.deleteMany();
      console.log('✓ Semua data portofolio berhasil dihapus');
    } catch (error) {
      console.log('Gagal menghapus data portofolio:', error.message);
    }
    
    try {
      await prisma.comments.deleteMany();
      console.log('✓ Semua data comments berhasil dihapus');
    } catch (error) {
      console.log('Gagal menghapus data comments:', error.message);
    }
    
    try {
      await prisma.requestStatus.deleteMany();
      console.log('✓ Semua data request status berhasil dihapus');
    } catch (error) {
      console.log('Gagal menghapus data request status:', error.message);
    }
    
    try {
      await prisma.refreshToken.deleteMany();
      console.log('✓ Semua data refresh token berhasil dihapus');
    } catch (error) {
      console.log('Gagal menghapus data refresh token:', error.message);
    }
  } catch (error) {
    console.error('Error saat memeriksa koneksi database:', error);
    process.exit(1);
  }
  
  // 2. Hapus SEMUA user tanpa pengecualian
  console.log('Menghapus semua user dari database...');
  const deleteResult = await prisma.user.deleteMany();
  console.log(`✓ ${deleteResult.count} user dihapus`);
  
  // 3. Buat akun moderator admin dengan password ModTersayang
  console.log('Membuat akun moderator admin...');
  const modPassword = await bcrypt.hash('ModTersayang', 10);
  
  // Buat user mod dengan status Admin
  const modUser = await prisma.user.create({
    data: {
      uname: 'Admin',
      email: 'admin@homera.test',
      password: modPassword,
      status: 'Admin',
      ppict: 'profil/Default.JPG', // Default image jika tidak ada ppict
      location: 'Admin HQ',
      whatsapp: '+628123456789',
      instagram: 'admin_homera',
      user_job: 'Administrator',
      user_desc: 'Site administrator account',
    }
  });
  
  console.log(`✓ User admin dibuat dengan ID: ${modUser.uid}`);
  
  // 4. Buat 20 user dengan status Post
  console.log('Membuat 20 user dengan status Post...');
  const postUsers = [];
  
  // Penanda untuk user dengan portofolio spesial
  const specialUserIndices = [0, 5]; // 2 user spesial akan memiliki 3 portofolio
  const superSpecialUserIndex = 10; // 1 user super spesial akan memiliki 4 portofolio
  
  for (let i = 0; i < 20; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = `${firstName.toLowerCase()}${faker.number.int(999)}`;
    
    const postUser = await prisma.user.create({
      data: {
        uname: username,
        email: faker.internet.email({ firstName, lastName }),
        password: await bcrypt.hash('password123', 10),
        status: 'Post',
        ppict: 'profil/Default.JPG',
        location: faker.location.city(),
        whatsapp: faker.phone.number('+628##########'),
        instagram: username,
        user_job: faker.person.jobTitle(),
        user_desc: faker.lorem.paragraph(),
      }
    });
    
    postUsers.push(postUser);
    console.log(`✓ User Post #${i+1} dibuat: ${postUser.uname}`);
    
    // Buat portofolio untuk user ini
    try {
      // Tentukan jumlah portofolio berdasarkan indeks user
      let numPortfolios = 1; // Default 1 portofolio per user
      
      if (specialUserIndices.includes(i)) {
        numPortfolios = 3; // 3 user spesial dengan 3 portofolio
        console.log(`🌟 User spesial #${i+1} akan memiliki ${numPortfolios} portofolio`);
      } else if (i === superSpecialUserIndex) {
        numPortfolios = 4; // 1 user super spesial dengan 4 portofolio
        console.log(`🌟🌟 User super spesial #${i+1} akan memiliki ${numPortfolios} portofolio`);
      }
      
      // Buat portofolio sesuai jumlah yang ditentukan
      for (let p = 0; p < numPortfolios; p++) {
        // Pilih kategori yang berbeda untuk setiap portofolio
        const category = CATEGORIES[p % CATEGORIES.length];
        
        // Buat portofolio dengan 2-4 furnitur
        const numFurniture = faker.number.int({ min: 2, max: 4 });
        const portfolio = await createPortfolioWithFurniture(postUser.uid, category, numFurniture);
        console.log(`  ✓ Portofolio #${p+1} (${category}) dibuat untuk ${postUser.uname} dengan ${numFurniture} furnitur`);
      }
    } catch (error) {
      console.error(`Error saat membuat portofolio untuk user ${postUser.uname}:`, error);
    }
  }
  
  // 5. Buat 10 user dengan status View
  console.log('Membuat 10 user dengan status View...');
  const viewUsers = [];
  
  for (let i = 0; i < 10; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = `${firstName.toLowerCase()}${faker.number.int(999)}`;
    
    const viewUser = await prisma.user.create({
      data: {
        uname: username,
        email: faker.internet.email({ firstName, lastName }),
        password: await bcrypt.hash('password123', 10),
        status: 'View',
        ppict: 'profil/Default.JPG',
        location: faker.location.city(),
        whatsapp: faker.phone.number('+628##########'),
        instagram: username,
        user_job: faker.person.jobTitle(),
        user_desc: faker.lorem.paragraph(),
      }
    });
    
    viewUsers.push(viewUser);
    console.log(`✓ User View #${i+1} dibuat: ${viewUser.uname}`);
  }
  
  // Hitung total portofolio dan furnitur yang dibuat
  const portfolioCount = await prisma.portofolio.count();
  const furnitureCount = await prisma.furnitur.count();
  
  console.log('✅ Seeding selesai!');
  console.log(`Total user dibuat: ${1 + postUsers.length + viewUsers.length}`);
  console.log('- 1 Admin');
  console.log(`- ${postUsers.length} user dengan status Post`);
  console.log(`- ${viewUsers.length} user dengan status View`);
  console.log(`
💾 Data portofolio dan furnitur:`);
  console.log(`- ${portfolioCount} portofolio dibuat`);
  console.log(`- ${furnitureCount} furnitur dibuat`);
  console.log(`
👍 3 user spesial memiliki 3 portofolio masing-masing`);
  console.log(`👍 1 user super spesial memiliki 4 portofolio`);
  console.log(`👍 User lainnya memiliki 1 portofolio masing-masing`);
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
