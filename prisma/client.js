/**
 * Prisma Client Singleton
 * Memastikan hanya ada satu instance PrismaClient di seluruh aplikasi
 * Menghindari warning "too many clients" di Vercel
 */
const { PrismaClient } = require('@prisma/client');

// Deklarasi variabel global untuk menyimpan instance PrismaClient
const globalForPrisma = global;

// Cek apakah sudah ada instance PrismaClient di global scope
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Simpan instance ke global scope jika bukan di production
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
