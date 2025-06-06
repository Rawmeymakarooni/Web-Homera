// Prisma seed script: Membuat satu akun moderator saja
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Memulai proses seeding database...');
  console.log('Membersihkan database secara menyeluruh...');
  
  // 1. Hapus semua data relasi terlebih dahulu untuk menghindari constraint error
  console.log('Menghapus semua data relasi...');
  await prisma.furnitur.deleteMany();
  console.log('✓ Semua data furnitur dihapus');
  
  await prisma.portofolio.deleteMany();
  console.log('✓ Semua data portofolio dihapus');
  
  await prisma.comments.deleteMany();
  console.log('✓ Semua data comments dihapus');
  
  await prisma.requestStatus.deleteMany();
  console.log('✓ Semua data request status dihapus');
  
  await prisma.refreshToken.deleteMany();
  console.log('✓ Semua data refresh token dihapus');
  
  // 2. Hapus SEMUA user tanpa pengecualian
  console.log('Menghapus semua user dari database...');
  const deleteResult = await prisma.user.deleteMany();
  console.log(`✓ ${deleteResult.count} user dihapus`);
  
  // 3. Buat satu akun moderator admin
  console.log('Membuat akun moderator admin...');
  
  // Hash password sederhana '123'
  const hashedPassword = await bcrypt.hash('123', 10);
  
  // Buat user mod dengan status Admin
  const modUser = await prisma.user.create({
    data: {
      uname: 'mod',
      email: 'mod@homera.test',
      password: hashedPassword,
      status: 'Admin',
      ppict: 'profil/Default.JPG',
      location: 'Admin HQ',
      whatsapp: '+628123456789',
      instagram: 'mod',
      user_job: 'Administrator',
      user_desc: 'Site administrator account',
    }
  });
  
  console.log(`✓ Admin user created: ${modUser.uname} with ID ${modUser.uid}`);
  
  // 4. Buat 6 user status Post, masing-masing 1 portofolio lengkap
  console.log('Membuat 6 user designer (Post) dan portofolio...');
  const designerNames = ['designer_pro','architect_studio','furniture_maker','homestyle_expert','ecofriendly_design','classic_touch'];
  const designerUsers = [];
  const portfolios = [];
  const categories = ['Living','Bath','Bed','Kitchen','Terrace','Classic'];
  const placeholderImages = [
    'https://placehold.co/600x400?text=Living+Room+Design',
    'https://placehold.co/600x400?text=Bathroom+Design',
    'https://placehold.co/600x400?text=Bedroom+Design',
    'https://placehold.co/600x400?text=Kitchen+Design',
    'https://placehold.co/600x400?text=Terrace+Design',
    'https://placehold.co/600x400?text=Classic+Room+Design'
  ];
  const furnitureByCategory = {
    'Living': ['Sofa','Coffee Table','TV Cabinet'],
    'Bath': ['Sink Cabinet','Shower Box','Bath Tub'],
    'Bed': ['Bed Frame','Wardrobe','Bedside Table'],
    'Kitchen': ['Kitchen Set','Kitchen Island','Bar Stool'],
    'Terrace': ['Outdoor Sofa','Garden Table','Planter Box'],
    'Classic': ['Classic Chair','Classic Table','Classic Lamp']
  };
  for (let i = 0; i < 6; i++) {
    const uname = designerNames[i];
    const user = await prisma.user.create({
      data: {
        uname,
        email: uname+'@homera.test',
        password: hashedPassword,
        status: 'Post',
        ppict: 'profil/Default.JPG',
        location: 'Indonesia',
        whatsapp: '+62800000000'+i,
        instagram: uname,
        user_job: 'Designer',
        user_desc: 'Designer '+uname,
      }
    });
    designerUsers.push(user);
    const porto = await prisma.portofolio.create({
      data: {
        uid: user.uid,
        cover: placeholderImages[i],
        judul: categories[i]+' Design by '+uname,
        kategori: categories[i],
        description: `Professional ${categories[i].toLowerCase()} space design by ${uname}. Showcasing unique style and expertise.`,
      }
    });
    portfolios.push(porto);
    // Tambahkan furnitur
    const furnitures = furnitureByCategory[categories[i]] || [];
    for (let j = 0; j < furnitures.length; j++) {
      await prisma.furnitur.create({
        data: {
          porto_id: porto.porto_id,
          nama_furnitur: furnitures[j],
          foto_furnitur: `https://placehold.co/400x300?text=${furnitures[j].replace(/ /g, '+')}`,
          keterangan_furnitur: `${uname}'s custom ${furnitures[j].toLowerCase()} design. Premium quality and stylish.`,
          jumlah: j+1
        }
      });
    }
    // Tambahkan 1 komentar antar user (dummy)
    if (i > 0) {
      await prisma.comments.create({
        data: {
          pemberi_uid: designerUsers[i-1].uid,
          penerima_uid: user.uid,
          isi_komentar: `Keren banget portofolio kamu, ${uname}!`,
        }
      });
    }
  }
  console.log('✓ 6 designer user & portofolio lengkap dibuat');

  // 5. Buat 2 user status View
  console.log('Membuat 2 user status View...');
  for (let i = 1; i <= 2; i++) {
    await prisma.user.create({
      data: {
        uname: 'viewer'+i,
        email: `viewer${i}@homera.test`,
        password: hashedPassword,
        status: 'View',
        ppict: 'profil/Default.JPG',
        location: 'Indonesia',
        whatsapp: '+62899999999'+i,
        instagram: 'viewer'+i,
        user_job: 'User',
        user_desc: 'View-only user',
      }
    });
  }
  console.log('✓ 2 user view-only dibuat');

  console.log('✅ Database setup completed');
  return { modUser, designerUsers, portfolios };
}

main()
  .then((result) => {
    console.log(`Seeding selesai dengan satu admin user: ${result.modUser.uname} (ID: ${result.modUser.uid})`);
  })
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

