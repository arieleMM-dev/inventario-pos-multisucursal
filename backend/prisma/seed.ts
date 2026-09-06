import { prisma } from '../src/utils/prisma';
import * as argon2 from 'argon2';

const permissions = [
  // Inventario
  { code: 'INVENTORY_VIEW', module: 'Inventario', description: 'Ver productos y stock' },
  { code: 'INVENTORY_READ_GLOBAL', module: 'Inventario', description: 'Ver stock global en sucursales' },
  { code: 'INVENTORY_CREATE_PRODUCT', module: 'Inventario', description: 'Crear o editar productos' },
  { code: 'INVENTORY_DELETE', module: 'Inventario', description: 'Eliminar productos' },
  { code: 'INVENTORY_ADJUST', module: 'Inventario', description: 'Realizar ajustes de stock' },
  // Transferencias
  { code: 'INVENTORY_TRANSFER', module: 'Transferencias', description: 'Acceso total a transferencias' },
  { code: 'TRANSFERS_VIEW', module: 'Transferencias', description: 'Ver transferencias' },
  { code: 'TRANSFERS_CREATE', module: 'Transferencias', description: 'Enviar transferencias' },
  { code: 'TRANSFERS_RECEIVE', module: 'Transferencias', description: 'Recibir transferencias' },
  // Ventas (POS)
  { code: 'POS_ACCESS', module: 'Ventas', description: 'Acceso a módulo POS' },
  { code: 'POS_VIEW', module: 'Ventas', description: 'Ver historial de ventas' },
  { code: 'POS_SELL', module: 'Ventas', description: 'Realizar ventas y cobrar' },
  { code: 'CUSTOMERS_VIEW', module: 'Ventas', description: 'Ver clientes' },
  { code: 'CUSTOMERS_MANAGE', module: 'Ventas', description: 'Crear o editar clientes' },
  // Reportes
  { code: 'REPORTS_VIEW', module: 'Reportes', description: 'Ver analíticas y métricas' },
  // Configuración
  { code: 'USER_EDIT_ALL', module: 'Configuración', description: 'Editar usuarios completamente' },
  { code: 'USERS_VIEW', module: 'Configuración', description: 'Ver usuarios' },
  { code: 'USERS_MANAGE', module: 'Configuración', description: 'Gestionar usuarios' },
  { code: 'ROLES_VIEW', module: 'Configuración', description: 'Ver roles' },
  { code: 'ROLES_MANAGE', module: 'Configuración', description: 'Gestionar roles y permisos' },
  { code: 'BRANCHES_VIEW', module: 'Configuración', description: 'Ver sucursales' },
  { code: 'BRANCHES_MANAGE', module: 'Configuración', description: 'Gestionar sucursales' },
];

async function main() {
  console.log('Iniciando el proceso de seed de RBAC...');

  // 1. Crear Sucursal Matriz
  const sucursalMatriz = await prisma.branch.upsert({
    where: { id: 'matriz-001' },
    update: {},
    create: {
      id: 'matriz-001',
      code: 'SUC-001',
      name: 'Sucursal Matriz',
      address: 'Dirección Principal, Centro',
      taxId: '123456789',
      timezone: 'America/Mexico_City',
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
  // Primero limpiamos los permisos del admin si existen para recargarlos
  let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (adminRole) {
    await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
    adminRole = await prisma.role.update({
      where: { name: 'ADMIN' },
      data: {
        permissions: {
          create: allPermissions.map(p => ({ permissionId: p.id }))
        }
      }
    });
  } else {
    adminRole = await prisma.role.create({
      data: {
        name: 'ADMIN',
        description: 'Administrador general del sistema',
        isSystem: true,
        permissions: {
          create: allPermissions.map(p => ({ permissionId: p.id }))
        }
      }
    });
  }

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
  const cajeroPermissions = allPermissions.filter(p => ['POS_SELL', 'POS_ACCESS', 'INVENTORY_VIEW'].includes(p.code));
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
    where: { email: 'arieljsc2000@gmail.com' },
    update: { roleId: adminRole.id },
    create: {
      email: 'arieljsc2000@gmail.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'System',
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
