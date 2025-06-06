/**
 * Image API Route
 * Endpoint untuk mengambil gambar yang disimpan di database
 */
const express = require('express');
const router = express.Router();
// Gunakan singleton Prisma Client yang sudah ada
const prisma = require('../prisma/client');
const { logger } = require('../middleware/logger');

// GET /api/images/:userId/:filename
// Endpoint untuk mengambil gambar profil berdasarkan userId dan filename
router.get('/:userId/:filename', async (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    // Log request untuk debugging
    logger.info(`Image request for user ${userId}, filename: ${filename}`);
    
    // Cari user berdasarkan uid
    const user = await prisma.user.findUnique({
      where: { uid: userId }
    });
    
    if (!user || !user.ppict) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gambar tidak ditemukan' 
      });
    }
    
    // Di implementasi sebenarnya, di sini kita akan mengambil gambar dari cloud storage
    // Untuk sementara, kita hanya mengembalikan placeholder atau URL default
    
    // Jika di production (Vercel), kita tidak bisa mengembalikan file fisik
    if (process.env.NODE_ENV === 'production') {
      // Redirect ke placeholder image
      return res.redirect('https://via.placeholder.com/300x300?text=Profile+Image');
    } else {
      // Di development, kita bisa mencoba mengakses file fisik jika ada
      // Tapi tetap sediakan fallback jika file tidak ada
      try {
        // Coba kirim file jika ada
        const path = require('path');
        const fs = require('fs');
        const filePath = path.join(__dirname, '..', user.ppict);
        
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        } else {
          // Fallback ke placeholder
          return res.redirect('https://via.placeholder.com/300x300?text=Profile+Image');
        }
      } catch (error) {
        logger.error('Error accessing image file:', error);
        return res.redirect('https://via.placeholder.com/300x300?text=Profile+Image');
      }
    }
  } catch (error) {
    logger.error('Error in image route:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat mengambil gambar' 
    });
  }
});

module.exports = router;
