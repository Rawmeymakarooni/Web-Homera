const express = require('express');
const app = express();
const userRoute = require('./routes/userroute');
const path = require('path');
const cors = require('cors');
const errorHandler = require('./middleware/error-handler');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(errorHandler);

// Akses gambar profil
app.use('/profil', express.static(path.join(__dirname, 'prisma', 'profil')));

// Rute user
app.use('/', userRoute);

// Rute request status (request jadi poster)
const requestStatusRoute = require('./routes/requeststatusroute');
app.use('/', requestStatusRoute);

// Penanganan 404
app.use((req, res, next) => {
  next(createError(404, 'Rute tidak ditemukan'));
});

// Penanganan error handler global
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message || 'Terjadi kesalahan pada server'
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
