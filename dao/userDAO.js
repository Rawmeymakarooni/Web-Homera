const prisma = require('../models/prismaClient');

const UserDAO = {
  createUser: async (data) => {
    return await prisma.user.create({ data });
  },
  findByName: async (name) => {
    return await prisma.user.findUnique({ where: { name } });
  }
};

module.exports = UserDAO;
