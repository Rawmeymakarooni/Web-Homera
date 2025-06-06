const createError = require('http-errors');
const httpCreate = require('../middleware/httpCreate');
const portofolioService = require('../services/portofolioservice');

const portofolioController = {
  // GET /home-portos
  getHomeRandomPortos: async (req, res, next) => {
    try {
      const portos = await portofolioService.getRandomPortosForHome(2);
      return httpCreate.success(res, 200, portos);
    } catch (err) {
      console.error('[HOME PORTOS ERROR]', err);
      res.status(400).json({ error: err.message || 'Gagal mengambil portofolio untuk home' });
    }
  },
  // GET /portofolio/category/:category
  getPortofoliosByCategory: async (req, res, next) => {
    try {
      const { category } = req.params;
      const all = await portofolioService.getPortofoliosByCategory(category);
      return httpCreate.success(res, 200, all);
    } catch (err) {
      return next(createError(400, err.message || 'Gagal mengambil data portofolio berdasarkan kategori'));
    }
  },

  // GET /portofolio/explore/:category
  getExplorePortofolios: async (req, res, next) => {
    try {
      const { category } = req.params;
      let whereClause = { isdelete: false };
      if (category && category !== 'all') {
        whereClause.kategori = category;
      }
      console.log('[EXPLORE] category:', category, '| whereClause:', whereClause);
      const portos = await portofolioService.getExplorePortofolios(whereClause);
      return httpCreate.success(res, 200, portos);
    } catch (err) {
      console.error('[EXPLORE ERROR]', err);
      // Kirim pesan error ke frontend agar tahu penyebabnya
      res.status(400).json({ error: err.message || 'Gagal mengambil data explore portofolio' });
    }
  },
  // GET /portofolio
  getAllPortofolios: async (req, res, next) => {
    try {
      const all = await portofolioService.getAllPortofolios();
      return httpCreate.success(res, 200, all);
    } catch (err) {
      return next(createError(400, err.message || 'Gagal mengambil data portofolio'));
    }
  },
  
  // GET /portofolio/:porto_id
  getPortofolioDetail: async (req, res, next) => {
    try {
      const { porto_id } = req.params;
      const porto = await portofolioService.getPortofolioById(porto_id);
      return httpCreate.success(res, 200, porto);
    } catch (err) {
      if (err.message === 'Portofolio tidak ditemukan') {
        return next(createError(404, err.message));
      }
      return next(createError(400, err.message));
    }
  },

  // PUT /portofolio/:porto_id
  updatePortofolio: async (req, res, next) => {
    try {
      const { porto_id } = req.params;
      const userId = req.user.uid;
      const userStatus = req.user.status;
      const updateData = req.body; // Validasi sesuai kebutuhan
      
      const updated = await portofolioService.updatePortofolio(porto_id, userId, userStatus, updateData);
      return httpCreate.success(res, 200, updated);
    } catch (err) {
      if (err.message === 'Portofolio tidak ditemukan') {
        return next(createError(404, err.message));
      } else if (err.message.includes('Tidak boleh edit')) {
        return next(createError(403, err.message));
      }
      return next(createError(400, err.message));
    }
  },
  
  // DELETE /portofolio/:porto_id
  deletePortofolio: async (req, res, next) => {
    try {
      const { porto_id } = req.params;
      const userId = req.user.uid;
      const userStatus = req.user.status;
      const result = await portofolioService.deletePortofolio(porto_id, userId, userStatus);
      return httpCreate.success(res, 200, result);
    } catch (err) {
      if (err.message === 'Portofolio tidak ditemukan') {
        return next(createError(404, err.message));
      } else if (err.message.includes('Tidak boleh hapus')) {
        return next(createError(403, err.message));
      }
      return next(createError(400, err.message));
    }
  },
  
  // DELETE /mod/portofolio/:porto_id (admin only, soft delete)
  deletePortofolioByAdmin: async (req, res, next) => {
    try {
      const { porto_id } = req.params;
      if (req.user.status !== 'Admin') {
        return next(createError(403, 'Hanya admin yang boleh akses'));
      }
      const result = await portofolioService.adminDeletePortofolio(porto_id);
      return httpCreate.success(res, 200, result);
    } catch (err) {
      if (err.message === 'Portofolio tidak ditemukan') {
        return next(createError(404, err.message));
      }
      return next(createError(400, err.message));
    }
  },
  
  // POST /portofolio
  createPortofolio: async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const userStatus = req.user.status;
      if (userStatus !== 'Post' && userStatus !== 'Admin') {
        return next(createError(403, 'Hanya user Poster/Admin yang bisa membuat portofolio'));
      }
      
      // Parse data utama
      const { title, category, description } = req.body;
      
      // Parse furniturList (JSON string)
      let furniturList = [];
      if (req.body.furniturList) {
        furniturList = JSON.parse(req.body.furniturList);
      }
      
      // Mapping file cover (menggunakan folder 'portofolio')
      const coverPath = req.files['cover'] ? ('/prisma/portofolio/' + req.files['cover'][0].filename) : null;
      
      // Mapping file gambar furnitur (menggunakan folder 'furnitur')
      const furniturImagePaths = [];
      for (let i = 0; i < furniturList.length; i++) {
        const fileArr = req.files['furniturImage_' + i];
        furniturImagePaths.push(fileArr && fileArr[0] ? ('/prisma/furnitur/' + fileArr[0].filename) : null);
      }
      
      const portoData = { title, category, description };
      const result = await portofolioService.createPortofolioWithFurnitur(
        userId, portoData, furniturList, coverPath, furniturImagePaths
      );
      
      return httpCreate.success(res, 201, result);
    } catch (err) {
      return next(createError(400, err.message || 'Gagal membuat portofolio'));
    }
  },

  // PUT /portofolio/:porto_id/furnitur (batch update)
  updateFurniturBatch: async (req, res, next) => {
    try {
      const { porto_id } = req.params;
      const userId = req.user.uid;
      const userStatus = req.user.status;
      
      // Parse data
      let furniturList = [];
      if (req.body.furniturList) {
        furniturList = JSON.parse(req.body.furniturList);
      }
      
      // Mapping file gambar baru (optional)
      for (let i = 0; i < furniturList.length; i++) {
        const fileArr = req.files['furniturImage_' + i];
        if (fileArr && fileArr[0]) {
          // Gunakan folder 'furnitur' untuk penyimpanan foto furniture
          furniturList[i].image = '/prisma/furnitur/' + fileArr[0].filename;
        }
      }
      
      // Panggil service untuk update batch furnitur
      const updated = await portofolioService.updateFurniturBatch(porto_id, userId, userStatus, furniturList);
      return httpCreate.success(res, 200, updated);
    } catch (err) {
      if (err.message === 'Portofolio tidak ditemukan') {
        return next(createError(404, err.message));
      } else if (err.message.includes('Tidak boleh edit')) {
        return next(createError(403, err.message));
      }
      return next(createError(400, err.message || 'Gagal update furnitur'));
    }
  },

  // DELETE /portofolio/:porto_id/furnitur (batch delete)
  deleteFurniturBatch: async (req, res, next) => {
    try {
      const { porto_id } = req.params;
      const userId = req.user.uid;
      const userStatus = req.user.status;
      
      // Parse furniturIdList (array of id)
      let idList = [];
      if (req.body.furniturIdList) {
        idList = JSON.parse(req.body.furniturIdList);
      }
      
      // Panggil service untuk delete batch furnitur
      const result = await portofolioService.deleteFurniturBatch(porto_id, userId, userStatus, idList);
      return httpCreate.success(res, 200, result);
    } catch (err) {
      if (err.message === 'Portofolio tidak ditemukan') {
        return next(createError(404, err.message));
      } else if (err.message.includes('Tidak boleh hapus')) {
        return next(createError(403, err.message));
      }
      return next(createError(400, err.message || 'Gagal hapus furnitur'));
    }
  }
};

// GET /portofolio/user/:uid
portofolioController.getPortofoliosByUser = async (req, res, next) => {
  try {
    const { uid } = req.params;
    // Gunakan portofolioService untuk query prisma
    const portofolioService = require('../services/portofolioservice');
    console.log('[GET PORTO USER] UID:', uid);
    const portos = await portofolioService.getPortofoliosByUser(uid);
    if (!Array.isArray(portos)) {
      return res.status(200).json({ success: true, data: [] });
    }
    const mapped = portos.map(p => ({
      porto_id: p.porto_id,
      cover: p.cover ? `/prisma/portofolio/${p.cover}` : null,
      title: p.judul
    }));
    return res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    return next(createError(400, err.message || 'Gagal mengambil portofolio user'));
  }
};

module.exports = portofolioController;
