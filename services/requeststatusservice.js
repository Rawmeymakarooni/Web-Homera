const requestStatusDao = require('../DAO/requeststatusdao');
const userDao = require('../DAO/userdao');

const requestStatusService = {
  // Memeriksa status request user
  checkUserRequestStatus: async (userId) => {
    // Cek status user di tabel user
    const user = await userDao.findUserById(userId);
    if (!user) throw new Error('User tidak ditemukan');
    
    // Jika user sudah berstatus Post, berarti sudah diapprove
    if (user.status === 'Post') {
      return { status: 'approved', message: 'Anda sudah menjadi designer' };
    }
    
    // Cek apakah ada request yang pending
    const pendingRequest = await requestStatusDao.findPendingRequestByUser(userId);
    if (pendingRequest) {
      return { status: 'pending', message: 'Request sudah diajukan dan sedang menunggu persetujuan' };
    }
    
    // Tidak ada request yang pending
    return { status: 'none', message: 'Anda belum mengajukan request' };
  },
  
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
