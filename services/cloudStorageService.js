/**
 * Google Cloud Storage Service
 * Module untuk integrasi penyimpanan file ke Google Cloud Storage
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../middleware/logger');

// Cache untuk Cloud Storage client
let _storage = null;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'homera-files';

/**
 * Inisialisasi Google Cloud Storage client
 * Menggunakan Service Account credentials dari environment variable
 */
function initStorageClient() {
  try {
    if (_storage) return _storage;

    // Credentials dari environment variable
    const credentials = process.env.GCS_CREDENTIALS;
    
    if (!credentials) {
      throw new Error('GCS_CREDENTIALS environment variable not set');
    }

    // Parse credentials JSON
    const parsedCredentials = JSON.parse(credentials);

    // Buat storage client dengan credentials
    _storage = new Storage({
      credentials: parsedCredentials
    });
    
    logger.info('Google Cloud Storage client initialized successfully');
    return _storage;
  } catch (error) {
    logger.error('Failed to initialize Google Cloud Storage client:', error);
    throw error;
  }
}

/**
 * Generate nama file yang unik
 * @param {string} originalname - Nama file asli
 * @param {string} fileType - Tipe file ('profil', 'portofolio', 'furnitur')
 * @returns {string} - Nama file unik
 */
function generateUniqueFilename(originalname, fileType = 'profil') {
  const timestamp = Date.now();
  const fileHash = crypto.randomBytes(8).toString('hex');
  const sanitizedName = path.parse(originalname).name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 50);
  
  const fileExt = path.extname(originalname).toLowerCase();
  
  return `${fileType}/${fileType}-${sanitizedName}-${timestamp}-${fileHash}${fileExt}`;
}

/**
 * Upload file ke Google Cloud Storage
 * @param {Object} file - File object dari multer (dengan buffer)
 * @param {string} fileType - Tipe file ('profil', 'portofolio', 'furnitur')
 * @returns {Promise<Object>} - Info file yang diupload termasuk public URL
 */
async function uploadFileToGCS(file, fileType = 'profil') {
  try {
    const storage = initStorageClient();
    const bucket = storage.bucket(BUCKET_NAME);
    
    // Generate filename yang unik dengan path sub-folder
    const filename = generateUniqueFilename(file.originalname, fileType);
    
    // Buat file baru di bucket
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
      predefinedAcl: 'publicRead' // Set file sebagai public
    });
    
    // Wrap buffer upload dalam Promise
    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        logger.error('Error uploading to GCS:', error);
        reject(error);
      });
      
      blobStream.on('finish', async () => {
        // Construct public URL for the file
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
        
        // Make sure file is publicly accessible
        try {
          await blob.makePublic();
        } catch (error) {
          logger.warn('Error making file public (it may already be public):', error.message);
        }
        
        logger.info(`File uploaded successfully to GCS: ${filename}`);
        
        resolve({
          filename: path.basename(filename),
          originalname: file.originalname,
          gcsPath: filename,
          contentType: file.mimetype,
          size: file.size,
          publicUrl: publicUrl,
          // Legacy path format untuk backward compatibility
          filePath: `/${fileType}/${path.basename(filename)}`
        });
      });
      
      // Write file buffer to GCS
      blobStream.end(file.buffer);
    });
  } catch (error) {
    logger.error('Error in uploadFileToGCS:', error);
    throw error;
  }
}

/**
 * Delete file dari Google Cloud Storage
 * @param {string} filename - Path file di GCS (relatif terhadap bucket)
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFileFromGCS(filename) {
  try {
    // Jika filename dimulai dengan '/', hapus
    if (filename.startsWith('/')) {
      filename = filename.substring(1);
    }
    
    // Jika filename berupa full URL, extract path-nya saja
    if (filename.startsWith('http')) {
      const url = new URL(filename);
      // Extract path setelah nama bucket
      const pathSegments = url.pathname.split('/');
      // Hapus segment pertama (kosong) dan kedua (nama bucket)
      pathSegments.splice(0, 2);
      filename = pathSegments.join('/');
    }
    
    const storage = initStorageClient();
    const bucket = storage.bucket(BUCKET_NAME);
    
    await bucket.file(filename).delete();
    logger.info(`File deleted successfully from GCS: ${filename}`);
    return true;
  } catch (error) {
    logger.error('Error deleting file from GCS:', error);
    // Jika file tidak ditemukan (404), anggap berhasil dihapus
    if (error.code === 404) {
      logger.warn(`File not found in GCS (already deleted): ${filename}`);
      return true;
    }
    throw error;
  }
}

/**
 * Get signed URL untuk akses temporary ke file private
 * @param {string} filename - Path file di GCS
 * @param {number} expiresInMinutes - Durasi URL valid dalam menit
 * @returns {Promise<string>} - Signed URL
 */
async function getSignedUrl(filename, expiresInMinutes = 15) {
  try {
    const storage = initStorageClient();
    const bucket = storage.bucket(BUCKET_NAME);
    
    // Remove leading slash if present
    if (filename.startsWith('/')) {
      filename = filename.substring(1);
    }
    
    // Configure options for signed URL
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000
    };
    
    // Generate signed URL
    const [url] = await bucket.file(filename).getSignedUrl(options);
    return url;
  } catch (error) {
    logger.error('Error generating signed URL:', error);
    throw error;
  }
}

module.exports = {
  uploadFileToGCS,
  deleteFileFromGCS,
  getSignedUrl,
  generateUniqueFilename
};
