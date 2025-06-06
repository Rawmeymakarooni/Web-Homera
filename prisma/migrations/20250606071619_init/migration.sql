-- CreateTable
CREATE TABLE "user" (
    "uid" TEXT NOT NULL,
    "uname" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'View',
    "email" TEXT NOT NULL,
    "ppict" TEXT DEFAULT 'profil/Default.JPG',
    "location" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "user_job" TEXT,
    "user_desc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isdelete" BOOLEAN NOT NULL DEFAULT false,
    "pending_delete_until" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "comments" (
    "comment_id" TEXT NOT NULL,
    "pemberi_uid" TEXT NOT NULL,
    "penerima_uid" TEXT NOT NULL,
    "isi_komentar" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isdelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "portofolio" (
    "porto_id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "cover" TEXT,
    "judul" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isdelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "portofolio_pkey" PRIMARY KEY ("porto_id")
);

-- CreateTable
CREATE TABLE "furnitur" (
    "furnitur_id" TEXT NOT NULL,
    "porto_id" TEXT NOT NULL,
    "nama_furnitur" TEXT NOT NULL,
    "foto_furnitur" TEXT,
    "keterangan_furnitur" TEXT,
    "jumlah" INTEGER,

    CONSTRAINT "furnitur_pkey" PRIMARY KEY ("furnitur_id")
);

-- CreateTable
CREATE TABLE "RequestStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestStatement" TEXT NOT NULL,
    "approvalStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_uname_key" ON "user"("uname");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_userId_key" ON "RefreshToken"("userId");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_pemberi_uid_fkey" FOREIGN KEY ("pemberi_uid") REFERENCES "user"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_penerima_uid_fkey" FOREIGN KEY ("penerima_uid") REFERENCES "user"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portofolio" ADD CONSTRAINT "portofolio_uid_fkey" FOREIGN KEY ("uid") REFERENCES "user"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "furnitur" ADD CONSTRAINT "furnitur_porto_id_fkey" FOREIGN KEY ("porto_id") REFERENCES "portofolio"("porto_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestStatus" ADD CONSTRAINT "RequestStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
