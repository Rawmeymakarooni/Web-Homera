const prisma = require('../models/prismaClient');

exports.findByUsername = async (uname) => {
    return await prisma['user'].findUnique({ where: { uname } });
  };

  exports.findByEmail = async (email) => {
    return await prisma['user'].findUnique({ where: { email } });
  };
exports.createUser = async (userData) => {
  // Using bracket notation to access the lowercase model name
  return await prisma['user'].create({
    data: userData,
  });
}; 