// Script untuk membuat 5 user dengan ID mulai dari 2 dan portofolio untuk masing-masing
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Definisi kategori dan gambar ilustrasi
const categories = ["Living", "Bath", "Bed", "Kitchen", "Terrace"];
const placeholderImages = [
  "https://placehold.co/600x400?text=Living+Room+Design",
  "https://placehold.co/600x400?text=Bathroom+Design",
  "https://placehold.co/600x400?text=Bedroom+Design",
  "https://placehold.co/600x400?text=Kitchen+Design",
  "https://placehold.co/600x400?text=Terrace+Design"
];

// Daftar nama furnitur untuk setiap kategori
const furnitureByCategory = {
  "Living": ["Sofa", "Coffee Table", "TV Cabinet"],
  "Bath": ["Sink Cabinet", "Shower Box", "Bath Tub"],
  "Bed": ["Bed Frame", "Wardrobe", "Bedside Table"],
  "Kitchen": ["Kitchen Set", "Kitchen Island", "Bar Stool"],
  "Terrace": ["Outdoor Sofa", "Garden Table", "Planter Box"]
};

async function main() {
  console.log('🚀 Membuat 5 user dan portofolio...');
  
  // Hash password sederhana '123'
  const hashedPassword = await bcrypt.hash('123', 10);
  
  // Definisi 5 user designer dengan status Post
  const usersData = [
    {
      uname: 'designer_pro',
      email: 'designer@homera.test',
      password: hashedPassword,
      status: 'Post',
      ppict: 'profil/Default.JPG',
      location: 'Jakarta, Indonesia',
      whatsapp: '+62812345678',
      instagram: 'designer_pro',
      user_job: 'Interior Designer',
      user_desc: 'Professional interior designer with 5+ years experience',
    },
    {
      uname: 'architect_studio',
      email: 'architect@homera.test',
      password: hashedPassword,
      status: 'Post',
      ppict: 'profil/Default.JPG',
      location: 'Bandung, Indonesia',
      whatsapp: '+62823456789',
      instagram: 'architect_studio',
      user_job: 'Architect',
      user_desc: 'Modern architecture with sustainable approach',
    },
    {
      uname: 'furniture_maker',
      email: 'furniture@homera.test',
      password: hashedPassword,
      status: 'Post',
      ppict: 'profil/Default.JPG',
      location: 'Surabaya, Indonesia',
      whatsapp: '+62834567890',
      instagram: 'furniture_maker',
      user_job: 'Furniture Craftsman',
      user_desc: 'Custom furniture with traditional techniques and modern design',
    },
    {
      uname: 'homestyle_expert',
      email: 'homestyle@homera.test',
      password: hashedPassword,
      status: 'Post',
      ppict: 'profil/Default.JPG',
      location: 'Yogyakarta, Indonesia',
      whatsapp: '+62845678901',
      instagram: 'homestyle_expert',
      user_job: 'Home Stylist',
      user_desc: 'Transform your space with creative styling solutions',
    },
    {
      uname: 'ecofriendly_design',
      email: 'eco@homera.test',
      password: hashedPassword,
      status: 'Post',
      ppict: 'profil/Default.JPG',
      location: 'Bali, Indonesia',
      whatsapp: '+62856789012',
      instagram: 'ecofriendly_design',
      user_job: 'Sustainable Designer',
      user_desc: 'Eco-friendly design solutions for modern living',
    }
  ];
  
  // Buat user satu per satu
  const createdUsers = [];
  
  for (const userData of usersData) {
    const newUser = await prisma.user.create({ data: userData });
    console.log(`User created: ${newUser.uname} with ID ${newUser.uid}`);
    createdUsers.push(newUser);
  }
  
  console.log('\n✓ Berhasil membuat 5 user dengan status Post');
  
  // Buat portofolio untuk masing-masing user (1 portofolio per user)
  const createdPortfolios = [];
  
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    const category = categories[i];
    
    const portfolioData = {
      uid: user.uid,
      cover: placeholderImages[i],
      judul: `${category} Design by ${user.uname}`,
      kategori: category,
      description: `Professional ${category.toLowerCase()} space design by ${user.uname}. Showcasing unique style and expertise.`,
    };
    
    // Buat portofolio
    const newPortfolio = await prisma.portofolio.create({
      data: portfolioData
    });
    
    console.log(`Portofolio created: "${newPortfolio.judul}" (ID: ${newPortfolio.porto_id}) for user ${user.uname}`);
    createdPortfolios.push(newPortfolio);
    
    // Tambahkan 3 furnitur untuk portofolio
    const furnitureItems = furnitureByCategory[category] || [];
    
    for (let j = 0; j < furnitureItems.length; j++) {
      const furnitureData = {
        porto_id: newPortfolio.porto_id,
        nama_furnitur: furnitureItems[j],
        foto_furnitur: `https://placehold.co/400x300?text=${furnitureItems[j].replace(/ /g, '+')}`,
        keterangan_furnitur: `${user.uname}'s custom ${furnitureItems[j].toLowerCase()} design. Premium quality and stylish.`,
        jumlah: j + 1 // 1-3 items
      };
      
      const newFurniture = await prisma.furnitur.create({
        data: furnitureData
      });
      
      console.log(`  - Added furniture: ${newFurniture.nama_furnitur}`);
    }
  }
  
  console.log('\n✅ User dan portofolio dibuat dengan sukses');
  console.log(`Total user dibuat: ${createdUsers.length}`);
  console.log(`Total portofolio dibuat: ${createdPortfolios.length}`);
  
  // Tampilkan ringkasan
  console.log('\n===== RINGKASAN DATA =====');
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    const porto = createdPortfolios[i];
    console.log(`[${i+1}] User: ${user.uname} (ID: ${user.uid}) - Portofolio: "${porto.judul}" (ID: ${porto.porto_id})`);
  }
  
  return { createdUsers, createdPortfolios };
}

main()
  .catch((e) => { 
    console.error('Error seeding data:', e); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });
