import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users: any = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "User"');
    const roles: any = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "Role"');
    const products: any = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "Product"');
    const clients: any = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "Client"');
    
    console.log(`=== ESTADO DE LA BASE DE DATOS ===`);
    console.log(`Usuarios: ${Number(users[0].count)}`);
    console.log(`Roles: ${Number(roles[0].count)}`);
    console.log(`Productos: ${Number(products[0].count)}`);
    console.log(`Clientes: ${Number(clients[0].count)}`);
  } catch (error) {
    console.error("Error consultando:", error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
