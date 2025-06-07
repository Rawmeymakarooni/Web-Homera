/**
 * Debug endpoint untuk Vercel
 * Membantu mendiagnosis masalah di lingkungan Vercel
 * Termasuk informasi tentang PrismaClient dan file system
 */

// Set CORS headers untuk memastikan endpoint ini dapat diakses dari mana saja
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Hanya izinkan GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const path = require('path');
    const fs = require('fs');
    
    // Kumpulkan informasi diagnostik
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      env: {
        // Hanya tampilkan nama environment variables (bukan nilainya)
        // untuk keamanan
        variables: Object.keys(process.env).filter(key => 
          !key.toLowerCase().includes('secret') && 
          !key.toLowerCase().includes('password') &&
          !key.toLowerCase().includes('token') &&
          !key.toLowerCase().includes('key')
        ),
        // Cek apakah environment variables penting ada (tanpa menampilkan nilainya)
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasBaseUrl: !!process.env.BASE_URL,
        hasCloudinaryConfig: !!(process.env.CLOUDINARY_CLOUD_NAME && 
                             process.env.CLOUDINARY_API_KEY && 
                             process.env.CLOUDINARY_API_SECRET)
      },
      headers: req.headers,
      vercel: {
        isVercel: process.env.VERCEL === '1',
        region: process.env.VERCEL_REGION || 'unknown',
        environment: process.env.VERCEL_ENV || 'unknown'
      }
    };
    
    // Informasi file system
    try {
      const cwd = process.cwd();
      diagnostics.fileSystem = {
        cwd,
        rootFiles: fs.readdirSync(cwd),
        prismaExists: fs.existsSync(path.join(cwd, 'prisma')),
        clientJsExists: fs.existsSync(path.join(cwd, 'prisma', 'client.js')),
        schemaExists: fs.existsSync(path.join(cwd, 'prisma', 'schema.prisma'))
      };
      
      // Cek folder-folder penting
      if (diagnostics.fileSystem.prismaExists) {
        diagnostics.fileSystem.prismaFiles = fs.readdirSync(path.join(cwd, 'prisma'));
      }
      
      // Cek folder dao, routes, dan middleware
      ['dao', 'routes', 'middleware', 'controller', 'services'].forEach(folder => {
        const folderPath = path.join(cwd, folder);
        if (fs.existsSync(folderPath)) {
          diagnostics.fileSystem[`${folder}Files`] = fs.readdirSync(folderPath);
        }
      });
    } catch (fsError) {
      diagnostics.fileSystemError = fsError.message;
    }
    
    // Informasi PrismaClient
    try {
      // Coba import PrismaClient singleton
      const prismaClientPath = path.join(process.cwd(), 'prisma', 'client.js');
      if (fs.existsSync(prismaClientPath)) {
        try {
          // Coba import dengan require
          const { prisma } = require('../prisma/client');
          diagnostics.prisma = {
            imported: true,
            provider: prisma?._engineConfig?.datamodel?.datasources?.[0]?.provider || 'unknown'
          };
          
          // Coba jalankan query sederhana untuk mengecek koneksi
          try {
            const result = await prisma.$queryRaw`SELECT 1 as connected`;
            diagnostics.prisma.queryTest = {
              success: true,
              result
            };
          } catch (queryError) {
            diagnostics.prisma.queryTest = {
              success: false,
              error: queryError.message
            };
          }
        } catch (importError) {
          diagnostics.prisma = {
            imported: false,
            error: importError.message
          };
        }
      } else {
        diagnostics.prisma = {
          imported: false,
          reason: 'client.js not found'
        };
      }
    } catch (prismaError) {
      diagnostics.prismaError = prismaError.message;
    }
    
    return res.status(200).json(diagnostics);
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
