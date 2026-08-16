# Inventario Multisucursal — Especificación Técnica Completa

---

## 1. Conceptos técnicos y su tecnología

### 1.1 Concurrencia y consistencia

**Condición de carrera:** dos ventas simultáneas del mismo producto pueden
dejar el stock en negativo si no se protege la operación.

**Transacciones ACID:** conjunto de operaciones que se ejecutan todas o
ninguna, con consistencia garantizada. Tecnología: PostgreSQL +
`prisma.$transaction`.

**Bloqueo optimista:** `UPDATE ... WHERE quantity >= X`, verificas al
guardar; si 0 filas afectadas, no había stock suficiente. Rápido, preferido
para este proyecto.

**Bloqueo pesimista:** `SELECT ... FOR UPDATE`, bloqueas la fila desde la
lectura. Más seguro ante alta contención, pero con más riesgo de cuellos de
botella — impleméntalo también para poder comparar ambos en tu README.

**Índices de base de datos:** `@@unique([productId, branchId])` en
`BranchStock` evita duplicados y acelera las consultas de stock por
sucursal.

### 1.2 Tiempo real

**WebSocket vs REST:** REST es petición-respuesta; WebSocket es una conexión
persistente y bidireccional — necesaria para reflejar cambios de stock sin
que el usuario recargue.

**Socket.io:** librería sobre WebSocket con reconexión automática y "salas"
(rooms) — cada sucursal es una sala, así solo se notifica a quien le importa
ese cambio.

**Pub/Sub:** patrón publicador/suscriptor. Necesario vía Redis
(`@socket.io/redis-adapter`) si el backend corre en más de una instancia.

### 1.3 Backend general (comparte tecnología con el proyecto de helpdesk)
JWT (access/refresh), RBAC, argon2, Zod, dotenv, Docker, Vitest/Jest +
Supertest, Pino. La diferencia clave: aquí el testing más importante es de
**concurrencia** (disparar N peticiones simultáneas), no solo de lógica de
negocio secuencial.

---

## 2. Reglas de negocio

### 2.1 Regla central de venta (la más importante del proyecto)

**BR-01 —** Ninguna venta puede completarse si `BranchStock.quantity <
cantidad solicitada` en el momento exacto de confirmar el pago — sin
importar cuántas ventas estén en curso simultáneamente para ese mismo
producto y sucursal.

**BR-02 —** La venta y el descuento de stock ocurren en la **misma
transacción de base de datos**: si el descuento de stock falla (por regla
BR-01), toda la venta se revierte (no queda una venta "huérfana" sin stock
descontado, ni viceversa).

**BR-03 —** Cada descuento/incremento de stock genera un registro inmutable
en `StockMovement` dentro de la misma transacción — nunca se actualiza el
stock sin dejar rastro del movimiento que lo causó.

### 2.2 Transferencias entre sucursales

**BR-04 —** Una transferencia inicia en `PENDIENTE`. Al pasar a
`EN_TRANSITO`, se descuenta el stock de la sucursal origen inmediatamente
(no se espera a la recepción) — el producto "no está" en ninguna sucursal
mientras viaja, lo cual refleja la realidad operativa.

**BR-05 —** Al confirmar `RECIBIDO`, se incrementa el stock de la sucursal
destino. Si se cancela estando `EN_TRANSITO`, el stock regresa a la sucursal
origen (nunca desaparece silenciosamente).

**BR-06 —** Solo un `ENCARGADO` de la sucursal origen puede iniciar una
transferencia; solo un `ENCARGADO` de la sucursal destino puede confirmarla
como recibida — esto evita que alguien "reciba" mercadería que nunca llegó
físicamente a su sucursal.

### 2.3 Alertas de stock

**BR-07 —** Cuando `BranchStock.quantity` cruza el umbral `Product.minStock`
(de arriba hacia abajo), se emite el evento `stock:low` una sola vez por
cruce — no en cada venta subsiguiente mientras siga bajo el mínimo (para no
saturar de notificaciones repetidas).

**BR-08 —** El estado de un producto en la UI se calcula así:
`quantity === 0` → `AGOTADO`; `quantity <= minStock` → `STOCK_BAJO`;
en cualquier otro caso → `NORMAL`. Se calcula en el momento de la consulta,
nunca se guarda como campo persistido (para evitar inconsistencias si cambia
`minStock` después).

### 2.4 Permisos y visibilidad

**BR-09 —** Un `CAJERO` solo ve y opera el catálogo/stock de su
`branchId` asignado — nunca puede ver ni vender desde otra sucursal.

**BR-10 —** Un `ENCARGADO` gestiona stock, transferencias y reportes de su
propia sucursal únicamente.

**BR-11 —** Solo `ADMIN` ve el consolidado de todas las sucursales y puede
crear/editar productos a nivel catálogo global.

### 2.5 Matriz de permisos por rol

| Acción | CAJERO | ENCARGADO | ADMIN |
|--------|:------:|:---------:|:-----:|
| Registrar venta | ✅ (su sucursal) | ✅ (su sucursal) | ✅ (cualquiera) |
| Ver stock de su sucursal | ✅ | ✅ | ✅ |
| Ver stock de otras sucursales | ❌ | ❌ | ✅ |
| Ajustar stock manualmente | ❌ | ✅ (su sucursal) | ✅ |
| Iniciar transferencia | ❌ | ✅ (como origen) | ✅ |
| Confirmar recepción de transferencia | ❌ | ✅ (como destino) | ✅ |
| Crear/editar producto (catálogo global) | ❌ | ❌ | ✅ |
| Ver reportes consolidados (todas las sucursales) | ❌ | ❌ | ✅ |

---

## 3. Reglas de validación de datos (Zod)

| Campo | Regla |
|-------|-------|
| `product.sku` | requerido, único, 3-30 caracteres alfanuméricos |
| `product.price` | número positivo, máximo 2 decimales |
| `product.minStock` | entero ≥ 0 |
| `sale.items[]` | mínimo 1 ítem, cada uno con `productId` y `quantity` entero > 0 |
| `transfer.quantity` | entero > 0, no puede exceder el stock actual de la sucursal origen al momento de crear la transferencia |
| `stockAdjustment.reason` | requerido (texto libre, obligatorio para trazabilidad — nunca un ajuste sin motivo) |

---

## 4. Especificación de la API

### 4.1 Formato de respuesta estándar
Igual que en el proyecto de Mesa de Ayuda (ver ese documento, sección 4.1),
para mantener consistencia si un desarrollador trabaja en ambos.

### 4.2 Endpoints — productos y stock

```
GET /api/products?branchId=&category=&lowStockOnly=
200 → { "data": [{ ...product, stockInBranch, status }], "meta": {...} }

POST /api/products                    (solo ADMIN)
Body: { "sku", "name", "category", "price", "minStock" }
201 → { "data": Product }
409 → si el SKU ya existe

GET /api/products/:id/stock?branchId=
200 → { "data": { "productId", "branchId", "quantity", "status" } }
```

### 4.3 Endpoint crítico — ventas (con control de concurrencia)

```
POST /api/sales
Body: { "branchId", "items": [{ "productId", "quantity" }] }

Lógica (ver pseudocódigo 5.1):
201 → { "data": Sale con items y total }
409 → { "error": { "code": "INSUFFICIENT_STOCK",
        "message": "Solo quedan 2 unidades disponibles de 'Producto X'",
        "details": [{ "productId", "available": 2, "requested": 5 }] } }
```

### 4.4 Endpoints — transferencias

```
POST /api/transfers
Body: { "productId", "originBranchId", "destinationBranchId", "quantity" }
201 → { "data": Transfer } (status: PENDIENTE)
403 → si el usuario no es ENCARGADO de originBranchId ni ADMIN (BR-06)

PATCH /api/transfers/:id/status
Body: { "status": "EN_TRANSITO" | "RECIBIDO" | "CANCELADO" }
200 → { "data": Transfer actualizado }
403 → según BR-06 (origen inicia, destino confirma recepción)
409 → si la transición de estado no es válida (ej. de RECIBIDO a PENDIENTE)
```

### 4.5 Endpoints — reportes

```
GET /api/reports/rotation?branchId=&from=&to=
200 → { "data": [{ "productId", "name", "unitsSold", "revenue" }] }

GET /api/reports/low-stock?branchId=
200 → { "data": [{ "productId", "name", "quantity", "minStock" }] }
```

### 4.6 Eventos de Socket.io

```
// Cliente al conectar:
socket.emit("join-branch", { branchId })
// Servidor: socket.join(`branch:${branchId}`)

// Servidor emite tras cada venta/ajuste/transferencia confirmada:
io.to(`branch:${branchId}`).emit("stock:updated", {
  productId, branchId, newQuantity, status
})

io.to(`branch:${branchId}`).emit("stock:low", {
  productId, branchId, currentQuantity, minStock
})  // solo se emite en el cruce del umbral (BR-07)

io.to(`branch:${destinationBranchId}`).emit("transfer:incoming", {
  transferId, productId, quantity, originBranchName
})
```

---

## 5. Pseudocódigo de funciones críticas

### 5.1 Registro de venta con control de concurrencia (bloqueo optimista)

```
function createSale(branchId, items, cashierId):
  return db.$transaction(async (tx) => {
    saleItems = []
    total = 0

    for item in items:
      // UPDATE atómico: solo descuenta si hay stock suficiente
      result = await tx.$executeRaw`
        UPDATE "BranchStock"
        SET quantity = quantity - ${item.quantity}
        WHERE "productId" = ${item.productId}
          AND "branchId" = ${branchId}
          AND quantity >= ${item.quantity}
      `

      if result.rowsAffected === 0:
        // no había stock suficiente → aborta TODA la transacción
        throw new InsufficientStockError(item.productId)

      product = await tx.product.findUnique(item.productId)
      saleItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price })
      total += product.price * item.quantity

      await tx.stockMovement.create({
        productId: item.productId, branchId, type: "VENTA",
        quantity: -item.quantity, referenceId: null, createdById: cashierId
      })

    sale = await tx.sale.create({ branchId, cashierId, total, items: saleItems })

    // vincular movimientos con la venta creada
    await tx.stockMovement.updateMany({ where: {...}, data: { referenceId: sale.id } })

    return sale
  })
  // Si CUALQUIER paso falla (incluido el chequeo de stock), Prisma revierte
  // automáticamente toda la transacción — no queda estado intermedio inválido.

// Después de confirmada la transacción (fuera de ella):
for item in items:
  newStock = getCurrentStock(item.productId, branchId)
  emitSocketEvent("stock:updated", { productId: item.productId, branchId, newQuantity: newStock })
  if crossedLowStockThreshold(item.productId, branchId):  // BR-07
    emitSocketEvent("stock:low", {...})
```

### 5.2 Confirmación de recepción de transferencia

```
function receiveTransfer(transferId, userId):
  transfer = findTransfer(transferId)

  if transfer.status !== "EN_TRANSITO":
    throw new ConflictError("La transferencia no está en tránsito")

  if not userIsEncargadoOf(userId, transfer.destinationBranchId) and not userIsAdmin(userId):
    throw new ForbiddenError()  // BR-06

  return db.$transaction(async (tx) => {
    await tx.branchStock.upsert({
      where: { productId_branchId: { productId: transfer.productId, branchId: transfer.destinationBranchId } },
      update: { quantity: { increment: transfer.quantity } },
      create: { productId: transfer.productId, branchId: transfer.destinationBranchId, quantity: transfer.quantity }
    })

    await tx.stockMovement.create({
      productId: transfer.productId, branchId: transfer.destinationBranchId,
      type: "TRANSFERENCIA_ENTRADA", quantity: transfer.quantity,
      referenceId: transfer.id, createdById: userId
    })

    await tx.stockTransfer.update({ where: { id: transferId }, data: { status: "RECIBIDO", receivedAt: now() } })
  })
```

---

## 6. Resumen final — concepto → tecnología

| Concepto | Tecnología |
|----------|------------|
| Condición de carrera | Prevenida con transacción + bloqueo optimista |
| Transacciones ACID | PostgreSQL + `prisma.$transaction` |
| Bloqueo optimista | `UPDATE ... WHERE quantity >= X` vía `$executeRaw` |
| Bloqueo pesimista | `SELECT ... FOR UPDATE` vía `$queryRaw` (documentar como alternativa) |
| Índices de BD | `@@unique`/`@@index` en `schema.prisma` |
| Tiempo real | Socket.io (rooms por sucursal) |
| Pub/Sub multi-instancia | Redis + `@socket.io/redis-adapter` |
| Autenticación/roles | JWT + middleware RBAC |
| Validación de datos | Zod |
| Testing de concurrencia | Vitest/Jest disparando peticiones simultáneas |
| Reportes/gráficas | Recharts (frontend) |
