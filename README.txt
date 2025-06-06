# API HOMERA - Dokumentasi Lengkap (Update 2025-06-06)

## INFORMASI UMUM

### Lingkungan
- Node.js: v18.x atau lebih tinggi
- Database: PostgreSQL (melalui Prisma ORM)
- Port Default: 3000

### Format Response API
Semua API mengembalikan response dalam format konsisten:

```json
{
  "status": "success" | "error",
  "statusCode": 200 | 400 | 401 | 403 | 404 | 500,
  "data": { ... } | null,
  "message": "Pesan sukses atau error"
}
```

### Autentikasi
- Menggunakan JWT (JSON Web Token)
- Token dikirim melalui header `Authorization: Bearer <token>`
- Masa aktif token: 10 jam (default)
- Refresh token tersedia untuk perpanjangan sesi

### Level Akses
- **View**: Hanya dapat melihat konten (default untuk user baru)
- **Post**: Dapat membuat dan mengelola portofolio
- **Admin**: Akses penuh ke semua fitur dan moderasi

## ENDPOINT AUTENTIKASI

### Register User
- **Method:** POST
- **URL:** `/register`
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `uname`: Username (wajib)
  - `email`: Email (wajib)
  - `password`: Password (wajib)
  - `ppict`: File gambar profil (opsional)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "uid": "123",
    "uname": "username",
    "email": "user@example.com",
    "status": "View"
  },
  "message": "Registrasi berhasil"
}
```

### Login User
- **Method:** POST
- **URL:** `/login`
- **Content-Type:** `application/json`
- **Body:**
  - `email`: Email (wajib)
  - `password`: Password (wajib)
  - `keepLoggedIn`: Boolean (opsional, default: false)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uid": "123",
      "uname": "username",
      "email": "user@example.com",
      "status": "View"
    }
  },
  "message": "Login berhasil"
}
```

### Refresh Token
- **Method:** POST
- **URL:** `/refresh-token`
- **Content-Type:** `application/json`
- **Body:**
  - `refreshToken`: Token refresh yang didapat saat login (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uid": "123",
      "uname": "username",
      "status": "View"
    }
  },
  "message": "Token berhasil diperbarui"
}
```

### Logout
- **Method:** POST
- **URL:** `/logout`
- **Content-Type:** `application/json`
- **Authorization:** Bearer Token
- **Body:**
  - `refreshToken`: Token refresh yang didapat saat login (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": null,
  "message": "Logout berhasil"
}
```

### Login dengan Google
- **Method:** POST
- **URL:** `/user/login-google`
- **Content-Type:** `application/json`
- **Body:**
  - `token`: Google OAuth token (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uid": "123",
      "uname": "username",
      "email": "user@example.com",
      "status": "View"
    }
  },
  "message": "Login Google berhasil"
}
```

## ENDPOINT PROFIL PENGGUNA

### Mendapatkan Profil Pengguna
- **Method:** GET
- **URL:** `/profile`
- **Authorization:** Bearer Token (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "uid": "123",
    "uname": "username",
    "email": "user@example.com",
    "ppict": "http://localhost:3000/profil/user123.jpg",
    "user_desc": "Deskripsi profil pengguna",
    "user_job": "Interior Designer",
    "instagram": "@username",
    "whatsapp": "081234567890",
    "location": "Jakarta, Indonesia",
    "status": "View",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "message": "Profil berhasil diambil"
}
```

### Mendapatkan Foto Profil
- **Method:** GET
- **URL:** `/profile-picture`
- **Authorization:** Bearer Token (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "ppict": "http://localhost:3000/profil/user123.jpg"
  },
  "message": "Foto profil berhasil diambil"
}
```

### Mengupdate Profil Pengguna
- **Method:** PUT
- **URL:** `/profile`
- **Content-Type:** `multipart/form-data`
- **Authorization:** Bearer Token (wajib)
- **Body:**
  - `uname`: Username (opsional)
  - `user_desc`: Deskripsi profil (opsional)
  - `user_job`: Pekerjaan (opsional)
  - `instagram`: Username Instagram (opsional)
  - `whatsapp`: Nomor WhatsApp (opsional)
  - `location`: Lokasi (opsional)
  - `ppict`: File gambar profil (opsional)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "uid": "123",
    "uname": "username",
    "email": "user@example.com",
    "ppict": "http://localhost:3000/profil/user123.jpg",
    "user_desc": "Deskripsi profil pengguna",
    "user_job": "Interior Designer",
    "instagram": "@username",
    "whatsapp": "081234567890",
    "location": "Jakarta, Indonesia",
    "status": "View"
  },
  "message": "Profil berhasil diupdate"
}
```

### Mengupdate Foto Profil
- **Method:** POST
- **URL:** `/user/profile-image`
- **Content-Type:** `multipart/form-data`
- **Authorization:** Bearer Token (wajib)
- **Body:**
  - `ppict`: File gambar profil (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "ppict": "http://localhost:3000/profil/user123.jpg"
  },
  "message": "Foto profil berhasil diupdate"
}
```

### Mengubah Password
- **Method:** POST
- **URL:** `/change-password`
- **Content-Type:** `application/json`
- **Authorization:** Bearer Token (wajib)
- **Body:**
  - `oldPassword`: Password lama (wajib)
  - `newPassword`: Password baru (wajib)
  - `confirmPassword`: Konfirmasi password baru (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": null,
  "message": "Password berhasil diubah"
}
```

### Menghapus Akun Sendiri
- **Method:** DELETE
- **URL:** `/profile`
- **Content-Type:** `application/json`
- **Authorization:** Bearer Token (wajib)
- **Body:**
  - `email`: Email (wajib)
  - `password`: Password (wajib)
  - `confirmPassword`: Konfirmasi password (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": null,
  "message": "Akun berhasil dihapus (pending 7 hari)"
}
```

## ENDPOINT PORTOFOLIO

### Mendapatkan Semua Portofolio
- **Method:** GET
- **URL:** `/portofolio` atau `/porto`
- **Authorization:** Tidak wajib
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [
    {
      "porto_id": "1",
      "uid": "123",
      "judul": "Interior Rumah Minimalis",
      "cover": "http://localhost:3000/portofolio/cover1.jpg",
      "kategori": "Living Room",
      "deskripsi": "Desain interior minimalis modern untuk ruang tamu",
      "created_at": "2025-01-01T00:00:00.000Z",
      "user": {
        "uname": "username",
        "ppict": "http://localhost:3000/profil/user123.jpg"
      }
    }
  ],
  "message": "Portofolio berhasil diambil"
}
```

### Mendapatkan Portofolio Berdasarkan Kategori
- **Method:** GET
- **URL:** `/portofolio/category/:category` atau `/porto/category/:category`
- **Authorization:** Tidak wajib
- **Parameter URL:**
  - `category`: Kategori portofolio (contoh: "Living Room", "Kitchen", "Bedroom", atau "all" untuk semua kategori)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [...],
  "message": "Portofolio berhasil diambil"
}
```

### Mendapatkan Portofolio untuk Halaman Explore
- **Method:** GET
- **URL:** `/portofolio/explore/:category` atau `/porto/explore/:category`
- **Authorization:** Tidak wajib
- **Parameter URL:**
  - `category`: Kategori portofolio (contoh: "Living Room", "Kitchen", "Bedroom", atau "all" untuk semua kategori)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [...],
  "message": "Portofolio berhasil diambil"
}
```

### Mendapatkan Portofolio untuk Halaman Home
- **Method:** GET
- **URL:** `/home-portos`
- **Authorization:** Tidak wajib
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [...],
  "message": "Portofolio berhasil diambil"
}
```

### Mendapatkan Detail Portofolio
- **Method:** GET
- **URL:** `/portofolio/:porto_id` atau `/porto/:porto_id`
- **Authorization:** Tidak wajib
- **Parameter URL:**
  - `porto_id`: ID portofolio
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "porto_id": "1",
    "uid": "123",
    "judul": "Interior Rumah Minimalis",
    "cover": "http://localhost:3000/portofolio/cover1.jpg",
    "kategori": "Living Room",
    "deskripsi": "Desain interior minimalis modern untuk ruang tamu",
    "created_at": "2025-01-01T00:00:00.000Z",
    "user": {
      "uname": "username",
      "ppict": "http://localhost:3000/profil/user123.jpg"
    },
    "furnitur": [
      {
        "furnitur_id": "1",
        "nama_furnitur": "Sofa",
        "foto_furnitur": "http://localhost:3000/furnitur/sofa1.jpg",
        "keterangan_furnitur": "Sofa minimalis 3 seater",
        "jumlah": 1
      }
    ]
  },
  "message": "Detail portofolio berhasil diambil"
}
```

### Mendapatkan Portofolio Berdasarkan User
- **Method:** GET
- **URL:** `/portofolio/user/:uid`
- **Authorization:** Tidak wajib
- **Parameter URL:**
  - `uid`: ID user
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [...],
  "message": "Portofolio user berhasil diambil"
}
```

### Membuat Portofolio Baru
- **Method:** POST
- **URL:** `/portofolio`
- **Content-Type:** `multipart/form-data`
- **Authorization:** Bearer Token (wajib, minimal level Post)
- **Body:**
  - `judul`: Judul portofolio (wajib)
  - `kategori`: Kategori portofolio (wajib)
  - `deskripsi`: Deskripsi portofolio (wajib)
  - `cover`: File gambar cover (wajib)
  - `furniturList`: Array JSON berisi data furnitur (wajib)
    ```json
    [
      {
        "nama_furnitur": "Sofa",
        "keterangan_furnitur": "Sofa minimalis 3 seater",
        "jumlah": 1
      }
    ]
    ```
  - `furniturImage_0`, `furniturImage_1`, ...: File gambar furnitur (opsional)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "portofolioId": "1",
    "userId": "123",
    "cover": "http://localhost:3000/portofolio/cover1.jpg",
    "title": "Interior Rumah Minimalis",
    "category": "Living Room",
    "description": "Desain interior minimalis modern untuk ruang tamu",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "furnitur": [
      {
        "furniturId": "1",
        "name": "Sofa",
        "image": "http://localhost:3000/furnitur/sofa1.jpg",
        "description": "Sofa minimalis 3 seater",
        "quantity": 1
      }
    ]
  },
  "message": "Portofolio berhasil dibuat"
}
```

### Mengupdate Portofolio
- **Method:** PUT
- **URL:** `/portofolio/:porto_id`
- **Content-Type:** `application/json`
- **Authorization:** Bearer Token (wajib, hanya owner atau admin)
- **Parameter URL:**
  - `porto_id`: ID portofolio
- **Body:**
  - `judul`: Judul portofolio (opsional)
  - `kategori`: Kategori portofolio (opsional)
  - `deskripsi`: Deskripsi portofolio (opsional)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "porto_id": "1",
    "judul": "Interior Rumah Minimalis Update",
    "kategori": "Living Room",
    "deskripsi": "Desain interior minimalis modern untuk ruang tamu update"
  },
  "message": "Portofolio berhasil diupdate"
}
```

### Menghapus Portofolio
- **Method:** DELETE
- **URL:** `/portofolio/:porto_id`
- **Authorization:** Bearer Token (wajib, hanya owner atau admin)
- **Parameter URL:**
  - `porto_id`: ID portofolio
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": null,
  "message": "Portofolio berhasil dihapus"
}
```

### Admin Soft Delete Portofolio
- **Method:** DELETE
- **URL:** `/portofolio/mod/:porto_id`
- **Authorization:** Bearer Token (wajib, hanya admin)
- **Parameter URL:**
  - `porto_id`: ID portofolio
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": null,
  "message": "Portofolio berhasil di-soft delete"
}
```

## ENDPOINT FURNITUR

### Update Batch Furnitur
- **Method:** PUT
- **URL:** `/portofolio/:porto_id/furnitur`
- **Content-Type:** `multipart/form-data`
- **Authorization:** Bearer Token (wajib, hanya owner atau admin)
- **Parameter URL:**
  - `porto_id`: ID portofolio
- **Body:**
  - `furniturList`: Array JSON berisi data furnitur (wajib)
    ```json
    [
      {
        "furnitur_id": "1", // opsional untuk update, wajib untuk edit
        "nama_furnitur": "Sofa",
        "keterangan_furnitur": "Sofa minimalis 3 seater",
        "jumlah": 1
      }
    ]
    ```
  - `furniturImage_0`, `furniturImage_1`, ...: File gambar furnitur (opsional)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "updated": 1,
    "created": 2,
    "furnitur": [...]
  },
  "message": "Furnitur berhasil diupdate"
}
```

### Delete Batch Furnitur
- **Method:** DELETE
- **URL:** `/portofolio/:porto_id/furnitur`
- **Content-Type:** `application/json`
- **Authorization:** Bearer Token (wajib, hanya owner atau admin)
- **Parameter URL:**
  - `porto_id`: ID portofolio
- **Body:**
  - `furniturIds`: Array ID furnitur yang akan dihapus (wajib)
    ```json
    ["1", "2", "3"]
    ```
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "deleted": 3
  },
  "message": "Furnitur berhasil dihapus"
}
```

## ENDPOINT REQUEST STATUS

### Memeriksa Status Request User
- **Method:** GET
- **URL:** `/check-request-status`
- **Authorization:** Bearer Token (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "hasRequest": true,
    "isApproved": false,
    "requestStatement": "view_to_post",
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "message": "Status request user"
}
```

### Mengajukan Request Jadi Poster
- **Method:** POST
- **URL:** `/request-poster`
- **Authorization:** Bearer Token (wajib)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "id": "1",
    "userId": "123",
    "requestStatement": "view_to_post",
    "approvalStatus": false,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "message": "Request berhasil diajukan"
}
```

### Admin Melihat Semua Request
- **Method:** GET
- **URL:** `/mod/request-status`
- **Authorization:** Bearer Token (wajib, hanya admin)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [
    {
      "id": "1",
      "userId": "123",
      "requestStatement": "view_to_post",
      "approvalStatus": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "user": {
        "uname": "username",
        "email": "user@example.com",
        "ppict": "http://localhost:3000/profil/user123.jpg"
      }
    }
  ],
  "message": "Daftar request"
}
```

### Admin Menyetujui Request
- **Method:** PATCH
- **URL:** `/mod/request-status/:id/approve`
- **Authorization:** Bearer Token (wajib, hanya admin)
- **Parameter URL:**
  - `id`: ID request
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "id": "1",
    "userId": "123",
    "requestStatement": "view_to_post",
    "approvalStatus": true,
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "message": "Request disetujui"
}
```

## ENDPOINT DESIGNER

### Mendapatkan Detail Designer
- **Method:** GET
- **URL:** `/designerdetails?uid=xxx`
- **Authorization:** Tidak wajib
- **Parameter Query:**
  - `uid`: ID user designer
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "uname": "username",
    "uid": "123",
    "ppict": "http://localhost:3000/profil/user123.jpg",
    "user_desc": "Deskripsi profil designer",
    "user_job": "Interior Designer",
    "email": "user@example.com",
    "status": "Post",
    "instagram": "@username",
    "whatsapp": "081234567890",
    "location": "Jakarta, Indonesia"
  },
  "message": "OK"
}
```

### Mendapatkan Daftar Designer
- **Method:** GET
- **URL:** `/designer-list?page=1&limit=8`
- **Authorization:** Tidak wajib
- **Parameter Query:**
  - `page`: Nomor halaman (default: 1)
  - `limit`: Jumlah item per halaman (default: 8)
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "designers": [
      {
        "uid": "123",
        "uname": "username",
        "ppict": "http://localhost:3000/profil/user123.jpg",
        "status": "Post",
        "portofolioCount": 5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 20,
      "itemsPerPage": 8
    }
  },
  "message": "Daftar designer berhasil diambil"
}
```

### Mendapatkan Designer Random untuk Home
- **Method:** GET
- **URL:** `/api/randompost`
- **Authorization:** Tidak wajib
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [
    {
      "uid": "123",
      "uname": "username",
      "ppict": "http://localhost:3000/profil/user123.jpg"
    }
  ],
  "message": "OK"
}
```

### Mendapatkan Featured Designers
- **Method:** GET
- **URL:** `/meet_designers`
- **Authorization:** Tidak wajib
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [
    {
      "userId": 1,
      "username": "namauser",
      "profilePicture": "http://localhost:3000/profil/xxx.JPG"
    }
  ],
  "message": "OK"
}
```

## ENDPOINT ADMIN

### Admin Delete User
- **Method:** DELETE
- **URL:** `/mod/user/:uid`
- **Authorization:** Bearer Token (wajib, hanya admin)
- **Parameter URL:**
  - `uid`: ID user
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": null,
  "message": "User berhasil dihapus"
}
```

### Admin Undelete User
- **Method:** PATCH
- **URL:** `/mod/user/:uid/undelete`
- **Authorization:** Bearer Token (wajib, hanya admin)
- **Parameter URL:**
  - `uid`: ID user
- **Response:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": null,
  "message": "User berhasil di-undelete"
}
```

## INFORMASI TAMBAHAN

### Penjelasan Dinamika Profile Picture
- Field `profilePicture` akan otomatis berisi URL file foto profil sesuai nama file pada database (`ppict`).
- Backend akan cek file di `/prisma/profil/` secara real-time:
    - Jika file ada, URL langsung ke file tsb.
    - Jika file tidak ada, backend fallback ke avatar Dicebear berbasis inisial username.
- Tidak ada nama file default yang di-hardcode.
- Jika user mengganti foto profil, URL akan otomatis berubah sesuai file baru.
- Sistem sudah siap untuk upload/crop dinamis di masa depan.

### Catatan Teknis
- Folder penyimpanan:
    - Foto profil: `/prisma/profil/`
    - Cover portofolio: `/prisma/portofolio/`
    - Foto furniture: `/prisma/furnitur/`
- Static file `/profil` sudah mengirim header `Cross-Origin-Resource-Policy: cross-origin` agar gambar bisa diakses frontend dev server (Vite).

### Keamanan dan Performa
- API dilengkapi dengan rate limiting untuk mencegah serangan brute force
- Endpoint autentikasi memiliki rate limiting yang lebih ketat
- Semua endpoint API dilindungi dengan middleware keamanan (helmet, XSS protection)
- Validasi input dilakukan pada semua endpoint yang menerima data dari client
- Logging komprehensif untuk audit trail dan debugging

---

## KONTAK & KONTRIBUSI
- Backend: Express + Prisma + JWT + Multer
- Untuk pertanyaan atau kontribusi, hubungi tim Homera
