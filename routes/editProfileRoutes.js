const express = require('express');
const router = express.Router();
const editProfileController = require('../controllers/editProfileController');

// POST /api/user/edit-profile
router.post('/edit-profile', editProfileController.update);

module.exports = router;
