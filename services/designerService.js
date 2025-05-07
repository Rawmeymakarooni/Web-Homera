const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllDesigners = async () => {
  const users = await prisma.user.findMany({
    where: { status: 'Post' }
  });

  return users.map(user => ({
    Profile: user.ppict,
    Name: user.uname,
    UJob: user.user_job
  }));
};
