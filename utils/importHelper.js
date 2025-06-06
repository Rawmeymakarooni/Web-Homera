/**
 * Import Helper
 * 
 * Helper untuk mengatasi masalah "Cannot find module" di Vercel Serverless
 * dengan mencoba beberapa path alternatif
 */

const path = require('path');
const fs = require('fs');

/**
 * Mencoba import module dengan berbagai path
 * @param {string} modulePath - Path relatif ke module (e.g. '../dao/userdao')
 * @param {Object} fallback - Optional fallback jika module tidak ditemukan
 * @returns {Object} - Module yang diimport atau fallback
 */
function tryImport(modulePath, fallback = null) {
  const originalPath = modulePath;
  let module = null;
  const possiblePaths = [
    modulePath, // path asli
    path.join(process.cwd(), modulePath.replace(/^\.\.?\//, '')), // absolute path dari cwd
    modulePath.toLowerCase(), // lowercase path
    modulePath.toUpperCase(), // uppercase path
    modulePath.replace('dao', 'DAO'), // coba dao → DAO
    modulePath.replace('DAO', 'dao') // coba DAO → dao
  ];

  // Log untuk debug
  console.log(`Trying to import: ${originalPath}`);
  
  // Try each path
  for (const attemptPath of possiblePaths) {
    try {
      if (attemptPath.includes('node_modules')) continue; // skip node_modules
      
      // Coba import dari path alternatif
      module = require(attemptPath);
      console.log(`Successfully imported: ${attemptPath}`);
      return module;
    } catch (error) {
      // Skip logging untuk path yang tidak ditemukan
      if (error.code !== 'MODULE_NOT_FOUND') {
        console.error(`Error importing ${attemptPath}:`, error.message);
      }
    }
  }
  
  // Jika semua gagal dan ada fallback, gunakan fallback
  if (fallback) {
    console.warn(`Using fallback for: ${originalPath}`);
    return fallback;
  }
  
  // Jika tidak ada fallback, throw error
  throw new Error(`Cannot import module: ${originalPath}`);
}

module.exports = { tryImport };
