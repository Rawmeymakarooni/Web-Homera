const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EditProfileDAO {
  async findUserById(uid) {
    return prisma.user.findUnique({ where: { uid: Number(uid) } });
  }

  async updateUser(uid, data) {
    return prisma.user.update({
      where: { uid: Number(uid) },
      data,
    });
  }
}

module.exports = new EditProfileDAO();