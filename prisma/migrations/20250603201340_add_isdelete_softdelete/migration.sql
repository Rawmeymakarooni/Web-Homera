-- AlterTable
ALTER TABLE "portofolio" ADD COLUMN     "isdelete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "testimonial" ADD COLUMN     "isdelete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isdelete" BOOLEAN NOT NULL DEFAULT false;
