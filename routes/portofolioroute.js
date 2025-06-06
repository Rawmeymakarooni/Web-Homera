/**
 * Portofolio Routes
 * Mengatur semua endpoint related dengan portofolio dan furnitur
 */
const express = require('express');
const router = express.Router();
const portofolioController = require('../controller/portofoliocontrol');
const auth = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/multer');
const { validatePortofolio, validateFurniturList } = require('../middleware/validators');

/**
 * GET /portofolio
 * List semua portofolio (tidak soft delete)
 */
router.get('/', portofolioController.getAllPortofolios);

/**
 * GET /portofolio/:porto_id
 * Detail portofolio beserta furnitur
 */
router.get('/user/:uid', portofolioController.getPortofoliosByUser);

router.get('/:porto_id', portofolioController.getPortofolioDetail);

/**
 * GET /portofolio/category/:category
 * List portofolio berdasarkan kategori (atau 'all')
 */
router.get('/category/:category', portofolioController.getPortofoliosByCategory);

// Explore khusus halaman Explore
router.get('/explore/:category', portofolioController.getExplorePortofolios);

/**
 * POST /portofolio
 * Create portofolio + furnitur (cover + multi gambar)
 * Membutuhkan validasi token, minimal level Poster
 */
router.post('/', 
  auth.verifyToken, 
  auth.verifyPoster,
  // Menggunakan upload dinamis untuk cover dan furnitur images
  upload('cover', false),
  // Untuk multiple furnitur images, kita perlu menangani satu per satu
  ...Array.from({length: 50}, (_, i) => upload(`furniturImage_${i}`, false)),
  
  handleMulterError,
  validatePortofolio,
  validateFurniturList,
  portofolioController.createPortofolio
);

/**
 * PUT /portofolio/:porto_id
 * Update portofolio (hanya owner/admin)
 */
router.put('/:porto_id', 
  auth.verifyToken, 
  validatePortofolio,
  portofolioController.updatePortofolio
);

/**
 * DELETE /portofolio/:porto_id 
 * Delete portofolio (hanya owner/admin)
 */
router.delete('/:porto_id', 
  auth.verifyToken, 
  portofolioController.deletePortofolio
);

/**
 * PUT /portofolio/:porto_id/furnitur 
 * Batch update furnitur
 */
router.put('/:porto_id/furnitur', 
  auth.verifyToken, 
  // Menggunakan upload dinamis untuk furnitur images
  ...Array.from({length: 20}, (_, i) => upload(`furniturImage_${i}`, false)),
  handleMulterError,
  validateFurniturList,
  portofolioController.updateFurniturBatch
);

/**
 * DELETE /portofolio/:porto_id/furnitur
 * Batch delete furnitur
 */
router.delete('/:porto_id/furnitur', 
  auth.verifyToken, 
  portofolioController.deleteFurniturBatch
);

/**
 * DELETE /mod/portofolio/:porto_id
 * Admin soft delete portofolio (admin only)
 */
router.delete('/mod/:porto_id', 
  auth.verifyToken, 
  auth.verifyAdmin, 
  portofolioController.deletePortofolioByAdmin
);

module.exports = router;
