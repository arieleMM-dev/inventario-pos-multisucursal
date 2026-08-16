import { prisma } from '../src/utils/prisma';
import * as argon2 from 'argon2';

const permissions = [
  // POS
  { code: 'pos.sell', module: 'Punto de Venta', description: 'Realizar ventas y cobrar' },
  // INVENTORY
  { code: 'inventory.view', module: 'Inventario', description: 'Ver catálogo y stock' },
  { code: 'inventory.create_product', module: 'Inventario', description: 'Crear o editar productos' },
  { code: 'inventory.adjust', module: 'Inventario', description: 'Realizar ajustes manuales de stock' },
  // TRANSFERS
  { code: 'transfers.view', module: 'Transferencias', description: 'Ver transferencias' },
  { code: 'transfers.create', module: 'Transferencias', description: 'Enviar transferencias' },
  { code: 'transfers.receive', module: 'Transferencias', description: 'Recibir transferencias' },
  // REPORTS
  { code: 'reports.view', module: 'Reportes', description: 'Ver analíticas y métricas' },
  // CONFIG
  { code: 'users.manage', module: 'Configuración', description: 'Crear y editar usuarios' },
  { code: 'branches.manage', module: 'Configuración', description: 'Crear y editar sucursales' },
  { code: 'roles.manage', module: 'Configuración', description: 'Crear y editar roles/permisos' },
];

async function main() {
  console.log('Iniciando el proceso de seed de RBAC...');

  // 1. Crear Sucursal Matriz
  const sucursalMatriz = await prisma.branch.upsert({
    where: { id: 'matriz-001' },
    update: {},
    create: {
      id: 'matriz-001',
      name: 'Sucursal Matriz',
      address: 'Dirección Principal, Centro',
    },
  });
  console.log(`✅ Sucursal creada: ${sucursalMatriz.name}`);

  // 2. Crear Permisos Base
  console.log('Creando permisos de sistema...');
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description, module: p.module },
      create: p,
    });
  }

  // 3. Crear Roles Base
  const allPermissions = await prisma.permission.findMany();

  // Admin: Todos los permisos
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador general del sistema',
      isSystem: true,
      permissions: {
        create: allPermissions.map(p => ({ permissionId: p.id }))
      }
    }
  });

  // Encargado: Casi todos excepto gestión de usuarios y roles
  const encargadoPermissions = allPermissions.filter(p => p.module !== 'Configuración');
  await prisma.role.upsert({
    where: { name: 'ENCARGADO' },
    update: {},
    create: {
      name: 'ENCARGADO',
      description: 'Gerente de sucursal',
      isSystem: true,
      permissions: {
        create: encargadoPermissions.map(p => ({ permissionId: p.id }))
      }
    }
  });

  // Cajero: Solo ventas e inventario (ver)
  const cajeroPermissions = allPermissions.filter(p => ['pos.sell', 'inventory.view'].includes(p.code));
  await prisma.role.upsert({
    where: { name: 'CAJERO' },
    update: {},
    create: {
      name: 'CAJERO',
      description: 'Atención en punto de venta',
      isSystem: true,
      permissions: {
        create: cajeroPermissions.map(p => ({ permissionId: p.id }))
      }
    }
  });
  console.log('✅ Roles y permisos creados');

  // 4. Crear Usuario Super Administrador
  const adminPassword = await argon2.hash('admin123');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: { roleId: adminRole.id },
    create: {
      email: 'admin@empresa.com',
      passwordHash: adminPassword,
      name: 'Administrador General',
      roleId: adminRole.id,
      branchId: null,
    },
  });
  console.log(`✅ Usuario Admin creado: ${adminUser.email} / admin123`);

  console.log('Seed RBAC completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
