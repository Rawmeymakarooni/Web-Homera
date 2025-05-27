const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userDao = {
  checkUsernameExists: async (uname) => {
    return await prisma.user.findUnique({ where: { uname } });
  },

  checkEmailExists: async (email) => {
    return await prisma.user.findUnique({ where: { email } });
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
};

module.exports = userDao;

