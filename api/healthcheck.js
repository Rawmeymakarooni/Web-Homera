/**
 * Health Check API untuk Vercel
 * Memastikan aplikasi berjalan dengan baik dan dapat diakses
 * Juga memeriksa koneksi database
 */

const { prisma } = require('../prisma/client');

// Handler untuk health check
module.exports = async (req, res) => {
  // Set CORS headers untuk memastikan endpoint ini dapat diakses dari mana saja
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Jika OPTIONS request (preflight), kembalikan 200 OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Jika bukan GET request, kembalikan 405 Method Not Allowed
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    // Informasi dasar tentang aplikasi
    const info = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      vercel: process.env.VERCEL === '1' ? true : false,
      region: process.env.VERCEL_REGION || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    };
    
    // Cek koneksi database jika parameter check=db
    if (req.query.check === 'db') {
      try {
        // Jalankan query sederhana untuk memastikan koneksi database berfungsi
        const dbResult = await prisma.$queryRaw`SELECT 1 as connected`;
        info.database = {
          connected: dbResult && dbResult.length > 0 && dbResult[0].connected === 1,
          message: 'Database connection successful'
        };
        
        // Tambahkan informasi jumlah user untuk memastikan data dapat diakses
        const userCount = await prisma.user.count();
        info.database.userCount = userCount;
      } catch (dbError) {
        info.database = {
          connected: false,
          message: 'Database connection failed',
          error: dbError.message
        };
        
        // Jika koneksi database gagal, status tetap 200 tapi success: false
        // untuk database check
        info.database.success = false;
      }
    }
    
    // Kembalikan informasi health check
    return res.status(200).json(info);
  } catch (error) {
    // Jika terjadi error, kembalikan 500 Internal Server Error
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};
