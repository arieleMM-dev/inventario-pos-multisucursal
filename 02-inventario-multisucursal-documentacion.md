# Gestión de Inventarios Multisucursal en Tiempo Real — Documentación Técnica

## 1. Resumen del proyecto

Sistema de punto de venta (POS) e inventario que sincroniza el stock entre
varias sucursales en tiempo real, evita sobreventa cuando dos cajeros intentan
vender el último producto simultáneamente, y permite transferencias de
mercadería entre sucursales. Equivalente funcional reducido de productos como
Bind ERP o Square.

**Objetivo del portafolio:** demostrar manejo de concurrencia, comunicación en
tiempo real (WebSockets), transacciones de base de datos, y consistencia de
datos distribuidos entre "nodos" (sucursales).

---

## 2. Documento de requisitos

### 2.1 Requisitos funcionales

| ID | Requisito |
|----|-----------|
| RF-01 | Registrar productos con SKU, nombre, precio, categoría y stock mínimo. |
| RF-02 | Cada producto tiene un stock independiente por sucursal (no un stock global). |
| RF-03 | Al registrar una venta en una sucursal, el stock de esa sucursal se descuenta de forma atómica (sin permitir vender más de lo disponible). |
| RF-04 | Cuando el stock de un producto cambia en una sucursal, todos los usuarios conectados a esa sucursal ven el cambio en tiempo real sin recargar la página. |
| RF-05 | Se puede solicitar una transferencia de stock entre sucursales (sucursal origen → sucursal destino), con estado `pendiente → en_transito → recibido`. |
| RF-06 | Alertas automáticas cuando el stock de un producto cae por debajo del mínimo definido. |
| RF-07 | Historial completo de movimientos de stock por producto y sucursal (venta, ingreso, transferencia, ajuste manual). |
| RF-08 | Reportes de rotación de inventario (productos más/menos vendidos) por sucursal y consolidado. |
| RF-09 | Roles: `cajero` (solo vende), `encargado de sucursal` (gestiona stock de su sucursal), `administrador` (ve todas las sucursales). |
| RF-10 | Registro de proveedores y órdenes de compra (ingreso de mercadería nueva al inventario). |

### 2.2 Requisitos no funcionales

| ID | Requisito |
|----|-----------|
| RNF-01 | Ninguna venta puede dejar el stock de un producto en negativo, incluso con ventas concurrentes simultáneas (condición de carrera). |
| RNF-02 | Las actualizaciones de stock deben propagarse a los clientes conectados en menos de 1-2 segundos. |
| RNF-03 | El sistema debe seguir funcionando (al menos para consultas) si el servicio de WebSocket falla momentáneamente. |
| RNF-04 | Autenticación JWT con permisos distintos por rol y por sucursal asignada. |
| RNF-05 | Todo movimiento de stock debe quedar registrado de forma inmutable (no se permite editar historial, solo agregar correcciones). |

---

## 3. Arquitectura

### 3.1 Diagrama general

```
┌──────────────────────────────────────────────────┐
│           Frontend (Next.js + React)               │
│  Panel de venta (POS) · Panel de inventario ·       │
│  Dashboard de reportes                              │
└──────────┬───────────────────────┬──────────────────┘
           │ REST API              │ WebSocket (Socket.io)
┌──────────▼───────────────────────▼──────────────────┐
│                Backend (Express + TS)                 │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │ Controllers│  │   Services     │  │ Repositories │ │
│  │            │→│  (lógica venta,│→│  (Prisma)    │ │
│  │            │  │  transferencia)│  │              │ │
│  └────────────┘  └───────────────┘  └──────────────┘ │
│  ┌───────────────────────────────────────────────┐   │
│  │ Socket.io Gateway → emite eventos por sucursal │   │
│  └───────────────────────────────────────────────┘   │
└──────────┬───────────────────────┬──────────────────┘
           │                        │
           ▼                        ▼
   ┌───────────────┐        ┌───────────────┐
   │  PostgreSQL    │        │  Redis          │
   │  (transacciones│        │  (pub/sub para  │
   │   ACID de stock)│        │  Socket.io      │
   └───────────────┘        │  multi-instancia)│
                             └───────────────┘
```

### 3.2 Decisiones clave de arquitectura

**Control de concurrencia — el corazón técnico del proyecto.**
Para evitar que dos ventas simultáneas dejen el stock en negativo, se usa una
de estas dos estrategias (recomendado implementar la primera, mencionar la
segunda como alternativa en el README):

1. **Transacción con bloqueo optimista:** al descontar stock, la consulta SQL
   verifica `WHERE stock >= cantidad` dentro de la misma transacción
   (`UPDATE ... WHERE stock >= ? RETURNING stock`). Si la fila afectada es 0,
   la venta falla porque ya no había stock suficiente. Esto se hace con
   `$transaction` de Prisma o SQL crudo si Prisma no expone el patrón
   directamente.
2. **Bloqueo pesimista (`SELECT ... FOR UPDATE`):** bloquea la fila del
   producto mientras dura la transacción de venta. Más simple de razonar,
   pero puede generar cuellos de botella con alta concurrencia — vale la pena
   implementarlo para entender la diferencia y documentarla.

**Socket.io + Redis adapter:** si en algún momento despliegas más de una
instancia del backend (por ejemplo, escalado horizontal), Socket.io por sí
solo no sincroniza eventos entre instancias — necesitas el adaptador de Redis
(`@socket.io/redis-adapter`) para que un evento emitido desde una instancia
llegue a los clientes conectados a otra. Aunque tu proyecto de portafolio
probablemente correrá en una sola instancia, documentar y dejar preparado este
punto demuestra que entiendes el problema real de escalar tiempo real.

---

## 4. Decisiones de stack tecnológico

### 4.1 Ya dominas (usar directamente)

| Capa | Tecnología | Uso específico |
|------|-----------|-----------------|
| Backend | Node.js + TypeScript + Express | API REST + gateway de sockets |
| ORM | Prisma | Modelado y transacciones sobre PostgreSQL |
| Base de datos | PostgreSQL | Consistencia ACID crítica para stock |
| Autenticación | JWT | Sesión + permisos por sucursal |
| Frontend | Next.js + React | POS, panel de inventario, dashboard |

### 4.2 Complementarias que necesitas añadir

| Tecnología | Para qué | Por qué esta y no otra |
|-----------|----------|--------------------------|
| **Socket.io** | Comunicación en tiempo real bidireccional | Es el estándar de facto en Node para tiempo real, con reconexión automática y fallback incorporado — más robusto que WebSockets nativos a mano. |
| **Redis** | Pub/sub para Socket.io + cache de consultas frecuentes (ej. catálogo de productos) | Necesario en cuanto escalas a más de una instancia del backend; también acelera lecturas repetidas. |
| **Zod** | Validación de payloads REST y de eventos de socket | Mismo motivo que en el proyecto de helpdesk: tipado end-to-end. |
| **date-fns** | Manejo de fechas para reportes (rotación, periodos) | Más liviano que Moment.js, es el estándar actual. |
| **Recharts o Chart.js** (frontend) | Gráficas del dashboard de reportes | Recharts se integra muy bien con React. |
| **Vitest o Jest + Supertest** | Tests de integración de los endpoints críticos (venta concurrente) | Es indispensable testear específicamente el caso de condición de carrera con tests concurrentes simulados. |
| **Docker Compose** | Levantar Postgres + Redis + backend localmente con un comando | Estándar de la industria para desarrollo local reproducible. |

### 4.3 Opcional / para llevarlo más lejos

| Tecnología | Para qué |
|-----------|----------|
| Python + FastAPI + pandas | Microservicio de reportes avanzados (predicción de quiebre de stock según velocidad de venta histórica) |
| Bull/BullMQ | Procesar transferencias entre sucursales como jobs asíncronos con reintentos |
| k6 o Artillery | Pruebas de carga para verificar que el control de concurrencia aguanta ventas simultáneas reales, no solo en teoría |

---

## 5. Modelo de datos (diseño relacional)

```
Branch (Sucursal)
 ├─ id, name, address

User
 ├─ id, email, passwordHash, name, role (CAJERO|ENCARGADO|ADMIN), branchId (nullable si es admin)

Product
 ├─ id, sku, name, category, price, minStock

BranchStock
 ├─ id, productId, branchId, quantity        ← UNIQUE(productId, branchId)

StockMovement
 ├─ id, productId, branchId, type (VENTA|INGRESO|TRANSFERENCIA_SALIDA|TRANSFERENCIA_ENTRADA|AJUSTE)
 ├─ quantity, previousStock, newStock, referenceId (ventaId o transferId), createdById, createdAt

Sale (Venta)
 ├─ id, branchId, cashierId, total, createdAt
SaleItem
 ├─ id, saleId, productId, quantity, unitPrice

StockTransfer
 ├─ id, productId, originBranchId, destinationBranchId, quantity
 ├─ status (PENDIENTE|EN_TRANSITO|RECIBIDO|CANCELADO), createdById, createdAt, receivedAt

Supplier
 ├─ id, name, contact
PurchaseOrder
 ├─ id, supplierId, branchId, status, createdAt
PurchaseOrderItem
 ├─ id, purchaseOrderId, productId, quantity, unitCost
```

**Punto crítico de diseño:** `BranchStock` es la tabla que representa el stock
real por sucursal — nunca un campo `stock` global en `Product`. Toda venta,
transferencia o ajuste modifica `BranchStock.quantity` dentro de una
transacción, y genera un registro inmutable en `StockMovement` (nunca se
actualiza ni se borra un `StockMovement`, solo se agregan nuevos).

---

## 6. Diseño de la API y eventos en tiempo real

### 6.1 Endpoints REST principales

```
POST   /api/auth/login

GET    /api/products
POST   /api/products
GET    /api/products/:id/stock?branchId=

POST   /api/sales                        (crea venta, descuenta stock atómicamente)
GET    /api/sales?branchId=&from=&to=

POST   /api/transfers                    (solicita transferencia)
PATCH  /api/transfers/:id/status         (en_transito / recibido / cancelado)

GET    /api/reports/rotation?branchId=
GET    /api/reports/low-stock?branchId=

POST   /api/purchase-orders
PATCH  /api/purchase-orders/:id/receive  (ingresa stock nuevo)
```

### 6.2 Eventos de Socket.io

```
Cliente se une a la sala de su sucursal: socket.join(`branch:${branchId}`)

Servidor emite:
  "stock:updated"     { productId, branchId, newQuantity }
  "stock:low"         { productId, branchId, currentQuantity, minStock }
  "transfer:incoming" { transferId, productId, quantity, originBranch }
```

---

## 7. Roadmap de implementación por fases

**Fase 0 — Setup**
Docker Compose (Postgres + Redis), estructura de proyecto, Prisma schema
inicial con `Branch`, `User`, `Product`, `BranchStock`.

**Fase 1 — Autenticación y estructura multisucursal**
Login, roles, middleware que restringe a un `encargado`/`cajero` a ver/operar
solo su sucursal asignada.

**Fase 2 — CRUD de productos y stock inicial por sucursal**

**Fase 3 — Motor de ventas con control de concurrencia**
Este es el núcleo técnico del proyecto. Implementar la venta con transacción
atómica, y escribir un test que dispare 20 ventas simultáneas del mismo
producto con stock=10 para comprobar que nunca queda negativo.

**Fase 4 — Tiempo real con Socket.io**
Emitir `stock:updated` tras cada venta/ajuste; el frontend se suscribe a la
sala de su sucursal y actualiza la UI sin recargar.

**Fase 5 — Transferencias entre sucursales**

**Fase 6 — Órdenes de compra y proveedores**

**Fase 7 — Reportes y dashboard**
Rotación de inventario, alertas de stock bajo, gráficas con Recharts.

**Fase 8 — Pulido**
Tests de concurrencia con k6/Artillery, Docker para despliegue, README con
diagrama de arquitectura y explicación específica del problema de condición
de carrera y cómo se resolvió (esto es lo que más va a destacar en una
entrevista técnica).

---

## 8. Qué queda demostrado con este proyecto

- Manejo real de condiciones de carrera y transacciones ACID — un tema que
  muchos portafolios evitan por completo.
- Comunicación en tiempo real con arquitectura pensada para escalar
  (Socket.io + Redis adapter documentado, aunque no se despliegue así).
- Modelado de datos multi-entidad con reglas de negocio no triviales
  (transferencias con estados, historial inmutable).
- Capacidad de explicar en una entrevista técnica *por qué* elegiste una
  estrategia de concurrencia sobre otra — eso pesa más que el código en sí.
