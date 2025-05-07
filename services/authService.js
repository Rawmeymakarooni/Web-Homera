const bcrypt = require('bcrypt');
const userDAO = require('../dao/userDAO');
exports.register = async ({ Name, Mail, Pw, CPW }) => {
    if (!Name || !Mail || !Pw || !CPW) {
      throw { status: 400, message: 'Semua field wajib diisi.' };
    }
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(Mail)) {
      throw { status: 400, message: 'Format email tidak valid.' };
    }
  
    if (Pw !== CPW) {
      throw { status: 400, message: 'Konfirmasi password tidak cocok.' };
    }
  
    // Tambahkan pengecekan uname
    const existingUname = await userDAO.findByUsername(Name);
    if (existingUname) {
      throw { status: 400, message: 'Username sudah digunakan.' };
    }
  
    const existingEmail = await userDAO.findByEmail(Mail);
    if (existingEmail) {
      throw { status: 400, message: 'Email sudah digunakan.' };
    }
  
    const hashedPassword = await bcrypt.hash(Pw, 10);
    const newUser = await userDAO.createUser({
      uname: Name,
      email: Mail,
      password: hashedPassword,
      ppict: 'Profil/Default.JPG',
    });
  
    return newUser;
  };
  