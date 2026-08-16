# Inventario Multisucursal — Guía de Diseño UX/UI (especificación completa de componentes)

## 1. Principios de diseño

Dos interfaces distintas sobre la misma base de datos: **POS** (cajero, de
pie, rápido, táctil) y **panel de administración** (encargado/admin,
sentado, denso en datos). Cada uno con su propio criterio de diseño — no se
mezclan estilos entre ambos.

---

## 2. Paleta de color completa

### 2.1 Escala neutra

| Token | Hex | Uso |
|-------|-----|-----|
| `gray-50` | `#F9FAFB` | Fondo general del panel admin |
| `gray-100` | `#F3F4F6` | Fondo de tarjetas secundarias, hover |
| `gray-200` | `#E5E7EB` | Bordes, divisores |
| `gray-300` | `#D1D5DB` | Bordes de inputs |
| `gray-500` | `#6B7280` | Texto secundario |
| `gray-700` | `#374151` | Texto de cuerpo |
| `gray-900` | `#111827` | Títulos |
| `white` | `#FFFFFF` | Fondo de tarjetas, texto sobre color |

### 2.2 Color de marca

| Token | Hex | Uso |
|-------|-----|-----|
| `brand-500` | `#0F766E` (verde azulado/teal) | Botón primario, navegación activa — deliberadamente distinto del índigo del proyecto de helpdesk, para que ambos proyectos de tu portafolio se vean como productos distintos, no plantillas repetidas |
| `brand-600` | `#0E6660` | Hover del botón primario |
| `brand-50` | `#F0FDFA` | Fondo de selección/activo |

### 2.3 Colores semánticos de estado

| Token | Hex fondo | Hex texto | Uso |
|-------|-----------|-----------|-----|
| `success-bg` / `success-text` | `#DCFCE7` | `#166534` | Stock normal, transferencia recibida |
| `warning-bg` / `warning-text` | `#FEF3C7` | `#92400E` | Stock bajo el mínimo |
| `danger-bg` / `danger-text` | `#FEE2E2` | `#991B1B` | Stock agotado, venta rechazada |
| `info-bg` / `info-text` | `#DBEAFE` | `#1E40AF` | Transferencia en tránsito |

### 2.4 Paleta específica del módulo POS (mayor contraste, uso en tablet)

| Token | Hex | Uso |
|-------|-----|-----|
| `pos-bg` | `#F8FAFC` | Fondo del grid de productos |
| `pos-card-bg` | `#FFFFFF` | Tarjeta de producto |
| `pos-card-disabled-bg` | `#F1F5F9` con opacidad 60% | Producto agotado |
| `pos-total-bg` | `brand-500` | Fondo de la barra de total a pagar (alto contraste, siempre visible) |

---

## 3. Tipografía

- **Familia:** Inter (o system-ui) en ambos módulos.
- **Módulo admin:** escala estándar (12-24px), igual criterio que un
  dashboard clásico.
- **Módulo POS — escala aumentada, crítica para uso real en tablet:**

| Token | Tamaño | Uso en POS |
|-------|--------|------------|
| `pos-text-sm` | 16px | Descripciones secundarias |
| `pos-text-base` | 18px | Nombre de producto en el grid |
| `pos-text-lg` | 22px | Precio unitario |
| `pos-text-xl` | 28px | Total a pagar (siempre el elemento tipográfico más grande de la pantalla) |

---

## 4. Espaciado, bordes y elevación

- Escala de espaciado: 4, 8, 12, 16, 24, 32, 48px (igual que helpdesk, para
  consistencia entre tus proyectos si alguien revisa ambos).
- Radio de borde: `rounded-md` (6px) en admin, `rounded-xl` (12px) en tarjetas
  de producto del POS (objetivo táctil, más "amigable" al dedo).
- Sombra: `shadow-sm` para tarjetas en reposo, `shadow-lg` para el panel de
  carrito flotante del POS (debe sentirse "por encima" del grid).

---

## 5. Especificación de componentes

### 5.1 Tarjeta de producto (POS) — el componente más importante del módulo

- Tamaño mínimo: 140x140px (excede holgadamente el mínimo táctil de 44px).
- Contenido: imagen o placeholder de color por categoría (arriba), nombre de
  producto (`pos-text-base`, máximo 2 líneas con truncado), precio
  (`pos-text-lg`, peso 600, color `brand-500`).
- Estado normal: fondo `pos-card-bg`, borde `gray-200`.
- Estado "agotado": fondo `pos-card-disabled-bg`, opacidad de contenido 60%,
  overlay diagonal con texto "Agotado" en `danger-text`, no clickeable
  (`pointer-events: none`).
- Estado hover/press (feedback táctil): `scale(0.97)` + sombra reducida al
  presionar, para dar sensación de "botón físico".

### 5.2 Panel de carrito (POS)

- Posición: fijo a la derecha, ancho 360-400px, siempre visible (no modal).
- Lista de ítems: nombre + cantidad (con controles `+`/`-` grandes, mínimo
  44x44px) + subtotal por línea.
- Barra de total: fija al fondo del panel, fondo `pos-total-bg`, texto blanco,
  `pos-text-xl`, siempre visible sin scroll.
- Botón "Cobrar": ancho completo del panel, alto 56px, siempre el elemento
  más prominente de toda la pantalla.

### 5.3 Badge de estado de stock (compartido en ambos módulos)

- Igual estructura que el badge del proyecto de helpdesk (píldora, punto de
  color + texto): `● Normal`, `⚠ Stock bajo`, `✕ Agotado`.
- En la tabla de inventario del admin, se acompaña del número exacto de
  unidades restantes junto al badge (ej. `⚠ Stock bajo (3 unid.)`).

### 5.4 Tabla de inventario (admin)

- Mismo criterio estructural que la tabla de tickets del proyecto de
  helpdesk (encabezado `gray-50`, filas 56px, hover `gray-50`), para que
  ambos proyectos compartan un lenguaje de tabla consistente si se revisan
  juntos.
- Columnas: SKU, nombre, categoría, stock actual, stock mínimo, estado
  (badge), última actualización, acciones (ajustar / transferir).
- Fila completa con fondo tenue de advertencia (`warning-bg` al 30% opacidad)
  cuando el stock está en o por debajo del mínimo — visible de un vistazo sin
  necesidad de leer cada badge individualmente.

### 5.5 Flujo de transferencia (kanban simplificado)

- Tres columnas fijas: `Pendiente` / `En tránsito` / `Recibido`, cada
  transferencia como una tarjeta pequeña con producto, cantidad, sucursal
  origen→destino.
- Color de borde izquierdo de la tarjeta según columna (gris/azul/verde,
  reutilizando la paleta semántica de 2.3).

### 5.6 Selector de sucursal (persistente en ambos módulos si el usuario tiene acceso a varias)

- Dropdown fijo en la barra superior, siempre visible, con el nombre de la
  sucursal activa siempre legible (nunca solo un ícono).
- Cambiar de sucursal recarga el contexto de datos (stock, ventas) sin
  necesidad de recargar toda la página (fetch nuevo vía TanStack Query).

### 5.7 Botones, inputs, modales, toasts

Mismos criterios de especificación que en la guía de Mesa de Ayuda (sección 5
de ese documento): variantes primario/secundario/destructivo/ghost, tamaños
sm/md/lg, estados reposo/hover/focus/disabled/loading. Se reutiliza el mismo
sistema de componentes (`shadcn/ui`) para que ambos proyectos, aunque
visualmente distintos por su paleta de marca, compartan la misma calidad de
implementación.

---

## 6. Wireframes de las pantallas principales

### 6.1 Punto de venta (POS) — tablet horizontal

```
┌───────────────────────────────────────┬─────────────────┐
│ Sucursal: Centro ▾        🔍 Buscar    │  Carrito (3)     │
│ ┌───────┐ ┌───────┐ ┌───────┐          │ ─────────────── │
│ │Prod A │ │Prod B │ │Prod C │          │ Prod A  x2  $10 │
│ │ $5.00 │ │ $3.50 │ │AGOTADO│          │ Prod D  x1  $8  │
│ └───────┘ └───────┘ └───────┘          │ ─────────────── │
│ ┌───────┐ ┌───────┐ ┌───────┐          │                  │
│ │Prod D │ │Prod E │ │Prod F │          │ ┌──────────────┐│
│ │ $8.00 │ │ $2.00 │ │ $4.50 │          │ │ TOTAL  $18.00 ││
│ └───────┘ └───────┘ └───────┘          │ │ [  COBRAR  ]  ││
│                                          │ └──────────────┘│
└───────────────────────────────────────┴─────────────────┘
```

### 6.2 Panel de inventario (admin)

```
┌─────────┬─────────────────────────────────────────────────┐
│ Sidebar │ Inventario — Sucursal: Centro ▾   [+ Nuevo prod.] │
│         ├───────────────────────────────────────────────── │
│ Inventar│ SKU  │Nombre  │Categ.│Stock│Mín│Estado    │Acción│
│ Transfer│ P-001│Prod A  │Bebi. │ 45  │10 │● Normal  │ ⋮    │
│ Reportes│ P-002│Prod B  │Snack │ 3   │10 │⚠Stock bajo│ ⋮    │
│         │ P-003│Prod C  │Bebi. │ 0   │5  │✕Agotado  │ ⋮    │
└─────────┴─────────────────────────────────────────────────┘
```

---

## 7. Accesibilidad (WCAG 2.1 AA)

| Requisito | Aplicación |
|-----------|------------|
| Área táctil mínima | 44x44px mínimo, tarjetas POS mucho mayores (140px) |
| Contraste | Todos los pares fondo/texto cumplen 4.5:1, verificado especialmente en `pos-total-bg` (blanco sobre `brand-500`) |
| No depender solo del color | Badges de stock siempre con texto, tarjetas agotadas con overlay de texto "Agotado", no solo opacidad |
| Navegación por teclado | Panel admin 100% operable sin mouse; POS es de uso táctil primario pero no debe romperse con teclado/mouse en desarrollo |
| Confirmación de acciones destructivas | Cancelar transferencia o eliminar producto requiere modal de confirmación explícita |
| Alternativa a gráficas | Toda gráfica de reportes tiene una tabla de datos subyacente accesible, no solo el SVG visual |

---

## 8. Responsive y dispositivos reales

- **POS:** diseño primario para **tablet en horizontal** (1024x768 o
  similar), es el dispositivo real más común en negocios pequeños/medianos —
  no diseñar para desktop primero.
- **Panel admin:** desktop como caso principal (>1024px), degradando a
  tablet vertical para consulta rápida desde el piso de venta.
