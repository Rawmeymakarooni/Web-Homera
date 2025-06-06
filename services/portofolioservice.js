// Menggunakan multi-path untuk kompatibilitas Vercel
const path = require('path');
let portofolioDao;

// Import cloudinaryService untuk file processing
let cloudinaryService;
try {
  cloudinaryService = require('./cloudinaryService');
  console.log('Cloudinary service loaded successfully in portofolio service');
} catch (e) {
  console.warn('Failed to load cloudinaryService in portofolio service, using fallback:', e.message);
  // Fallback jika tidak bisa load cloudinaryService
  cloudinaryService = {
    uploadToCloudinary: async () => ({
      url: null,
      publicId: null,
      filePath: null
    }),
    deleteFromCloudinary: async () => true
  };
}

// Daftar kemungkinan path untuk portofolioDao
const possiblePaths = [
  '../dao/portofoliodao',                             // Path relatif normal
  path.join(process.cwd(), 'dao', 'portofoliodao.js'),   // Path absolut root
  path.join(process.cwd(), 'api/dao', 'portofoliodao.js'), // Path absolut di api/dao
  '../../dao/portofoliodao',                          // Path relatif lain
  '../api/dao/portofoliodao'                          // Path ke api/dao folder
];

// Coba setiap path sampai salah satu berhasil
let loaded = false;
for (const p of possiblePaths) {
  try {
    console.log(`Trying to load portofolioDao from: ${p}`);
    portofolioDao = require(p);
    console.log(`Successfully loaded portofolioDao from: ${p}`);
    loaded = true;
    break;
  } catch (e) {
    console.log(`Failed to load from ${p}: ${e.message}`);
  }
}

// Jika semua gagal, gunakan implementasi minimal
if (!loaded) {
  console.warn('All paths failed, using minimal implementation for portofolioDao');
  portofolioDao = {
    createPortofolio: async () => ({}),
    findPortofolioById: async () => ({}),
    findPortofoliosByUserId: async () => ([])
  };
}
// Gunakan singleton Prisma Client untuk menghindari error di Vercel
const prisma = require('../prisma/client');

// Helper mapping uniform & human readable
function portoToResponse(porto, furnitur = []) {
  // Format URL depending on whether it's a Cloudinary URL or local path
  const formatImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // Jika sudah berupa URL lengkap (Cloudinary), gunakan langsung
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    // Jika path lokal, gabungkan dengan BASE_URL
    return `${process.env.BASE_URL || 'http://localhost:3000'}${!imagePath.startsWith('/') ? '/' : ''}${imagePath}`;
  };
  
  return {
    portofolioId: porto.porto_id,
    userId: porto.uid,
    cover: formatImageUrl(porto.cover),
    title: porto.judul,
    category: porto.kategori,
    description: porto.description,
    createdAt: porto.created_at,
    furnitur: furnitur.map(f => ({
      furniturId: f.furnitur_id,
      name: f.nama_furnitur,
      image: formatImageUrl(f.foto_furnitur),
      description: f.keterangan_furnitur,
      quantity: f.jumlah
    }))
  };
}

// Helper uniform mapping: hasil portofolio ke format frontend (tanpa furnitur)
function mapPortoBasic(portos, userMap) {
  // Format URL function untuk konsistensi
  const formatImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // Jika sudah berupa URL lengkap (Cloudinary), gunakan langsung
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    // Jika path lokal, gabungkan dengan BASE_URL
    return `${process.env.BASE_URL || 'http://localhost:3000'}${!imagePath.startsWith('/') ? '/' : ''}${imagePath}`;
  };
  
  return portos.map(p => ({
    porto_id: p.porto_id,
    cover: formatImageUrl(p.cover),
    title: p.judul,
    kategori: p.kategori,
    created_at: p.created_at,
    uname: userMap[p.uid] || null
  }));
}

const portofolioService = {
  // Ambil portofolio milik user tertentu, hanya porto_id, cover, judul
  getPortofoliosByUser: async (uid) => {
    return await prisma.portofolio.findMany({
      where: { uid, isdelete: false },
      select: {
        porto_id: true,
        cover: true,
        judul: true,
      },
      orderBy: { created_at: 'desc' }
    });
  },
  // Untuk homepage: ambil 2 porto random, format sama dengan explore
  getRandomPortosForHome: async (limit = 2) => {
    const portos = await prisma.portofolio.findMany({
      where: { isdelete: false },
      select: {
        porto_id: true,
        cover: true,
        judul: true,
        kategori: true,
        created_at: true,
        uid: true
      }
    });
    if (portos.length === 0) return [];
    const uids = [...new Set(portos.map(p => p.uid).filter(Boolean))];
    let users = [];
    if (uids.length > 0) {
      users = await prisma.user.findMany({
        where: { uid: { in: uids } },
        select: { uid: true, uname: true }
      });
    }
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u.uname; });
    const mapped = mapPortoBasic(portos, userMap);
    // Fisher-Yates Shuffle
    for (let i = mapped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
    }
    return mapped.slice(0, limit);
  },

  // Untuk halaman Explore: ambil porto_id, cover, judul, created_at, kategori. Urutkan by created_at desc, filter kategori di service. Setelah itu, mapping hasil: untuk setiap porto, ambil user.uname berdasar uid (query user sekali untuk semua porto, lalu join manual di JS agar efisien).
  getExplorePortofolios: async (whereClause) => {
    // Ambil porto utama
    // Ambil semua porto (all), urutkan by created_at desc, filter soft delete
    const allPortos = await prisma.portofolio.findMany({
      where: { isdelete: false },
      orderBy: [ { created_at: 'desc' } ],
      select: {
        porto_id: true,
        cover: true,
        judul: true,
        kategori: true,
        created_at: true,
        uid: true
      }
    });
    // Filter kategori di JS jika ada kategori spesifik
    let portos = allPortos;
    if (whereClause.kategori && whereClause.kategori !== 'all') {
      portos = allPortos.filter(p => (p.kategori||'').toLowerCase() === whereClause.kategori.toLowerCase());
    }
    const uids = [...new Set(portos.map(p => p.uid).filter(Boolean))];
    let users = [];
    if (uids.length > 0) {
      users = await prisma.user.findMany({
        where: { uid: { in: uids } },
        select: { uid: true, uname: true }
      });
    }
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u.uname; });
    return mapPortoBasic(portos, userMap);
  },

  // Ambil portofolio berdasarkan kategori (atau semua)
  getPortofoliosByCategory: async (category) => {
    let whereClause = { isdelete: false };
    if (category && category !== 'all') {
      whereClause.kategori = category;
    }
    let portos = await prisma.portofolio.findMany({
      where: whereClause,
      orderBy: [ { created_at: 'desc' }, { porto_id: 'desc' } ],
      select: {
        porto_id: true,
        cover: true,
        judul: true,
        kategori: true,
        created_at: true,
        uid: true
      }
    });
    // Urutkan lagi jika filter manual
    if (category && category !== 'all') {
      portos = portos.filter(p => (p.kategori||'').toLowerCase() === category.toLowerCase());
      portos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const uids = [...new Set(portos.map(p => p.uid).filter(Boolean))];
    let users = [];
    if (uids.length > 0) {
      users = await prisma.user.findMany({
        where: { uid: { in: uids } },
        select: { uid: true, uname: true }
      });
    }
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u.uname; });
    return mapPortoBasic(portos, userMap);
  },

  // Get semua portofolio (tidak termasuk yang sudah dihapus)
  getAllPortofolios: async () => {
    const portos = await prisma.portofolio.findMany({
      where: { isdelete: false },
      orderBy: [ { created_at: 'desc' } ],
      select: {
        porto_id: true,
        cover: true,
        judul: true,
        kategori: true,
        created_at: true,
        uid: true
      }
    });
    const uids = [...new Set(portos.map(p => p.uid).filter(Boolean))];
    let users = [];
    if (uids.length > 0) {
      users = await prisma.user.findMany({
        where: { uid: { in: uids } },
        select: { uid: true, uname: true }
      });
    }
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u.uname; });
    return mapPortoBasic(portos, userMap);
  },

  // Get detail portofolio berdasarkan ID
  getPortofolioById: async (portoId) => {
    const porto = await prisma.portofolio.findUnique({
      where: { porto_id: portoId },
      select: {
        porto_id: true,
        cover: true,
        judul: true,
        kategori: true,
        description: true,
        created_at: true,
        uid: true
      }
    });
    if (!porto) throw new Error('Portofolio tidak ditemukan');
    let uname = null;
    if (porto.uid) {
      const user = await prisma.user.findUnique({ where: { uid: porto.uid }, select: { uname: true } });
      uname = user ? user.uname : null;
    }
    // Ambil furnitur terkait portofolio
    const furnitur = await prisma.furnitur.findMany({
      where: { porto_id: porto.porto_id },
      select: {
        furnitur_id: true,
        nama_furnitur: true,
        foto_furnitur: true,
        keterangan_furnitur: true,
        jumlah: true
      }
    });
    // Format URL function untuk konsistensi
    const formatImageUrl = (imagePath) => {
      if (!imagePath) return null;
      // Jika sudah berupa URL lengkap (Cloudinary), gunakan langsung
      if (imagePath.startsWith('http')) {
        return imagePath;
      }
      // Jika path lokal, gabungkan dengan BASE_URL
      return `${process.env.BASE_URL || 'http://localhost:3000'}${!imagePath.startsWith('/') ? '/' : ''}${imagePath}`;
    };
    
    // Mapping furnitur ke format frontend
    const furniturList = furnitur.map(f => ({
      furniturId: f.furnitur_id,
      name: f.nama_furnitur,
      image: formatImageUrl(f.foto_furnitur),
      description: f.keterangan_furnitur,
      quantity: f.jumlah
    }));
    // (Optional) Hardcode palette, atau ambil dari field jika sudah ada
    const palette = [];
    return {
      porto_id: porto.porto_id,
      cover: formatImageUrl(porto.cover),
      title: porto.judul,
      kategori: porto.kategori,
      description: porto.description,
      created_at: porto.created_at,
      uname,
      palette,
      furnitur: furniturList
    };
  },

  // Update portofolio basic data
  updatePortofolio: async (portoId, userId, userStatus, updateData) => {
    try {
      // Validasi portofolio
      const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
      if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
      if (porto.uid !== userId && userStatus !== 'Admin') throw new Error('Tidak boleh edit portofolio milik user lain');
      
      // Handle cover image upload ke Cloudinary jika ada
      if (updateData.cover && !updateData.cover.startsWith('http') && process.env.NODE_ENV === 'production') {
        try {
          // Coba baca file dari filesystem (untuk dev, akan gagal di Vercel)
          const fs = require('fs');
          const coverPath = updateData.cover;
          const coverFilePath = path.join(process.cwd(), coverPath.startsWith('/') ? coverPath.substring(1) : coverPath);
          
          if (fs.existsSync(coverFilePath)) {
            const fileBuffer = fs.readFileSync(coverFilePath);
            const fileObject = {
              buffer: fileBuffer,
              originalname: path.basename(coverFilePath)
            };
            
            // Upload ke Cloudinary
            const cloudinaryResult = await cloudinaryService.uploadToCloudinary(fileObject, 'portofolio');
            updateData.cover = cloudinaryResult.url; // Update path ke Cloudinary URL
            console.log('Cover updated and uploaded to Cloudinary:', cloudinaryResult.url);
            
            // Optionally delete old image from Cloudinary if needed
            if (porto.cover && porto.cover.includes('cloudinary')) {
              try {
                // Extract public_id dari URL
                const publicId = porto.cover.split('/').pop().split('.')[0];
                await cloudinaryService.deleteFromCloudinary(publicId);
                console.log('Old cover deleted from Cloudinary:', publicId);
              } catch (deleteErr) {
                console.warn('Failed to delete old cover from Cloudinary:', deleteErr.message);
              }
            }
          }
        } catch (fsError) {
          console.warn('Failed to read local cover file (expected in Vercel):', fsError.message);
          // Continue with path as-is karena ini normal di Vercel
        }
      }
      
      // Update database
      const updated = await prisma.portofolio.update({ where: { porto_id: portoId }, data: updateData });
      return updated;
    } catch (error) {
      console.error('Error in updatePortofolio:', error);
      throw error;
    }
  },

  // Create portofolio + furnitur (with images)
  createPortofolioWithFurnitur: async (userId, portoData, furniturList, coverPath, furniturImagePaths) => {
    // portoData: { title, category, description }
    // furniturList: array of { name, description, quantity }, images by index
    
    try {
      let actualCoverPath = coverPath ? coverPath : null;
      let processedFurniturImagePaths = [...furniturImagePaths]; // Clone array untuk dimodifikasi
      
      // Handle Cloudinary upload di production
      if (process.env.NODE_ENV === 'production') {
        console.log('Production mode: Processing image uploads for Cloudinary');
        
        // Upload cover image ke Cloudinary jika ada dan belum berupa URL
        if (actualCoverPath && !actualCoverPath.startsWith('http')) {
          try {
            // Coba baca file dari filesystem (untuk dev, akan gagal di Vercel)
            const fs = require('fs');
            const coverFilePath = path.join(process.cwd(), actualCoverPath.startsWith('/') ? actualCoverPath.substring(1) : actualCoverPath);
            
            if (fs.existsSync(coverFilePath)) {
              const fileBuffer = fs.readFileSync(coverFilePath);
              const fileObject = {
                buffer: fileBuffer,
                originalname: path.basename(coverFilePath)
              };
              
              // Upload ke Cloudinary
              const cloudinaryResult = await cloudinaryService.uploadToCloudinary(fileObject, 'portofolio');
              actualCoverPath = cloudinaryResult.url; // Update path ke Cloudinary URL
              console.log('Cover uploaded to Cloudinary:', cloudinaryResult.url);
            }
          } catch (fsError) {
            console.warn('Failed to read local cover file (expected in Vercel):', fsError.message);
            // Continue with path as-is karena ini normal di Vercel
          }
        }
        
        // Upload furniture images ke Cloudinary
        for (let i = 0; i < processedFurniturImagePaths.length; i++) {
          const imagePath = processedFurniturImagePaths[i];
          if (imagePath && !imagePath.startsWith('http')) {
            try {
              const fs = require('fs');
              const furniturFilePath = path.join(process.cwd(), imagePath.startsWith('/') ? imagePath.substring(1) : imagePath);
              
              if (fs.existsSync(furniturFilePath)) {
                const fileBuffer = fs.readFileSync(furniturFilePath);
                const fileObject = {
                  buffer: fileBuffer,
                  originalname: path.basename(furniturFilePath)
                };
                
                // Upload ke Cloudinary
                const cloudinaryResult = await cloudinaryService.uploadToCloudinary(fileObject, 'furnitur');
                processedFurniturImagePaths[i] = cloudinaryResult.url; // Update path ke Cloudinary URL
                console.log(`Furniture image ${i+1} uploaded to Cloudinary:`, cloudinaryResult.url);
              }
            } catch (fsError) {
              console.warn(`Failed to read local furniture image ${i+1} (expected in Vercel):`, fsError.message);
              // Continue with path as-is karena ini normal di Vercel
            }
          }
        }
      }
      
      const newPorto = await portofolioDao.createPortofolioWithFurnitur(
        {
          uid: userId,
          cover: actualCoverPath,
          judul: portoData.title,
          kategori: portoData.category,
          description: portoData.description
        },
        furniturList.map((f, idx) => ({
          nama_furnitur: f.name,
          foto_furnitur: processedFurniturImagePaths[idx] || null,
          keterangan_furnitur: f.description,
          jumlah: f.quantity
        }))
      );
      
      // Ambil furnitur yang baru saja diinsert
      const furnitur = await prisma.furnitur.findMany({ where: { porto_id: newPorto.porto_id } });
      return portoToResponse(newPorto, furnitur);
    } catch (error) {
      console.error('Error in createPortofolioWithFurnitur:', error);
      throw error;
    }
  },

  // Update batch furnitur
  updateFurniturBatch: async (portoId, userId, userStatus, furniturList) => {
    try {
      // Validasi owner/admin
      const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
      if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
      if (porto.uid !== userId && userStatus !== 'Admin') throw new Error('Tidak boleh edit furnitur portofolio milik user lain');
      
      // Format URL function untuk konsistensi
      const formatImageUrl = (imagePath) => {
        if (!imagePath) return null;
        // Jika sudah berupa URL lengkap (Cloudinary), gunakan langsung
        if (imagePath.startsWith('http')) {
          return imagePath;
        }
        // Jika path lokal, gabungkan dengan BASE_URL
        return `${process.env.BASE_URL || 'http://localhost:3000'}${!imagePath.startsWith('/') ? '/' : ''}${imagePath}`;
      };
      
      // Update semua furnitur
      const updated = [];
      for (const f of furniturList) {
        const updateData = {
          nama_furnitur: f.name,
          keterangan_furnitur: f.description,
          jumlah: f.quantity
        };
        
        // Handle image upload ke Cloudinary jika ada dan bukan URL
        if (f.image) {
          // Cek apakah image adalah local path yang perlu diupload
          if (!f.image.startsWith('http') && process.env.NODE_ENV === 'production') {
            try {
              // Coba baca file dari filesystem (untuk dev, akan gagal di Vercel)
              const fs = require('fs');
              const imagePath = f.image;
              const furniturFilePath = path.join(process.cwd(), imagePath.startsWith('/') ? imagePath.substring(1) : imagePath);
              
              if (fs.existsSync(furniturFilePath)) {
                const fileBuffer = fs.readFileSync(furniturFilePath);
                const fileObject = {
                  buffer: fileBuffer,
                  originalname: path.basename(furniturFilePath)
                };
                
                // Upload ke Cloudinary
                const cloudinaryResult = await cloudinaryService.uploadToCloudinary(fileObject, 'furnitur');
                updateData.foto_furnitur = cloudinaryResult.url; // Update path ke Cloudinary URL
                console.log(`Furniture image for ID ${f.furniturId} uploaded to Cloudinary:`, cloudinaryResult.url);
                
                // Dapatkan furnitur lama untuk melihat gambar yang perlu dihapus
                const existingFurnitur = await prisma.furnitur.findUnique({ where: { furnitur_id: f.furniturId } });
                if (existingFurnitur && existingFurnitur.foto_furnitur && existingFurnitur.foto_furnitur.includes('cloudinary')) {
                  try {
                    // Extract public_id dari URL
                    const publicId = existingFurnitur.foto_furnitur.split('/').pop().split('.')[0];
                    await cloudinaryService.deleteFromCloudinary(publicId);
                    console.log(`Old furniture image deleted from Cloudinary: ${publicId}`);
                  } catch (deleteErr) {
                    console.warn(`Failed to delete old furniture image from Cloudinary:`, deleteErr.message);
                  }
                }
              }
            } catch (fsError) {
              console.warn(`Failed to read local furniture image for ID ${f.furniturId} (expected in Vercel):`, fsError.message);
              // Continue with path as-is karena ini normal di Vercel
              updateData.foto_furnitur = f.image;
            }
          } else {
            // Jika image adalah URL atau non-production, gunakan langsung
            updateData.foto_furnitur = f.image;
          }
        }
        
        // Update database
        const up = await prisma.furnitur.update({
          where: { furnitur_id: f.furniturId },
          data: updateData
        });
        updated.push(up);
      }
      
      // Format response dengan URL yang benar
      return updated.map(f => ({
        furniturId: f.furnitur_id,
        name: f.nama_furnitur,
        image: formatImageUrl(f.foto_furnitur),
        description: f.keterangan_furnitur,
        quantity: f.jumlah
      }));
    } catch (error) {
      console.error('Error in updateFurniturBatch:', error);
      throw error;
    }
  },

  // Delete batch furnitur
  deleteFurniturBatch: async (portoId, userId, userStatus, idList) => {
    try {
      // Validasi owner/admin
      const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
      if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
      if (porto.uid !== userId && userStatus !== 'Admin') throw new Error('Tidak boleh hapus furnitur portofolio milik user lain');
      
      // Delete furnitur dari database - tidak menghapus gambar dari Cloudinary 
      // karena ini adalah soft delete dari sisi database
      await prisma.furnitur.deleteMany({ where: { furnitur_id: { in: idList }, porto_id: portoId } });
      return { message: 'Furnitur berhasil dihapus.' };
    } catch (error) {
      console.error('Error in deleteFurniturBatch:', error);
      throw error;
    }
  },

  // Delete portofolio (soft delete)
  deletePortofolio: async (portoId, userId, userStatus) => {
    try {
      const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
      if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
      if (porto.uid !== userId && userStatus !== 'Admin') throw new Error('Tidak boleh hapus portofolio milik user lain');
      
      // Soft delete portofolio - tidak menghapus gambar dari Cloudinary karena ini hanya soft delete
      // Gambar tetap disimpan jika ada kebutuhan restore data nantinya
      await prisma.portofolio.update({ where: { porto_id: portoId }, data: { isdelete: true } });
      return { message: 'Portofolio berhasil dihapus (soft delete)' };
    } catch (error) {
      console.error('Error in deletePortofolio:', error);
      throw error;
    }
  },

  // Admin soft delete portofolio
  adminDeletePortofolio: async (portoId) => {
    const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
    if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
    await prisma.portofolio.update({ where: { porto_id: portoId }, data: { isdelete: true } });
    return { message: 'Portofolio berhasil dihapus oleh admin (soft delete)' };
  }
};

module.exports = portofolioService;
