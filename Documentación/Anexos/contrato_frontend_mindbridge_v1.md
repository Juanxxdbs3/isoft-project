# Contrato de la Capa de Presentación — MindBridge
## Diseño del frontend: sistema visual, pantallas, componentes y fases de construcción

---

## Historial de versiones

| Versión | Fecha | Descripción |
|---|---|---|
| 1.0 | 18-05-2026 | Primera versión del contrato: principios visuales, sistema de color con modo oscuro, mapa de pantallas del estudiante, estrategia de datos mock, roadmap de seis fases. |

---

## 1. Propósito

Este documento define el contrato de diseño y construcción de la capa de presentación de MindBridge. Establece los principios visuales, el sistema de tokens de color, la arquitectura de componentes por rol, el mapa de pantallas, la estrategia de trabajo sin backend activo y el roadmap de fases.

La capa de presentación se implementa con Next.js 15 (App Router), TypeScript, Tailwind CSS 4 y shadcn/ui. Se integra con Supabase Auth para gestión de sesiones y consumirá el backend Fastify cuando este esté disponible. Hasta ese momento, opera con datos mock estructurados que definen de facto el contrato de la API.

Este documento es una interfaz entre el diseño visual, el desarrollo frontend y los modelos UML que se entregarán el 11 de junio. Toda modificación debe registrarse en el historial de versiones.

---

## 2. Principios de diseño del sistema visual

**Separación emocional por rol.** La interfaz del estudiante evoca calma, expresión libre y confianza. La interfaz del psicólogo evoca claridad operativa, jerarquía de información y eficiencia. Estas dos identidades visuales coexisten en el mismo sistema de componentes pero con tokens de color distintos.

**Autenticidad emocional sobre decoración.** Cada decisión visual (color, tipografía, espaciado, densidad) debe responder al estado emocional que la pantalla evoca en su usuario, no a una preferencia estética neutral. Un formulario de registro de un estudiante en malestar no se diseña igual que un formulario de login administrativo.

**Modo oscuro como primera clase.** El modo oscuro no es una inversión del modo claro; es un sistema paralelo con sus propios tokens. Se activa por preferencia del sistema operativo (automático) o por toggle explícito del usuario. La paleta oscura para el estudiante está inspirada en Solarized Dark: fondos profundos con tinte verde, no fondos neutros grises.

**Densidad proporcional al rol.** El estudiante opera con baja densidad visual: márgenes generosos, una acción principal por pantalla, sin columnas laterales en mobile. El psicólogo opera con densidad media: sidebar fijo, panel de alertas con múltiples elementos visibles, estadísticas de riesgo en un vistazo.

**Accesibilidad no negociable.** Todo par de colores texto/fondo debe cumplir WCAG 2.2 nivel AA (contraste mínimo 4.5:1 para texto normal). Los badges de riesgo son los elementos más críticos en este aspecto.

**Componentes propios, shadcn como base.** shadcn/ui provee los primitivos (Button, Input, Card, Dialog, Badge, etc.). Los componentes específicos del dominio (PostCard, AlertCard, RiskBadge, ChatBubble) se construyen sobre esos primitivos con los tokens del tema.

---

## 3. Sistema de colores y tokens

### 3.1 Modo claro — Rol estudiante

```css
:root {
  /* Fondos */
  --background: #F4F9F7;          /* Base general: verde crema muy pálido */
  --surface: #FFFFFF;             /* Tarjetas y paneles */
  --surface-hover: #EDF5F1;       /* Hover en tarjetas */

  /* Texto */
  --foreground: #1A3B34;          /* Texto principal: verde muy oscuro */
  --muted-foreground: #6B8E85;    /* Texto secundario */

  /* Acento principal */
  --primary: #346B5A;             /* Verde medio: botones, links activos */
  --primary-foreground: #FFFFFF;

  /* Acento energético (CTA secundarios, highlights) */
  --accent: #F4A261;              /* Naranja cálido */
  --accent-foreground: #1A3B34;

  /* Bordes y separadores */
  --border: #E5EFEA;
  --input-border: #C8DDD6;

  /* Semánticos de riesgo (no aplican al estudiante directamente) */
  --risk-low-bg: #DCFCE7;
  --risk-low-text: #166534;
  --risk-medium-bg: #FEF3C7;
  --risk-medium-text: #92400E;
  --risk-high-bg: #FEE2E2;
  --risk-high-text: #991B1B;
}
```

### 3.2 Modo oscuro — Rol estudiante (inspirado en Solarized Dark)

```css
.dark {
  /* Fondos: tinte verde profundo, no gris neutro */
  --background: #0D2321;
  --surface: #122E29;
  --surface-hover: #1A3B34;

  /* Texto */
  --foreground: #E2F0EB;
  --muted-foreground: #7DADA0;

  /* Acento principal */
  --primary: #5BAF94;             /* Verde más luminoso para contraste sobre oscuro */
  --primary-foreground: #0D2321;

  /* Acento energético */
  --accent: #F4A261;
  --accent-foreground: #0D2321;

  /* Bordes */
  --border: #1E4A40;
  --input-border: #2A5C50;

  /* Semánticos de riesgo (ajustados para fondos oscuros) */
  --risk-low-bg: #14532D;
  --risk-low-text: #86EFAC;
  --risk-medium-bg: #78350F;
  --risk-medium-text: #FCD34D;
  --risk-high-bg: #7F1D1D;
  --risk-high-text: #FCA5A5;
}
```

### 3.3 Modo claro — Rol psicólogo

```css
[data-role="psychologist"]:root,
.psychologist-theme {
  --background: #F8FAFC;
  --surface: #FFFFFF;
  --surface-hover: #F1F5F9;

  --foreground: #1E293B;
  --muted-foreground: #64748B;

  --primary: #6C5DD3;             /* Morado: acciones principales */
  --primary-foreground: #FFFFFF;

  --accent: #10B981;              /* Verde esmeralda: estados ok, confirmaciones */
  --accent-foreground: #FFFFFF;

  --border: #E2E8F0;
  --input-border: #CBD5E1;

  /* Semánticos de riesgo (iguales, son estándar del sistema) */
  --risk-low-bg: #DCFCE7;
  --risk-low-text: #166534;
  --risk-medium-bg: #FEF3C7;
  --risk-medium-text: #92400E;
  --risk-high-bg: #FEE2E2;
  --risk-high-text: #991B1B;
}
```

### 3.4 Modo oscuro — Rol psicólogo

```css
.psychologist-theme.dark {
  --background: #0F172A;
  --surface: #1E293B;
  --surface-hover: #263348;

  --foreground: #F8FAFC;
  --muted-foreground: #94A3B8;

  --primary: #7C6DDB;
  --primary-foreground: #FFFFFF;

  --accent: #34D399;
  --accent-foreground: #0F172A;

  --border: #1E293B;
  --input-border: #334155;
}
```

### 3.5 Tipografía

```
Rol estudiante:
  - Títulos: Nunito, 700 (amigable, redondeada)
  - Cuerpo: Inter, 400/500

Rol psicólogo:
  - Títulos y cuerpo: Inter, 400/500/600

Ambos roles heredan el mismo sistema base;
la diferencia es el peso y el uso de Nunito en headings del estudiante.
```

---

## 4. Arquitectura de componentes

### 4.1 Clasificación según arquitectura de referencia

Siguiendo la arquitectura de capas del proyecto, los componentes se clasifican en dos tipos que corresponden al modelo de Vista Lógica:

**UI Components** — renderizan datos sin gestionar estado de interacción. Son Server Components por defecto en Next.js.

| Componente | Descripción |
|---|---|
| `PostCard` | Tarjeta de publicación en el foro: seudónimo, texto, fecha, número de comentarios |
| `PostFeed` | Lista de PostCards con layout de feed |
| `CommentItem` | Un comentario con referencia a cita opcional |
| `AlertCard` | Tarjeta de alerta con badge de nivel de riesgo |
| `AlertList` | Lista de AlertCards ordenadas por prioridad |
| `RiskBadge` | Badge semántico (Bajo / Medio / Alto) con color del token correspondiente |
| `ProfileHistory` | Historial de publicaciones propias del estudiante |
| `MessageBubble` | Burbuja de mensaje en el chat |

**UI Process Components** — gestionan estado de interacción, formularios, efectos. Son Client Components (`"use client"`).

| Componente | Descripción |
|---|---|
| `RegisterForm` | Formulario de registro del estudiante (RF01, RF02) |
| `LoginForm` | Login con selección de rol implícita |
| `CreatePostForm` | Formulario de nueva publicación con validación de longitud |
| `ChatWindow` | Ventana de chat con scroll automático y campo de respuesta |
| `AlertDetailPanel` | Panel de detalle de alerta con acciones de aceptación/cierre |
| `ThemeToggle` | Toggle claro/oscuro persistido en localStorage |

### 4.2 Regla de composición

Un UI Process Component puede contener UI Components como `children`. Un UI Component nunca puede importar un UI Process Component. Esta regla mantiene el renderizado del servidor en los componentes que muestran datos y confina la interactividad a los componentes que la requieren explícitamente.

---

## 5. Mapa de pantallas — Rol estudiante (Fase 1 y 2)

| Ruta | Archivo | Tipo | RF asociados |
|---|---|---|---|
| `/` | `app/page.tsx` | Landing | — |
| `/registro` | `app/(auth)/register/page.tsx` | Auth | RF01, RF02 |
| `/login` | `app/(auth)/login/page.tsx` | Auth | — |
| `/foro` | `app/(student)/forum/page.tsx` | Feed | RF07, RF08 |
| `/foro/[postId]` | `app/(student)/forum/[postId]/page.tsx` | Detalle | RF08, RF12 |
| `/perfil` | `app/(student)/profile/page.tsx` | Perfil | RF11, RF22 |
| `/chat` | `app/(student)/chat/page.tsx` | Chat | RF23 |

### Flujo de navegación

```
Landing (/)
  ├── → /registro  (CTA principal)
  └── → /login     (enlace secundario)

/login
  └── → /foro      (redirect post-auth, rol estudiante)

/foro
  ├── → /foro/[postId]   (click en tarjeta)
  ├── → crear publicación (modal o ruta /foro/nueva)
  └── → /perfil          (navbar)

/perfil
  └── → /foro            (navbar)

/chat
  └── solo accesible cuando el psicólogo inicia conversación
```

---

## 6. Mapa de pantallas — Rol psicólogo (Fase 3)

| Ruta | Archivo | Tipo | RF asociados |
|---|---|---|---|
| `/panel` | `app/(psychologist)/dashboard/page.tsx` | Dashboard | RF15, RF16 |
| `/panel/alertas/[alertId]` | `app/(psychologist)/alerts/[alertId]/page.tsx` | Detalle | RF14, RF19, RF21 |
| `/panel/chat/[chatId]` | `app/(psychologist)/chat/[chatId]/page.tsx` | Chat | RF23, RF24 |

---

## 7. Estrategia de datos mock

Mientras el backend Fastify no esté disponible, cada pantalla consume datos desde archivos estáticos en `lib/mock/`. Estos archivos definen la forma exacta del JSON que el backend deberá entregar — son el contrato de la API expresado como datos de ejemplo.

### Estructura de archivos mock

```
lib/mock/
  posts.json          → lista de publicaciones del foro
  post-detail.json    → detalle de una publicación con comentarios
  alerts.json         → lista de alertas para el psicólogo
  alert-detail.json   → detalle de alerta con puntuaciones NLP
  chat-messages.json  → historial de mensajes de un chat
  profile.json        → perfil del estudiante con historial
```

### Contrato mínimo de tipos (domain.ts)

```typescript
interface Post {
  id: string;
  pseudonym: string;
  text: string;
  createdAt: string;        // ISO 8601
  status: "visible" | "moderated" | "deleted";
  commentCount: number;
}

interface Alert {
  id: string;
  pseudonym: string;
  riskLevel: "bajo" | "medio" | "alto";
  status: "pendiente" | "aceptada" | "atendida" | "falso_positivo";
  triggerText: string;
  createdAt: string;
  scores: {
    depression: number;    // 0-100
    anxiety: number;       // 0-100
    suicidal: number;      // 0-100
    imb: number;           // 0-100
    suicidalOverride: boolean;
  };
  isComplementary: boolean;
}

interface ChatMessage {
  id: string;
  sender: "student" | "psychologist";
  text: string;
  type: "texto" | "propuesta_cita" | "recurso_bienestar";
  sentAt: string;
  read: boolean;
}
```

Cuando el backend esté disponible, se reemplaza la función `fetchMockPosts()` por `fetchPosts()` que llama al endpoint real. La forma del dato no cambia.

---

## 8. Restricciones no funcionales

| Restricción | Valor | Referencia |
|---|---|---|
| Contraste mínimo texto/fondo | 4.5:1 (WCAG 2.2 AA) | Accesibilidad |
| Tiempo de carga inicial (LCP) | < 2.5 segundos | Core Web Vitals |
| Modo oscuro | Sí, con toggle y persistencia | frontend_details.docx |
| Soporte mobile | Diseño responsive, mobile-first | Contexto universitario |
| Framework | Next.js 15, App Router, TypeScript | D-27 |
| Librería de componentes | shadcn/ui sobre Tailwind CSS 4 | D-27 |
| Autenticación | Supabase Auth, JWT, SSR middleware | RD-06 |
| Anonimato visible | El estudiante siempre ve su seudónimo, nunca su nombre | RD-04 |
| Sin scroll infinito | Paginación o carga manual para el foro | frontend_details.docx |

---

## 9. Roadmap de construcción

### Fase 0 — Fundación ✅ PENDIENTE
Creación del proyecto Next.js. Configuración de Tailwind con tokens de color completos (modo claro y oscuro, roles estudiante y psicólogo). Instalación y configuración de shadcn/ui. Definición de `types/domain.ts`. Configuración de Supabase Auth básica (puede usarse mock de auth hasta la Fase 1).

**Artefactos UML generados:** ninguno. Artefactos internos: `tailwind.config.ts`, `globals.css`, `types/domain.ts`.

### Fase 1 — Landing y autenticación 🔲 PLANIFICADA
Landing page completa con identidad visual del sistema. Formulario de registro (RF01, RF02) con validación de campos y seudónimo único. Formulario de login con redirección por rol. Middleware de protección de rutas.

**Pantallas:** `/`, `/registro`, `/login`.
**Artefactos UML generados:** Caso de uso de diseño RF01/RF02, diagrama de secuencia del flujo de registro.
**Precondición para abordarla:** Fase 0 completada, wireframe de landing aprobado en Miro.

### Fase 2 — Foro del estudiante 🔲 PLANIFICADA
Feed de publicaciones con datos mock. Crear publicación (formulario con validación de longitud mínima). Detalle de publicación con comentarios. Perfil con historial de publicaciones propias. Eliminación y edición de publicación (RF11, RF12).

**Pantallas:** `/foro`, `/foro/[postId]`, `/perfil`.
**Artefactos UML generados:** Casos de uso de diseño RF07/RF08/RF11/RF12, diagrama de secuencia de publicación → NLP (con actor externo mock).
**Precondición:** Fase 1 completada, tipos de datos mock definidos en `lib/mock/`.

### Fase 3 — Panel del psicólogo 🔲 PLANIFICADA
Dashboard con lista de alertas priorizadas y badges de riesgo. Detalle de alerta con puntuaciones NLP visibles (RF14). Aceptación de caso (RF19). Inicio de chat desde alerta aceptada. Chat básico (RF23).

**Pantallas:** `/panel`, `/panel/alertas/[alertId]`, `/panel/chat/[chatId]`.
**Artefactos UML generados:** Casos de uso RF14/RF16/RF19/RF23, diagrama de secuencia aceptación de alerta → revelación de identidad.
**Precondición:** Fase 2 completada, datos mock de alertas con scores NLP definidos.

### Fase 4 — Integración con backend 🔲 PENDIENTE
Reemplazo de funciones mock por llamadas reales al backend Fastify. Conexión con Supabase Realtime para el chat. Manejo de estados de carga, error y vacío en todas las pantallas.

**Precondición:** Backend Fastify con endpoints definidos y funcionales para publicaciones, alertas y chat.

### Fase 5 — Integración con NLP y funciones avanzadas 🔲 PENDIENTE
Visualización en tiempo real del resultado del análisis NLP en el panel del psicólogo. Moderación retroactiva visible en el foro. Protocolo de recaptura de chats inactivos (RF20). Exportación de caso como PDF (RF04).

**Precondición:** Fase 4 completada, microservicio NLP integrado con el backend.

### Fase 6 — Pulido y entrega 🔲 PENDIENTE
Accesibilidad final (contraste, navegación por teclado, roles ARIA). Optimización de rendimiento (lazy loading, Image component de Next.js). Cierre de diagramas UML pendientes. Manual de usuario.

---

## 10. Pendientes formalizados

La decisión sobre el mecanismo de cambio de tema por rol (aplicar clase CSS en `<html>` según el rol autenticado o usar `data-role` attribute) debe tomarse antes de comenzar la Fase 0. Afecta la forma en que los tokens del psicólogo sobreescriben los del estudiante.

La definición del layout del psicólogo (sidebar fijo vs. topbar) queda pendiente hasta el wireframe de la Fase 3. La decisión impacta el `layout.tsx` del route group `(psychologist)`.

El mecanismo de paginación del foro (paginación por cursor vs. paginación por número de página) queda pendiente hasta la Fase 2. Afecta tanto el componente de feed como el contrato de la API.
