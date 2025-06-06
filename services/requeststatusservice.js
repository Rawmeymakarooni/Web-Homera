// Menggunakan path absolut untuk kompatibilitas Vercel
const path = require('path');
let requestStatusDao, userDao;

// Import requestStatusDao
try {
  requestStatusDao = require('../dao/requeststatusdao');
} catch (error) {
  try {
    const daoPath = path.join(process.cwd(), 'dao', 'requeststatusdao.js');
    console.log('Trying absolute path import for requestStatusDao:', daoPath);
    requestStatusDao = require(daoPath);
  } catch (innerError) {
    console.error('Failed to import requeststatusdao:', innerError);
    requestStatusDao = {
      createRequestStatus: async () => ({}),
      findRequestStatus: async () => ({}),
      updateRequestStatus: async () => ({})
    };
  }
}

// Import userDao
try {
  userDao = require('../dao/userdao');
} catch (error) {
  try {
    const daoPath = path.join(process.cwd(), 'dao', 'userdao.js');
    console.log('Trying absolute path import for userDao:', daoPath);
    userDao = require(daoPath);
  } catch (innerError) {
    console.error('Failed to import userdao:', innerError);
    userDao = {
      findUserById: async () => ({})
    };
  }
}

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
