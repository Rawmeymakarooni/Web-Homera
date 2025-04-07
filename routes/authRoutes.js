const express = require('express');
const multer = require('multer');
const AuthController = require('../controllers/authController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/register', upload.single('profilePic'), AuthController.register);
router.post('/login', AuthController.login);

module.exports = router;
