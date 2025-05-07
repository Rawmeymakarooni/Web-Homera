const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// POST /api/login - Login endpoint
router.post('/login', loginController.handleLogin);

module.exports = router;