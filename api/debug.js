/**
 * Debug endpoint untuk Vercel
 * Membantu mendiagnosis masalah di lingkungan Vercel
 */
const express = require('express');
const app = express();

// Informasi environment
app.get('/api/debug', (req, res) => {
  // Kumpulkan informasi diagnostik
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    env: {
      // Hanya tampilkan nama environment variables (bukan nilainya)
      // untuk keamanan
      variables: Object.keys(process.env).filter(key => 
        !key.toLowerCase().includes('secret') && 
        !key.toLowerCase().includes('password') &&
        !key.toLowerCase().includes('token') &&
        !key.toLowerCase().includes('key')
      ),
      // Cek apakah environment variables penting ada (tanpa menampilkan nilainya)
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasBaseUrl: !!process.env.BASE_URL
    },
    headers: req.headers,
    vercel: {
      region: process.env.VERCEL_REGION || 'unknown',
      environment: process.env.VERCEL_ENV || 'unknown'
    }
  };

  res.json(diagnostics);
});

// Export untuk Vercel
module.exports = app;
