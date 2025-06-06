const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userDao = {
  setPendingDelete: async (uid, untilDate) => {
    return await prisma.user.update({
      where: { uid },
      data: { pending_delete_until: untilDate }
    });
  },
  setSoftDelete: async (uid) => {
    return await prisma.user.update({
      where: { uid },
      data: { isdelete: true, pending_delete_until: null }
    });
  },
  undeleteUser: async (uid) => {
    return await prisma.user.update({
      where: { uid },
      data: { isdelete: false, pending_delete_until: null }
    });
  },
  checkUsernameExists: async (uname) => {
    return await prisma.user.findUnique({ where: { uname } });
  },

  checkEmailExists: async (email) => {
    return await prisma.user.findUnique({ where: { email } });
  },

  // Cek username ada kecuali user dengan ID tertentu (untuk update)
  checkUsernameExistsExcept: async (uname, userId) => {
    return await prisma.user.findFirst({
      where: {
        uname,
        uid: { not: userId }
      }
    });
  },

  // Cek email ada kecuali user dengan ID tertentu (untuk update)
  checkEmailExistsExcept: async (email, userId) => {
    return await prisma.user.findFirst({
      where: {
        email,
        uid: { not: userId }
      }
    });
  },

  createUser: async ({ uname, password, email, ppict }) => {
    return await prisma.user.create({
      data: {
        uname,
        password,
        email,
        ppict,
        status: 'View'
      }
    });
  },

  findUserByUsername: async (uname) => {
    return await prisma.user.findUnique({ where: { uname } });
  },
  // Cari user berdasarkan username ATAU email
  findUserByUsernameOrEmail: async (unameOrEmail) => {
    return await prisma.user.findFirst({
      where: {
        OR: [
          { uname: unameOrEmail },
          { email: unameOrEmail }
        ]
      }
    });
  },

  findUserById: async (uid) => {
    return await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        uname: true,
        email: true,
        status: true,
        ppict: true,
        user_desc: true,
        user_job: true,
        location: true,
        whatsapp: true,
        instagram: true,
        created_at: true,
        isdelete: true,
        pending_delete_until: true
      }
    });
  },

  updateUser: async (uid, userData) => {
    return await prisma.user.update({
      where: { uid },
      data: userData
    });
  },

  updatePassword: async (uid, hashedPassword) => {
    return await prisma.user.update({
      where: { uid },
      data: { password: hashedPassword }
    });
  },

  // Fungsi untuk token refresh
  saveRefreshToken: async (uid, refreshToken) => {
    // Mengasumsikan ada tabel atau field untuk menyimpan refresh token
    // Jika belum ada tabel/field, perlu dilakukan migrasi database
    return await prisma.refreshToken.upsert({
      where: { userId: uid },
      update: { token: refreshToken },
      create: {
        userId: uid,
        token: refreshToken
      }
    });
  },

  findRefreshToken: async (uid, token) => {
    return await prisma.refreshToken.findFirst({
      where: {
        userId: uid,
        token: token
      }
    });
  },

  removeRefreshToken: async (uid, token) => {
    return await prisma.refreshToken.deleteMany({
      where: {
        userId: uid,
        token: token
      }
    });
  },
  // Ambil 5 user random status 'Post' yang punya minimal 1 portofolio aktif
  findRandomPostUsersWithPortfolio: async (limit = 5) => {
    return await prisma.user.findMany({
      where: {
        status: 'Post',
        isdelete: false,
        portofolio: {
          some: { isdelete: false }
        }
      },
      orderBy: {
        // PostgreSQL RANDOM()
        // Prisma pakai 'orderBy: { ... }' + 'take' untuk random
        // Tapi Prisma tidak support random native, jadi pakai raw query
        // Fallback: urutkan by created_at, ambil 5 teratas
        created_at: 'desc'
      },
      take: limit,
      include: {
        portofolio: {
          where: { isdelete: false },
          select: { porto_id: true }
        }
      }
    });
  },

};

module.exports = userDao;
