const requestStatusDao = require('../dao/requeststatusdao');
const userDao = require('../dao/userdao');

const requestStatusService = {
  // User membuat request baru
  createRequest: async (userId) => {
    // Cek apakah sudah ada request yang belum diapprove
    const existing = await requestStatusDao.findPendingRequestByUser(userId);
    if (existing) throw new Error('Request sudah diajukan dan belum diproses');
    return await requestStatusDao.createRequest(userId, 'view_to_post');
  },

  // Admin melihat semua request
  getAllRequests: async () => {
    return await requestStatusDao.getAllRequests();
  },

  // Admin menyetujui request
  approveRequest: async (requestId) => {
    // Set approvalStatus true dan ubah status user ke Post
    const request = await requestStatusDao.updateApprovalStatus(requestId, true);
    if (!request) throw new Error('Request tidak ditemukan');
    await userDao.updateUser(request.userId, { status: 'Post' });
    return request;
  },
};

module.exports = requestStatusService;
