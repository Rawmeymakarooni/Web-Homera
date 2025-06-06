// Menggunakan multi-path untuk kompatibilitas Vercel
const path = require('path');
let requestStatusDao, userDao;

// Daftar kemungkinan path untuk DAO modules
const possiblePathsBase = [
  '../dao',                       // Path relatif normal
  path.join(process.cwd(), 'dao'),   // Path absolut root
  path.join(process.cwd(), 'api/dao'), // Path absolut di api/dao
  '../../dao',                    // Path relatif lain
  '../api/dao'                    // Path ke api/dao folder
];

// Function untuk mencoba load module dari berbagai path
function loadModule(moduleName, fallback) {
  let loadedModule = null;
  let loaded = false;
  
  for (const basePath of possiblePathsBase) {
    try {
      const fullPath = `${basePath}/${moduleName}`;
      console.log(`Trying to load ${moduleName} from: ${fullPath}`);
      loadedModule = require(fullPath);
      console.log(`Successfully loaded ${moduleName} from: ${fullPath}`);
      loaded = true;
      break;
    } catch (e) {
      console.log(`Failed to load ${moduleName} from ${basePath}: ${e.message}`);
    }
  }
  
  if (!loaded) {
    console.warn(`All paths failed for ${moduleName}, using fallback implementation`);
    return fallback;
  }
  
  return loadedModule;
}

// Load requestStatusDao
requestStatusDao = loadModule('requeststatusdao', {
  createRequestStatus: async () => ({}),
  findRequestStatus: async () => ({}),
  updateRequestStatus: async () => ({})
});

// Load userDao
userDao = loadModule('userdao', {
  findUserById: async () => ({})
});

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
