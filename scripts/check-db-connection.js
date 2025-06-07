/**
 * Script untuk memeriksa koneksi database
 * Digunakan untuk memastikan koneksi database berjalan dengan baik
 * Terutama untuk debugging masalah koneksi di Vercel
 */

const { prisma } = require('../prisma/client');

async function checkDatabaseConnection() {
  console.log('Checking database connection...');
  try {
    // Coba jalankan query sederhana untuk memastikan koneksi berfungsi
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    
    if (result && result.length > 0 && result[0].connected === 1) {
      console.log('✅ Database connection successful!');
      console.log('Database URL:', process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set');
      console.log('Environment:', process.env.NODE_ENV || 'undefined');
      
      // Cek jumlah user untuk memastikan data dapat diakses
      const userCount = await prisma.user.count();
      console.log(`Total users in database: ${userCount}`);
      
      return true;
    } else {
      console.error('❌ Database connection failed: Unexpected query result');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection failed with error:');
    console.error(error);
    return false;
  } finally {
    // Pastikan untuk menutup koneksi
    await prisma.$disconnect();
  }
}

// Jalankan jika dipanggil langsung (bukan di-import)
if (require.main === module) {
  checkDatabaseConnection()
    .then(success => {
      if (!success) {
        console.log('Exiting with error code 1');
        process.exit(1);
      }
      console.log('Database check completed successfully');
    })
    .catch(err => {
      console.error('Unhandled error during database check:', err);
      process.exit(1);
    });
}

module.exports = { checkDatabaseConnection };
