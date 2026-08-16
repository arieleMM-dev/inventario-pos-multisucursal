import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';

describe('Motor de Ventas: Control de Concurrencia Optimista', () => {
  let testBranchId: string;
  let testProductId: string;
  let testUserId: string;
  let token: string;

  beforeAll(async () => {
    // 1. Crear una sucursal de prueba
    const branch = await prisma.branch.create({
      data: { name: 'Sucursal Test Concurrencia', address: 'Test 123' }
    });
    testBranchId = branch.id;

    // 2. Crear un cajero asignado a la sucursal
    const user = await prisma.user.create({
      data: {
        name: 'Cajero Test',
        email: `cajero_${Date.now()}@test.com`,
        passwordHash: 'dummy_hash', 
        role: {
          connectOrCreate: {
            where: { name: 'CAJERO' },
            create: { name: 'CAJERO', description: 'Cajero test' }
          }
        },
        branch: { connect: { id: testBranchId } }
      }
    });
    testUserId = user.id;

    // 3. Crear un producto de prueba
    const product = await prisma.product.create({
      data: {
        sku: `SKU_${Date.now()}`,
        name: 'Producto de Prueba Concurrencia',
        category: 'TEST',
        price: 100,
        minStock: 5
      }
    });
    testProductId = product.id;

    // 4. Crear el stock inicial: Exactamente 10 unidades
    await prisma.branchStock.create({
      data: {
        productId: testProductId,
        branchId: testBranchId,
        quantity: 10
      }
    });

    // 5. Generar token de autenticación
    token = jwt.sign(
      { userId: testUserId, role: 'CAJERO', branchId: testBranchId },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '1h' }
    );
  });

  it('Debe procesar exactamente 10 ventas exitosas de 20 concurrentes, y evitar stock negativo', async () => {
    const salePayload = {
      branchId: testBranchId,
      items: [
        { productId: testProductId, quantity: 1 }
      ]
    };

    // Disparamos 20 peticiones simultáneas usando Promise.all
    const requests = Array.from({ length: 20 }).map(() =>
      request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${token}`)
        .send(salePayload)
    );

    const responses = await Promise.all(requests);

    const successResponses = responses.filter(res => res.status === 201);
    const errorResponses = responses.filter(res => res.status === 409); // INSUFFICIENT_STOCK

    // Verificaciones críticas
    expect(successResponses.length).toBe(10);
    expect(errorResponses.length).toBe(10);

    errorResponses.forEach(res => {
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    // Verificamos el stock en la base de datos, ¡debe ser 0, nunca negativo!
    const finalStock = await prisma.branchStock.findUnique({
      where: { productId_branchId: { productId: testProductId, branchId: testBranchId } }
    });
    expect(finalStock?.quantity).toBe(0);

    // Verificamos que exactamente se generaron 10 movimientos de stock inmutables (BR-03)
    const movements = await prisma.stockMovement.findMany({
      where: { productId: testProductId, branchId: testBranchId }
    });
    expect(movements.length).toBe(10);
  });
});
