-- CreateTable
CREATE TABLE "user" (
    "uid" SERIAL NOT NULL,
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

    CONSTRAINT "user_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "testimonial" (
    "testimonial_id" SERIAL NOT NULL,
    "pemberi_uid" INTEGER NOT NULL,
    "penerima_uid" INTEGER NOT NULL,
    "isi_komentar" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonial_pkey" PRIMARY KEY ("testimonial_id")
);

-- CreateTable
CREATE TABLE "portofolio" (
    "porto_id" SERIAL NOT NULL,
    "uid" INTEGER NOT NULL,
    "cover" TEXT,
    "judul" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portofolio_pkey" PRIMARY KEY ("porto_id")
);

-- CreateTable
CREATE TABLE "furnitur" (
    "furnitur_id" SERIAL NOT NULL,
    "porto_id" INTEGER NOT NULL,
    "nama_furnitur" TEXT NOT NULL,
    "foto_furnitur" TEXT,
    "keterangan_furnitur" TEXT,

    CONSTRAINT "furnitur_pkey" PRIMARY KEY ("furnitur_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_uname_key" ON "user"("uname");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "testimonial" ADD CONSTRAINT "testimonial_pemberi_uid_fkey" FOREIGN KEY ("pemberi_uid") REFERENCES "user"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonial" ADD CONSTRAINT "testimonial_penerima_uid_fkey" FOREIGN KEY ("penerima_uid") REFERENCES "user"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portofolio" ADD CONSTRAINT "portofolio_uid_fkey" FOREIGN KEY ("uid") REFERENCES "user"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "furnitur" ADD CONSTRAINT "furnitur_porto_id_fkey" FOREIGN KEY ("porto_id") REFERENCES "portofolio"("porto_id") ON DELETE CASCADE ON UPDATE CASCADE;
