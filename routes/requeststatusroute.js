const express = require('express');
const router = express.Router();
const requestStatusController = require('../controller/requeststatuscontrol');
const auth = require('../middleware/auth');

// Memeriksa status request user (publik, direct)
router.get('/check-request-status', auth.verifyToken, requestStatusController.checkUserRequestStatus);

// User mengajukan request jadi poster (publik, direct)
router.post('/request-poster', auth.verifyToken, requestStatusController.createRequest);

// Admin melihat semua request (khusus admin/mod)
router.get('/mod/request-status', auth.verifyToken, auth.verifyAdmin, requestStatusController.getAllRequests);

// Admin menyetujui request (khusus admin/mod)
router.patch('/mod/request-status/:id/approve', auth.verifyToken, auth.verifyAdmin, requestStatusController.approveRequest);

module.exports = router;
