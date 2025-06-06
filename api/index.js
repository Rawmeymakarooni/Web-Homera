/**
 * API HOMERA - Main Application Entry Point
 * Express server dengan middleware keamanan dan best practices
 * (Dipindahkan ke /api agar kompatibel dengan Vercel)
 */

// Semua path relatif perlu diubah satu tingkat ke atas
const path = require('path');

// Patch __dirname agar tetap menunjuk ke root Backend
const appRoot = path.join(__dirname, '..');
process.chdir(appRoot);

// Setelah patch, require file utama
module.exports = require(path.join(appRoot, 'index.js'));
