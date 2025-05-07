const authService = require('../services/authService');
exports.registerUser = async (req, res) => {
    try {
      const result = await authService.register(req.body);
  
      // Tambahkan URL akses gambar profil
      const profileUrl = `${req.protocol}://${req.get('host')}/images/${result.ppict}`;
  
      res.status(201).json({
        message: 'Registrasi berhasil',
        userId: result.uid,
        username: result.uname,
        email: result.email,
        ppict_url: profileUrl // URL untuk akses profil default
      });
    } catch (err) {
      console.error(err);
      res.status(err.status || 500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
    }
  };