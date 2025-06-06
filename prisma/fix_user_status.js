// Script untuk update status 25 user jadi 'View', 25 user jadi 'Post'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'dummy' } },
    orderBy: { uid: 'asc' },
    select: { uid: true }
  });
  if (users.length < 50) throw new Error('Kurang dari 50 dummy user!');

  // Bagi 25 pertama View, 25 berikutnya Post
  const viewIds = users.slice(0, 25).map(u => u.uid);
  const postIds = users.slice(25, 50).map(u => u.uid);

  await prisma.user.updateMany({
    where: { uid: { in: viewIds } },
    data: { status: 'View' }
  });
  await prisma.user.updateMany({
    where: { uid: { in: postIds } },
    data: { status: 'Post' }
  });
  console.log('25 user status View, 25 user status Post');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
