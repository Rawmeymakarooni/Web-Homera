const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateSimilarity(target, query) {
  if (!target) return 0;
  const lowerTarget = target.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerTarget.includes(lowerQuery)) {
    return lowerQuery.length;
  }

  let score = 0;
  for (let char of lowerQuery) {
    if (lowerTarget.includes(char)) {
      score++;
    }
  }
  return score;
}

// Helper buat build URL path
function buildProfileUrl(filename) {
  return filename ? `/images/${filename}` : `/images/Default.JPG`;
}

function buildPortcovUrl(filename) {
  return filename ? `/portcov/${filename}` : null;
}

exports.search = async (query) => {
  const users = await prisma.user.findMany({
    where: {
      status: 'Post',
      OR: [
        { uname: { contains: query, mode: 'insensitive' } },
        { user_job: { contains: query, mode: 'insensitive' } }
      ]
    }
  });

  const portos = await prisma.portofolio.findMany({
    where: {
      judul: { contains: query, mode: 'insensitive' }
    }
  });

  const rankedUsers = users.map(user => {
    const score = Math.max(
      calculateSimilarity(user.uname, query),
      calculateSimilarity(user.user_job, query)
    );
    return { 
      Profile: buildProfileUrl(user.ppict),
      Name: user.uname,
      UJob: user.user_job,
      score
    };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const rankedPortos = portos.map(porto => {
    const score = calculateSimilarity(porto.judul, query);
    return {
      Portcov: buildPortcovUrl(porto.cover),
      Title: porto.judul,
      score
    };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    creators: rankedUsers.map(({ score, ...rest }) => rest),
    designs: rankedPortos.map(({ score, ...rest }) => rest)
  };
};
