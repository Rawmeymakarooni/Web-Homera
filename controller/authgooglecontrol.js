// Controller untuk login/register via Google OAuth
const { OAuth2Client } = require('google-auth-library');
// Gunakan singleton Prisma Client untuk menghindari error di Vercel
const prisma = require('../prisma/client');
const jwt = require('jsonwebtoken');
const httpCreate = require('../services/response');
const { JWT_SECRET } = process.env;

const client = new OAuth2Client();

async function loginWithGoogle(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json(httpCreate(400, 'Missing Google token'));

    // Verifikasi token Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: [process.env.GOOGLE_CLIENT_ID],
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const uname = payload.name.replace(/\s+/g, '').toLowerCase();
    const ppict = payload.picture;

    // Cari user, jika belum ada, buat baru
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          uname: uname.length > 3 ? uname : email.split('@')[0],
          email,
          password: '', // kosong, tidak bisa login manual
          status: 'View',
          ppict: ppict || 'profil/Default.JPG',
        },
      });
    }
    // Buat JWT
    const payloadJwt = { uid: user.uid, uname: user.uname, status: user.status };
    const tokenJwt = jwt.sign(payloadJwt, JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '10h' });
    res.json(httpCreate(200, 'Login Google sukses', { token: tokenJwt, user }));
  } catch (err) {
    next(err);
  }
}

module.exports = { loginWithGoogle };
