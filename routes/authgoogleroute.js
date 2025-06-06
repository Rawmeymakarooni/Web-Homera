const express = require('express');
const router = express.Router();
const { loginWithGoogle } = require('../controller/authgooglecontrol');

router.post('/login-google', loginWithGoogle);

module.exports = router;
