/**
 * Cloudinary Service
 * Module untuk integrasi penyimpanan file ke Cloudinary
 * 100% gratis tanpa memerlukan kartu kredit (25GB storage)
 */

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const { logger } = require('../middleware/logger');

/**
 * Inisialisasi konfigurasi Cloudinary
 */
function initCloudinary() {
  try {
    // Konfigurasi dari environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    logger.info('Cloudinary initialized successfully');
    return cloudinary;
  } catch (error) {
    logger.error('Failed to initialize Cloudinary:', error);
    throw error;
  }
}

/**
 * Mendapatkan Cloudinary storage untuk multer
 * @param {string} folderPath - Path folder di Cloudinary
 * @returns {CloudinaryStorage} - Storage engine untuk multer
 */
function getCloudinaryStorage(folderPath = 'homera') {
  try {
    // Pastikan Cloudinary sudah diinisialisasi
    initCloudinary();

    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: folderPath,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ quality: 'auto' }]
      }
    });
  } catch (error) {
    logger.error('Error creating Cloudinary storage:', error);
    throw error;
  }
}

/**
 * Upload file ke Cloudinary
 * @param {Object} file - File object dari multer (buffer)
 * @param {string} fileType - Tipe folder ('profil', 'portofolio', 'furnitur')
 * @returns {Promise<Object>} - Info file yang diupload termasuk public URL
 */
async function uploadToCloudinary(file, fileType = 'profil') {
  try {
    // Pastikan Cloudinary terinisialisasi
    initCloudinary();

    // Generate public_id unik (nama file)
    const timestamp = Date.now();
    const fileHash = Math.random().toString(36).substring(2, 8);
    const sanitizedName = path.parse(file.originalname).name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 50);
    
    const publicId = `homera/${fileType}/${fileType}-${sanitizedName}-${timestamp}-${fileHash}`;
    
    // Wrap upload dalam Promise
    return new Promise((resolve, reject) => {
      // Upload stream dari buffer
      const uploadOptions = {
        folder: `homera/${fileType}`,
        public_id: sanitizedName,
        resource_type: 'auto',
        tags: [`homera`, fileType]
      };
      
      // Special options berdasarkan tipe file
      if (fileType === 'profil') {
        uploadOptions.transformation = [
          { width: 200, height: 200, crop: 'fill', gravity: 'face', format: 'jpg', quality: 'auto' }
        ];
      } else if (fileType === 'portofolio') {
        uploadOptions.transformation = [
          { width: 800, height: 600, crop: 'fill', format: 'jpg', quality: 'auto' }
        ];
      } else {
        // Default transformation untuk semua tipe file lainnya
        uploadOptions.transformation = [
          { format: 'jpg', quality: 'auto' }
        ];
      }
      
      // Selalu konversi ke JPG
      uploadOptions.format = 'jpg';
      
      // Upload dari buffer
      cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          logger.error('Error uploading to Cloudinary:', error);
          return reject(error);
        }
        
        logger.info(`File uploaded successfully to Cloudinary: ${result.public_id}`);
        
        return resolve({
          publicId: result.public_id,
          originalname: file.originalname,
          filename: path.basename(result.secure_url),
          format: result.format,
          resourceType: result.resource_type,
          size: result.bytes,
          url: result.secure_url,
          // Legacy path untuk backward compatibility
          filePath: `/${fileType}/${path.basename(result.secure_url)}`
        });
      }).end(file.buffer);
    });
  } catch (error) {
    logger.error('Error in uploadToCloudinary:', error);
    throw error;
  }
}

/**
 * Delete file dari Cloudinary
 * @param {string} publicId - Public ID (atau URL) file di Cloudinary
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFromCloudinary(publicId) {
  try {
    // Jika input adalah URL, ekstrak public ID
    if (publicId.startsWith('http')) {
      // Extract public ID dari URL
      const urlParts = publicId.split('/');
      const filenameWithExt = urlParts[urlParts.length - 1];
      const filename = filenameWithExt.split('.')[0];
      
      // Format folder/filename
      const folderPath = urlParts[urlParts.length - 2];
      publicId = `${folderPath}/${filename}`;
    }
    
    // Pastikan Cloudinary terinisialisasi
    initCloudinary();
    
    // Delete file
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`File deleted successfully from Cloudinary: ${publicId}`);
    
    return result.result === 'ok';
  } catch (error) {
    logger.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
}

module.exports = {
  cloudinary,
  getCloudinaryStorage,
  uploadToCloudinary,
  deleteFromCloudinary,
  initCloudinary
};
