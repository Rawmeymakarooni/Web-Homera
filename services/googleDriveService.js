/**
 * Google Drive Service
 * Modul untuk integrasi penyimpanan file ke Google Drive
 */

const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');
const { logger } = require('../middleware/logger');

// Cache untuk menyimpan Drive client
let _driveClient = null;

/**
 * Inisialisasi Google Drive client
 * Menggunakan Service Account kredensial atau OAuth2 untuk autentikasi
 */
function initDriveClient() {
  try {
    if (_driveClient) return _driveClient;

    // Cek jika credentials ada di environment variables
    const credentials = process.env.GOOGLE_DRIVE_CREDENTIALS;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!credentials) {
      throw new Error('GOOGLE_DRIVE_CREDENTIALS environment variable not set');
    }

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable not set');
    }

    // Parse credentials JSON
    const parsedCredentials = JSON.parse(credentials);

    // Setup authentication dengan service account
    const auth = new google.auth.GoogleAuth({
      credentials: parsedCredentials,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    // Buat drive client
    _driveClient = google.drive({ version: 'v3', auth });
    logger.info('Google Drive client initialized successfully');

    return _driveClient;
  } catch (error) {
    logger.error('Failed to initialize Google Drive client:', error);
    throw error;
  }
}

/**
 * Upload file ke Google Drive
 * @param {Object} file - File object dari multer (dengan buffer)
 * @param {string} fileType - Tipe file ('profil', 'portofolio', 'furnitur')
 * @returns {Promise<Object>} - Info file yang diupload termasuk public URL
 */
async function uploadFileToDrive(file, fileType = 'profil') {
  try {
    const drive = initDriveClient();
    
    // Generate filename yang unik
    const timestamp = Date.now();
    const fileHash = Math.random().toString(36).substring(2, 8);
    const sanitizedName = path.parse(file.originalname).name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 50);
    
    const fileName = `${fileType}-${sanitizedName}-${timestamp}-${fileHash}${path.extname(file.originalname)}`;

    // Buat readable stream dari buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);
    
    // Tentukan parent folder berdasarkan tipe file
    let folderId;
    switch (fileType) {
      case 'portofolio':
        folderId = process.env.GOOGLE_DRIVE_PORTOFOLIO_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
        break;
      case 'furnitur':
        folderId = process.env.GOOGLE_DRIVE_FURNITUR_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
        break;
      case 'profil':
      default:
        folderId = process.env.GOOGLE_DRIVE_PROFIL_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
        break;
    }
    
    // Metadata file
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };
    
    // Media metadata
    const media = {
      mimeType: file.mimetype,
      body: bufferStream
    };
    
    // Upload file
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,name,mimeType,webContentLink,webViewLink'
    });
    
    // Make file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    // Get updated file with public URLs
    const publicFile = await drive.files.get({
      fileId: response.data.id,
      fields: 'webContentLink,webViewLink'
    });
    
    // Construct direct download URL 
    const directUrl = `https://drive.google.com/uc?export=view&id=${response.data.id}`;
    
    logger.info(`File uploaded successfully to Google Drive: ${fileName}`);
    
    return {
      id: response.data.id,
      name: response.data.name,
      mimeType: response.data.mimeType,
      webContentLink: publicFile.data.webContentLink,
      webViewLink: publicFile.data.webViewLink,
      directUrl: directUrl,
      // File path format used in previous local storage implementation
      // for backward compatibility
      filePath: `/${fileType}/${fileName}`
    };
  } catch (error) {
    logger.error('Error uploading file to Google Drive:', error);
    throw error;
  }
}

/**
 * Get file info dari Google Drive by ID
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Object>} - Info file
 */
async function getFileInfo(fileId) {
  try {
    const drive = initDriveClient();
    
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,webContentLink,webViewLink'
    });
    
    return {
      ...response.data,
      directUrl: `https://drive.google.com/uc?export=view&id=${response.data.id}`
    };
  } catch (error) {
    logger.error('Error getting file info from Google Drive:', error);
    throw error;
  }
}

/**
 * Delete file dari Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFile(fileId) {
  try {
    const drive = initDriveClient();
    
    await drive.files.delete({
      fileId: fileId
    });
    
    logger.info(`File deleted successfully from Google Drive: ${fileId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting file from Google Drive:', error);
    throw error;
  }
}

module.exports = {
  uploadFileToDrive,
  getFileInfo,
  deleteFile
};
