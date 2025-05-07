const express = require('express');
const router = express.Router();
const designerController = require('../controllers/designerController');

router.get('/designers', designerController.getDesigners);

module.exports = router;
