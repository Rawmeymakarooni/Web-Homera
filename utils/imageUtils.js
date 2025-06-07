/**
 * Utilitas untuk menangani format gambar dan URL
 */
const path = require('path');
const { logger } = require('../middleware/logger');

// Deteksi environment
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Format URL gambar berdasarkan environment
 * @param {string} imagePath - Path gambar (relatif atau URL Cloudinary)
 * @param {string} type - Tipe gambar (profil, portofolio, furnitur)
 * @returns {string} - URL gambar yang diformat
 */
function formatImageUrl(imagePath, type = 'profil') {
  if (!imagePath) {
    // Jika tidak ada gambar, gunakan Default.JPG sesuai tipe
    return formatDefaultImage(type);
  }
  
  // Jika di production dan path berisi cloudinary URL, gunakan apa adanya
  if (isProduction && (imagePath.includes('cloudinary.com') || imagePath.includes('res.cloudinary.com'))) {
    return imagePath;
  }
  
  // Jika di production dan path tidak berisi cloudinary URL, tambahkan prefix cloudinary
  if (isProduction && !imagePath.includes('cloudinary.com')) {
    // Untuk Default.JPG, gunakan URL Cloudinary yang sudah diupload
    if (imagePath === 'profil/Default.JPG') {
      return 'https://res.cloudinary.com/dqpnrqvzi/image/upload/v1686138329/homera/profil/Default.jpg';
    }
    
    // Untuk gambar lain, format URL sesuai konvensi Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dqpnrqvzi';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${imagePath}`;
  }
  
  // Jika di development, gunakan BASE_URL + path
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/${imagePath}`;
}

/**
 * Mendapatkan URL gambar default berdasarkan tipe
 * @param {string} type - Tipe gambar (profil, portofolio, furnitur)
 * @returns {string} - URL gambar default
 */
function formatDefaultImage(type = 'profil') {
  if (isProduction) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dqpnrqvzi';
    
    // URL default untuk setiap tipe gambar di Cloudinary
    const defaultImages = {
      profil: 'https://res.cloudinary.com/dqpnrqvzi/image/upload/v1686138329/homera/profil/Default.jpg',
      portofolio: 'https://res.cloudinary.com/dqpnrqvzi/image/upload/v1686138329/homera/portofolio/Default.jpg',
      furnitur: 'https://res.cloudinary.com/dqpnrqvzi/image/upload/v1686138329/homera/furnitur/Default.jpg'
    };
    
    return defaultImages[type] || defaultImages.profil;
  } else {
    // Di development, gunakan file lokal
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/${type}/Default.JPG`;
  }
}

/**
 * Memeriksa apakah URL gambar adalah default
 * @param {string} imageUrl - URL gambar untuk diperiksa
 * @returns {boolean} - true jika gambar adalah default
 */
function isDefaultImage(imageUrl) {
  if (!imageUrl) return true;
  
  return imageUrl.includes('Default.JPG') || 
         imageUrl.includes('Default.jpg') || 
         imageUrl.includes('default.jpg') ||
         imageUrl.includes('/Default');
}

/**
 * Mengkonversi URL gambar dari format lama ke format baru
 * @param {string} imageUrl - URL gambar untuk dikonversi
 * @param {string} type - Tipe gambar (profil, portofolio, furnitur)
 * @returns {string} - URL gambar yang dikonversi
 */
function convertLegacyImageUrl(imageUrl, type = 'profil') {
  if (!imageUrl) return formatDefaultImage(type);
  
  // Jika sudah dalam format Cloudinary, kembalikan apa adanya
  if (imageUrl.includes('cloudinary.com')) return imageUrl;
  
  // Jika format lama (path relatif), konversi ke format baru
  return formatImageUrl(imageUrl, type);
}

module.exports = {
  formatImageUrl,
  formatDefaultImage,
  isDefaultImage,
  convertLegacyImageUrl
};
