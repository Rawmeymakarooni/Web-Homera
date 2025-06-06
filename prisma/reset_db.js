// Script untuk reset database dan sequence ID
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🔄 Memulai proses reset database...');
  
  try {
    // 1. Hapus semua data relasi terlebih dahulu
    console.log('Menghapus semua data relasi...');
    await prisma.furnitur.deleteMany();
    console.log('✓ Semua data furnitur dihapus');
    
    await prisma.portofolio.deleteMany();
    console.log('✓ Semua data portofolio dihapus');
    
    await prisma.testimonial.deleteMany();
    console.log('✓ Semua data testimonial dihapus');
    
    await prisma.requestStatus.deleteMany();
    console.log('✓ Semua data request status dihapus');
    
    await prisma.refreshToken.deleteMany();
    console.log('✓ Semua data refresh token dihapus');
    
    // 2. Hapus semua user
    console.log('Menghapus semua user...');
    await prisma.user.deleteMany();
    console.log('✓ Semua user dihapus');
    
    // 3. Reset sequence ID untuk PostgreSQL
    console.log('Mereset sequence ID di PostgreSQL...');
    
    try {
      // PostgreSQL - menggunakan nama sequence yang benar berdasarkan Prisma schema
      // Di PostgreSQL, sequence biasanya diberi nama [nama_tabel]_[nama_kolom]_seq
      await prisma.$executeRaw`ALTER SEQUENCE "user_uid_seq" RESTART WITH 1`;
      console.log('✓ Sequence ID user direset');
      
      await prisma.$executeRaw`ALTER SEQUENCE "portofolio_porto_id_seq" RESTART WITH 1`;
      console.log('✓ Sequence ID portofolio direset');
      
      await prisma.$executeRaw`ALTER SEQUENCE "furnitur_furniture_id_seq" RESTART WITH 1`;
      console.log('✓ Sequence ID furnitur direset');
      
    } catch (error) {
      console.warn('⚠️ Error saat mereset sequence:', error.message);
      console.log('Mencoba metode alternatif...');
      
      // Metode alternatif: seleksi sequence langsung dari database
      try {
        // Dapatkan daftar semua sequence dari PostgreSQL
        const sequences = await prisma.$queryRaw`SELECT sequencename FROM pg_sequences`;
        console.log('Sequences found:', sequences);
        
        // Reset sequence yang ditemukan dan terkait dengan tabel kita
        for (const seq of sequences) {
          const seqName = seq.sequencename;
          if (seqName.includes('user') || seqName.includes('portofolio') || seqName.includes('furnitur')) {
            await prisma.$executeRaw`ALTER SEQUENCE "${seqName}" RESTART WITH 1`;
            console.log(`✓ Reset sequence: ${seqName}`);
          }
        }
      } catch (seqError) {
        console.warn('⚠️ Tidak dapat mereset sequence otomatis:', seqError.message);
        console.log('Melanjutkan proses tanpa reset sequence...');
      }
    }
    
    // 4. Buat user mod dengan ID yang akan dimulai dari 1
    console.log('Membuat akun moderator admin...');
    
    // Hash password sederhana '123'
    const hashedPassword = await bcrypt.hash('123', 10);
    
    const modUser = await prisma.user.create({
      data: {
        uname: 'mod',
        email: 'mod@homera.test',
        password: hashedPassword,
        status: 'Admin',
        ppict: 'profil/Default.JPG',
        location: 'Admin HQ',
        whatsapp: '+628123456789',
        instagram: 'mod',
        user_job: 'Administrator',
        user_desc: 'Site administrator account',
      }
    });
    
    console.log(`✓ Admin user created: ${modUser.uname} with ID ${modUser.uid}`);
    console.log('✅ Database reset completed!');
    
    return modUser;
  } 
  catch (error) {
    console.error('Error saat reset database:', error);
    throw error;
  }
}

resetDatabase()
  .then((modUser) => {
    console.log(`\n===== USER MOD (ID: ${modUser.uid}) =====`);
    console.log(JSON.stringify({
      uid: modUser.uid,
      uname: modUser.uname,
      email: modUser.email,
      status: modUser.status,
      password: "123 (sudah di-hash)"
    }, null, 2));
  })
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
