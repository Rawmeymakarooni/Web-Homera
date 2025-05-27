const express = require('express');
const router = express.Router();
const userController  = require('../controller/usercontrol');
const upload = require('../middleware/multer');

const { handleRegister, handleLogin } = userController;

// endpoint jadi: http://localhost:3000/register
router.post('/register', upload.single('ppict'), handleRegister);


// Endpoint: http://localhost:3000/login
router.post('/login', userController.handleLogin);

module.exports = router;
