const { execSync } = require('child_process');

// Fungsi untuk menjalankan perintah dengan output
function runCommand(command) {
  console.log(`Running command: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Command failed: ${command}`, error);
    process.exit(1);
  }
}

// Pastikan Prisma client di-generate
console.log('🚀 Building Prisma client for Vercel deployment...');
runCommand('npx prisma generate');

console.log('✅ Build completed successfully');
