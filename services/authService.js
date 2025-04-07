const bcrypt = require('bcrypt');
const UserDAO = require('../dao/userDAO');

const saltRounds = 10;

const AuthService = {
  register: async (name, password, gender, profilePicPath) => {
    const existingUser = await UserDAO.findByName(name);
    if (existingUser) throw new Error('Nama akun sudah terdaftar.');

    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserDAO.createUser({
      name,
      password: hashedPassword,
      gender,
      profilePic: profilePicPath
    });

    return { id: newUser.id, name: newUser.name };
  },

  login: async (name, password) => {
    const user = await UserDAO.findByName(name);
    if (!user) throw new Error('Akun tidak ditemukan');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Password salah');

    return { id: user.id, name: user.name, profilePic: user.profilePic };
  }
};

module.exports = AuthService;
