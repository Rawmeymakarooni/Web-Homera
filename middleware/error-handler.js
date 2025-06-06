const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let userFriendlyMessage = message;

  // Mengubah pesan teknis menjadi pesan yang lebih ramah pengguna
  if (statusCode === 400) {
    userFriendlyMessage = 'Permintaan tidak valid. Mohon periksa data yang Anda masukkan.';
  } else if (statusCode === 401) {
    userFriendlyMessage = 'Anda tidak memiliki akses. Silakan login terlebih dahulu.';
  } else if (statusCode === 403) {
    userFriendlyMessage = 'Anda tidak memiliki izin untuk mengakses fitur ini.';
  } else if (statusCode === 404) {
    userFriendlyMessage = 'Data atau halaman yang Anda cari tidak ditemukan.';
  } else if (statusCode === 409) {
    userFriendlyMessage = 'Terjadi konflik data. Data yang Anda masukkan mungkin sudah ada.';
  } else if (statusCode === 422) {
    userFriendlyMessage = 'Data yang Anda masukkan tidak valid. Mohon periksa kembali.';
  } else if (statusCode >= 500) {
    userFriendlyMessage = 'Terjadi kesalahan pada server. Tim kami sedang mengatasi masalah ini.';
  }

  // Pesan khusus untuk error umum
  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    userFriendlyMessage = 'Data yang Anda masukkan sudah terdaftar. Silakan gunakan data lain.';
  } else if (message.includes('validation failed')) {
    userFriendlyMessage = 'Validasi data gagal. Pastikan format data sudah benar.';
  } else if (message.includes('jwt') || message.includes('token')) {
    userFriendlyMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
  }

  // Format respons error yang konsisten
  return res.status(statusCode).json({
    success: false,
    message: userFriendlyMessage,
    technicalMessage: process.env.NODE_ENV === 'development' ? message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
