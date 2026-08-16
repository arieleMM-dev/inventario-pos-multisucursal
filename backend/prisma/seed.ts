import { prisma } from '../src/utils/prisma';
import * as argon2 from 'argon2';

async function main() {
  console.log('Seeding database...');

  // Limpiar datos
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.branchStock.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  // 1. Crear Sucursales
  const branchCentro = await prisma.branch.create({
    data: { name: 'Centro', address: 'Av. Principal 123' },
  });
  const branchNorte = await prisma.branch.create({
    data: { name: 'Norte', address: 'Plaza Norte 456' },
  });

  console.log(`Sucursales creadas: ${branchCentro.name}, ${branchNorte.name}`);

  // 2. Crear Usuarios (ADMIN, ENCARGADO, CAJERO)
  const passwordHash = await argon2.hash('123456');

  const admin = await prisma.user.create({
    data: {
      name: 'Admin General',
      email: 'admin@test.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const encargado = await prisma.user.create({
    data: {
      name: 'Encargado Centro',
      email: 'encargado@test.com',
      passwordHash,
      role: 'ENCARGADO',
      branchId: branchCentro.id,
    },
  });

  const cajero = await prisma.user.create({
    data: {
      name: 'Cajero Centro',
      email: 'cajero@test.com',
      passwordHash,
      role: 'CAJERO',
      branchId: branchCentro.id,
    },
  });

  console.log(`Usuarios creados:`);
  console.log(`- ADMIN: ${admin.email} (pass: 123456)`);
  console.log(`- ENCARGADO: ${encargado.email} (pass: 123456) [Sucursal: Centro]`);
  console.log(`- CAJERO: ${cajero.email} (pass: 123456) [Sucursal: Centro]`);

  // 3. Crear Productos y Stock inicial
  const p1 = await prisma.product.create({
    data: { sku: 'P-001', name: 'Refresco Cola 600ml', category: 'Bebidas', price: 15.5, minStock: 10 }
  });
  const p2 = await prisma.product.create({
    data: { sku: 'P-002', name: 'Papas Fritas Clásicas', category: 'Snacks', price: 20.0, minStock: 15 }
  });
  const p3 = await prisma.product.create({
    data: { sku: 'P-003', name: 'Agua Mineral 1L', category: 'Bebidas', price: 12.0, minStock: 5 }
  });

  // Stock para Centro
  await prisma.branchStock.createMany({
    data: [
      { productId: p1.id, branchId: branchCentro.id, quantity: 50 },
      { productId: p2.id, branchId: branchCentro.id, quantity: 12 }, // Stock Bajo (min 15)
      { productId: p3.id, branchId: branchCentro.id, quantity: 0 },  // Agotado
    ]
  });

  // Stock para Norte
  await prisma.branchStock.createMany({
    data: [
      { productId: p1.id, branchId: branchNorte.id, quantity: 100 },
      { productId: p2.id, branchId: branchNorte.id, quantity: 80 },
    ]
  });

  console.log('Productos y Stock inicial creados con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
