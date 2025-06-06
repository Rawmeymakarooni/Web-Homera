// Prisma seed script: Membuat portofolio yang terhubung dengan user baru
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Definisi kategori dan gambar ilustrasi
const categories = ["Living", "Bath", "Bed", "Kitchen", "Terrace", "Pool"];
const placeholderImages = [
  "https://placehold.co/600x400?text=Living+Room+Design",
  "https://placehold.co/600x400?text=Bathroom+Design",
  "https://placehold.co/600x400?text=Bedroom+Design",
  "https://placehold.co/600x400?text=Kitchen+Design",
  "https://placehold.co/600x400?text=Terrace+Design",
  "https://placehold.co/600x400?text=Pool+Design"
];

// Daftar nama furnitur untuk setiap kategori
const furnitureByCategory = {
  "Living": ["Sofa", "Coffee Table", "TV Cabinet", "Bookshelf", "Armchair"],
  "Bath": ["Sink Cabinet", "Shower Box", "Bath Tub", "Towel Rack", "Mirror Cabinet"],
  "Bed": ["Bed Frame", "Wardrobe", "Bedside Table", "Dresser", "Study Desk"],
  "Kitchen": ["Kitchen Set", "Kitchen Island", "Bar Stool", "Pantry Cabinet", "Dining Table"],
  "Terrace": ["Outdoor Sofa", "Garden Table", "Planter Box", "Deck Chair", "Parasol"],
  "Pool": ["Sun Lounger", "Pool Bar", "Gazebo", "Cabana", "Outdoor Dining Set"]
};

async function main() {
  console.log('🚀 Memulai proses seeding portofolio...');
  
  // 1. Hapus semua portofolio yang ada
  console.log('Membersihkan portofolio lama...');
  await prisma.portofolio.deleteMany({});
  
  // 2. Ambil semua user aktif dengan status Post
  const activeUsers = await prisma.user.findMany({
    where: { 
      status: 'Post',
      isdelete: false,
      pending_delete_until: null
    },
    select: { uid: true, uname: true }
  });
  
  console.log(`Ditemukan ${activeUsers.length} user aktif dengan status Post`);
  
  if (activeUsers.length === 0) {
    throw new Error('Tidak ada user dengan status Post untuk diberi portofolio!');
  }
  
  // 3. Buat portofolio untuk setiap user dengan data yang konsisten
  const createdPortfolios = [];
  
  for (const user of activeUsers) {
    // Setiap user mendapat portofolio dengan kategori berbeda (2-3 portofolio per user)
    const userCategories = [...categories].sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 2) + 2);
    
    for (const category of userCategories) {
      const portfolioData = {
        uid: user.uid,
        cover: placeholderImages[categories.indexOf(category)],
        judul: `${category} Design - by ${user.uname}`,
        kategori: category,
        description: `Professional ${category.toLowerCase()} space design with modern approach. Created by ${user.uname}.`,
      };
      
      // Buat portofolio
      const newPortfolio = await prisma.portofolio.create({
        data: portfolioData
      });
      
      console.log(`Portofolio created: "${newPortfolio.judul}" (ID: ${newPortfolio.porto_id}) for user ${user.uname}`);
      createdPortfolios.push(newPortfolio);
      
      // Tambahkan 3-5 furnitur untuk setiap portofolio
      const furnitureItems = furnitureByCategory[category] || [];
      const furnitureCount = Math.floor(Math.random() * 3) + 3; // 3-5 furnitur
      
      for (let i = 0; i < Math.min(furnitureCount, furnitureItems.length); i++) {
        const furnitureData = {
          porto_id: newPortfolio.porto_id,
          nama_furnitur: furnitureItems[i],
          foto_furnitur: `https://placehold.co/400x300?text=${furnitureItems[i].replace(/ /g, '+')}`,
          keterangan_furnitur: `Custom ${furnitureItems[i].toLowerCase()} with premium materials and modern design.`,
          jumlah: Math.floor(Math.random() * 3) + 1 // 1-3 items
        };
        
        await prisma.furnitur.create({
          data: furnitureData
        });
      }
      
      console.log(`Added ${furnitureCount} furniture items to portofolio ID ${newPortfolio.porto_id}`);
    }
  }
  
  console.log('✅ Portofolio seed completed successfully');
  console.log(`Total portofolio created: ${createdPortfolios.length}`);
}

main()
  .catch((e) => { 
    console.error('Error seeding portofolio:', e); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });

