delete require.cache[require.resolve('../dao/userdao')];
const userDao = require('../dao/userdao');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'homera_secret';

const userService = {
  registerControllerLogic: async ({ uname, password, confirmPassword, email, ppict }) => {
    if (!uname || !password || !confirmPassword || !email) {
      throw new Error('Semua field wajib diisi.');
    }

    if (password !== confirmPassword) {
      throw new Error('Password tidak cocok.');
    }

    const usernameUsed = await userDao.checkUsernameExists(uname);
    if (usernameUsed) {
      throw new Error('Username sudah digunakan.');
    }

    const emailUsed = await userDao.checkEmailExists(email);
    if (emailUsed) {
      throw new Error('Email sudah terdaftar.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userDao.createUser({
      uname,
      password: hashedPassword,
      email,
      ppict: ppict || 'profil/Default.JPG',
    });

    return user;
  },

   loginControllerLogic: async ({ uname, password }) => {
    if (!uname || !password) {
      throw new Error('Username dan password wajib diisi.');
    }

    const user = await userDao.findUserByUsername(uname);
    if (!user) {
      throw new Error('Username tidak ditemukan.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Password salah.');
    }

    const token = jwt.sign(
      {
        uid: user.uid,
        status: user.status,
        uname: user.uname,
      },
      JWT_SECRET,
      { expiresIn: '10h' }
    );

    return {
      token,
      user: {
        uid: user.uid,
        uname: user.uname,
        status: user.status,
      },
    };
  },
};

module.exports = userService;

