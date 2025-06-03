const createError = require('http-errors');
const httpCreate = require('../middleware/httpCreate');
const requestStatusService = require('../services/requeststatusservice');

const requestStatusController = {
  // User mengajukan request jadi poster
  createRequest: async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const result = await requestStatusService.createRequest(userId);
      return httpCreate.success(res, 201, 'Request berhasil diajukan', result);
    } catch (error) {
      return next(createError(400, error.message || 'Gagal mengajukan request'));
    }
  },

  // Admin melihat semua request
  getAllRequests: async (req, res, next) => {
    try {
      const requests = await requestStatusService.getAllRequests();
      return httpCreate.success(res, 200, 'Daftar request', requests);
    } catch (error) {
      return next(createError(400, error.message || 'Gagal mengambil daftar request'));
    }
  },

  // Admin menyetujui request
  approveRequest: async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.id);
      const result = await requestStatusService.approveRequest(requestId);
      return httpCreate.success(res, 200, 'Request disetujui', result);
    } catch (error) {
      return next(createError(400, error.message || 'Gagal menyetujui request'));
    }
  },
};

module.exports = requestStatusController;
