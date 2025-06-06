const portofolioDao = require('../dao/portofoliodao');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper mapping uniform & human readable
function portoToResponse(porto, furnitur = []) {
  return {
    portofolioId: porto.porto_id,
    userId: porto.uid,
    cover: porto.cover ? process.env.BASE_URL + porto.cover : null,
    title: porto.judul,
    category: porto.kategori,
    description: porto.description,
    createdAt: porto.created_at,
    furnitur: furnitur.map(f => ({
      furniturId: f.furnitur_id,
      name: f.nama_furnitur,
      image: f.foto_furnitur ? process.env.BASE_URL + f.foto_furnitur : null,
      description: f.keterangan_furnitur,
      quantity: f.jumlah
    }))
  };
}

// Helper uniform mapping: hasil portofolio ke format frontend (tanpa furnitur)
function mapPortoBasic(portos, userMap) {
  return portos.map(p => ({
    porto_id: p.porto_id,
    cover: p.cover,
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
    // Mapping furnitur ke format frontend
    const furniturList = furnitur.map(f => ({
      furniturId: f.furnitur_id,
      name: f.nama_furnitur,
      image: f.foto_furnitur ? (process.env.BASE_URL || 'http://localhost:3000') + '/' + f.foto_furnitur : null,
      description: f.keterangan_furnitur,
      quantity: f.jumlah
    }));
    // (Optional) Hardcode palette, atau ambil dari field jika sudah ada
    const palette = [];
    return {
      porto_id: porto.porto_id,
      cover: porto.cover ? (process.env.BASE_URL || 'http://localhost:3000') + '/' + porto.cover : null,
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
    const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
    if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
    if (porto.uid !== userId && userStatus !== 'Admin') throw new Error('Tidak boleh edit portofolio milik user lain');
    const updated = await prisma.portofolio.update({ where: { porto_id: portoId }, data: updateData });
    return updated;
  },

  // Create portofolio + furnitur (with images)
  createPortofolioWithFurnitur: async (userId, portoData, furniturList, coverPath, furniturImagePaths) => {
    // portoData: { title, category, description }
    // furniturList: array of { name, description, quantity }, images by index
    
    // Siapkan path cover untuk portofolio
    const actualCoverPath = coverPath ? coverPath : null;
    
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
        foto_furnitur: furniturImagePaths[idx] || null,
        keterangan_furnitur: f.description,
        jumlah: f.quantity
      }))
    );
    // Ambil furnitur yang baru saja diinsert
    const furnitur = await prisma.furnitur.findMany({ where: { porto_id: newPorto.porto_id } });
    return portoToResponse(newPorto, furnitur);
  },

  // Update batch furnitur
  updateFurniturBatch: async (portoId, userId, userStatus, furniturList) => {
    // Validasi owner/admin
    const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
    if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
    if (porto.uid !== userId && userStatus !== 'Admin') throw new Error('Tidak boleh edit furnitur portofolio milik user lain');
    
    // Update semua furnitur
    const updated = [];
    for (const f of furniturList) {
      const updateData = {
        nama_furnitur: f.name,
        keterangan_furnitur: f.description,
        jumlah: f.quantity
      };
      if (f.image) updateData.foto_furnitur = f.image;
      const up = await prisma.furnitur.update({
        where: { furnitur_id: f.furniturId },
        data: updateData
      });
      updated.push(up);
    }
    return updated.map(f => ({
      furniturId: f.furnitur_id,
      name: f.nama_furnitur,
      image: f.foto_furnitur,
      description: f.keterangan_furnitur,
      quantity: f.jumlah
    }));
  },

  // Delete batch furnitur
  deleteFurniturBatch: async (portoId, userId, userStatus, idList) => {
    // Validasi owner/admin
    const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
    if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
    if (porto.uid !== userId && userStatus !== 'Admin') throw new Error('Tidak boleh hapus furnitur portofolio milik user lain');
    
    // Delete semua furnitur
    await prisma.furnitur.deleteMany({ where: { furnitur_id: { in: idList }, porto_id: portoId } });
    return { message: 'Furnitur berhasil dihapus.' };
  },

  // Delete portofolio (soft delete)
  deletePortofolio: async (portoId, userId, userStatus) => {
    const porto = await prisma.portofolio.findUnique({ where: { porto_id: portoId } });
    if (!porto || porto.isdelete) throw new Error('Portofolio tidak ditemukan');
    if (porto.uid !== userId && userStatus !== 'Admin') throw new Error('Tidak boleh hapus portofolio milik user lain');
    await prisma.portofolio.update({ where: { porto_id: portoId }, data: { isdelete: true } });
    return { message: 'Portofolio berhasil dihapus (soft delete)' };
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
