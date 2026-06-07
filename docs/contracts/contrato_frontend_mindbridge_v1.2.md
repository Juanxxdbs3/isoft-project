# Contrato de la Capa de Presentación — MindBridge

## Diseño del frontend: sistema visual, pantallas, componentes y fases de construcción

---

# Contrato de la Capa de Presentación — MindBridge

## Diseño del frontend: sistema visual, pantallas, componentes y fases de construcción

---

## Historial de versiones

| Versión | Fecha      | Descripción                                                                                                                                                                                                                                                                                                                                                              |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.4     | 07-06-2026 | Forum GET endpoints completados: `GET /api/v1/forum/posts` (paginated, no auth), `GET /api/v1/forum/posts/mine` (JWT), `GET /api/v1/forum/posts/:postId` (detail), `GET /api/v1/forum/posts/:postId/comments` (comments list). PostgREST nested join pattern documented for pseudonym resolution via `student_active_pseudonym_id_fkey`. RLS policies `post_select_all_authenticated` y `comment_select_all_authenticated` implementadas. |
| 1.3     | 07-06-2026 | Fase 1 completada: login y registro con validación, Suspense boundaries, pseudonym stored in localStorage. Fase 2 completada: forum feed con sidebar fijo (fixed left-0 top-14), main content con pl-56, DiceBear avatars integrados. Fase 3 iniciada: psychologist route group creado. Backend forum CRUD endpoints implementados. JWT fix (fastify.jwt.decode). Avatar endpoint agregado. API URL fija a `http://localhost:3001/api/v1`. CAMPUS extraído a `src/frontend/src/lib/campus.ts`. Validación de student code mejorada (entry period, special community, admission position). Dark mode colors centralizados en globals.css. Hardcoded dark: overrides removidos. |
| 1.2     | 04-06-2026 | Integración de principios de diseño UI (Nielsen, Shneiderman, leyes cognitivas) como fundamento explícito de las decisiones visuales y de densidad. Cierre de decisiones de diseño pendientes de v1.1. Estandarización del sistema de tokens para coincidir con convención de código en inglés del proyecto. Actualización del roadmap al estado actual de construcción. |
| 1.1     | 27-05-2026 | Actualización del árbol de directorios con el flag --src-dir bajo Next.js 15. Cierre formal de la Paleta Verde como sistema cromático productivo y la Paleta Lavanda como alternativa de contraste en salud mental. Integración del rol del BFF en Next.js conviviendo con la API en Fastify.                                                                            |
| 1.0     | 18-05-2026 | Primera versión del contrato: principios visuales, sistema de color con modo oscuro, mapa de pantallas del estudiante, estrategia de datos mock, roadmap de seis fases.                                                                                                                                                                                                  |

---

## 1. Propósito

Este documento define el contrato de diseño y construcción de la capa de presentación de MindBridge. Establece los principios visuales, el sistema de tokens de color, la arquitectura de componentes por rol, el mapa de pantallas, la estrategia de trabajo sin backend activo y el roadmap de fases de construcción para la entrega final del proyecto el 11 de junio de 2026.

La capa de presentación se implementa utilizando Next.js 15 (App Router) con TypeScript, Tailwind CSS v4 y shadcn/ui. El frontend actúa bajo una arquitectura híbrida donde Next.js opera como servidor de presentación y como BFF (Backend-for-Frontend) para la gestión segura de sesiones y el enrutamiento protegido. El frontend consume la lógica de negocio expuesta por el backend Fastify e interactúa en tiempo real con Supabase para el chat reactivo entre psicólogo y estudiante.

Este documento es la interfaz entre el equipo de diseño, el equipo de frontend y los modelos UML del proyecto. Toda modificación debe registrarse en el historial de versiones.

---

## 2. Principios de diseño del sistema visual

Los principios que gobiernan las decisiones de este contrato se apoyan en tres marcos complementarios, documentados en detalle en `principios_diseno_ui_mindbridge.md`. A continuación se describe cómo cada marco influye en decisiones concretas del sistema.

### 2.1 Heurísticas de Nielsen aplicadas

**H8 — Diseño estético y minimalista** es el principio dominante en la interfaz del estudiante. Se traduce en baja densidad visual, máximo cuatro opciones de acción por pantalla y paginación por cursor en el foro en lugar de scroll infinito.

**H4 — Consistencia y estándares** gobierna el sistema de tokens de color semánticos. Un mismo nivel de riesgo produce el mismo color en badges, notificaciones y alertas sin variaciones arbitrarias.

**H3 — Control y libertad del usuario** se materializa en la capacidad del estudiante de editar y eliminar sus publicaciones, y en la doble confirmación requerida antes de que el psicólogo cierre un caso.

**H5 — Prevención de errores** se aplica en el formulario de registro mediante validación progresiva del seudónimo (en tiempo real) y de la contraseña.

**H6 — Reconocimiento en lugar de recuerdo** determina que las acciones disponibles para el psicólogo sobre un caso estén siempre visibles en el contexto correspondiente, sin requerir navegación adicional.

**H1 — Visibilidad del estado del sistema** obliga a que toda publicación recibida por el servidor muestre confirmación inmediata al estudiante, y a que todos los estados de carga en el panel del psicólogo estén indicados explícitamente.

### 2.2 Leyes cognitivas aplicadas

**Ley de Hick** limita las opciones simultáneas en pantalla. La interfaz del estudiante expone como máximo cuatro acciones por vista. El panel del psicólogo separa las acciones del caso (panel de alerta) de las acciones de comunicación (chat) para reducir la carga de decisión en cada contexto.

**Ley de Fitts** exige elementos interactivos grandes y accesibles en la interfaz del estudiante, que se diseña mobile-first con botones de acción táctil cómodos.

**Efecto Von Restorff** justifica el uso del color rojo para las alertas de nivel HIGH en el panel del psicólogo: el elemento visualmente distinto es procesado con prioridad.

**Principio de Pareto** orienta la priorización de pantallas: las vistas del foro (estudiante) y del panel de alertas (psicólogo) concentran el 80% de las interacciones del sistema y reciben el 80% del esfuerzo de diseño.

### 2.3 Separación emocional por rol

La interfaz del estudiante evoca calma, expresión libre y confianza. La interfaz del psicólogo evoca claridad operativa, jerarquía de información y eficiencia clínica. Estas dos identidades visuales coexisten en el mismo sistema de componentes pero con tokens de color distintos y niveles de densidad diferenciados.

### 2.4 Autenticidad emocional sobre decoración

Cada decisión visual responde al estado emocional que la pantalla evoca en su usuario, no a una preferencia estética neutral. Los colores no son decorativos: el verde base del estudiante reduce la reactividad psicológica; el sistema neutro del psicólogo favorece la lectura prolongada sin fatiga visual.

### 2.5 Modo oscuro como primera clase

El modo oscuro no es una inversión del modo claro; es un sistema paralelo con sus propios tokens. Se activa por preferencia del sistema operativo o por toggle explícito del usuario. La paleta oscura del estudiante está inspirada en Solarized Dark: fondos profundos con tinte verde, no grises neutros.

### 2.6 Densidad proporcional al rol

El estudiante opera con baja densidad visual. El psicólogo opera con densidad media: sidebar fijo, panel de alertas con múltiples elementos visibles, estadísticas de riesgo de un vistazo.

### 2.7 Accesibilidad no negociable

Todo par de colores texto/fondo debe cumplir WCAG 2.2 nivel AA (contraste mínimo 4.5:1 para texto normal). Los badges de riesgo son los elementos más críticos en este aspecto. Los componentes de entrada deben ser navegables por teclado (WCAG 2.2).

---

## 3. El rol de Next.js como BFF

Next.js 15 no opera simplemente como cliente estático. En la arquitectura de MindBridge asume responsabilidades de BFF:

**Gestión segura de sesiones.** Captura los tokens JWT emitidos por Supabase Auth al iniciar sesión y los almacena en cookies del navegador con flags `HttpOnly`, `Secure` y `SameSite=Strict`. Esto previene ataques XSS dirigidos a robar credenciales.

**Auth middleware.** Intercepta cada petición de navegación en la capa del servidor. Si un usuario intenta acceder a rutas protegidas sin el rol adecuado en su JWT, el middleware bloquea la petición redirigiendo al login antes de renderizar.

**Proxy inverso seguro.** Las llamadas del cliente a servicios externos o endpoints sensibles se canalizan a través de las API Routes internas de Next.js, evitando exponer variables de entorno o claves de API en el JavaScript del cliente.

---

## 4. Sistema de colores y tokens

Los tokens se definen en `globals.css` con la directiva `@theme` de Tailwind v4. Los valores en la base de datos y la API usan inglés (LOW, MEDIUM, HIGH); la capa de presentación traduce estos valores al español para su visualización mediante un diccionario de internacionalización en `lib/i18n/risk.ts`.

### 4.1 Modo claro — Rol estudiante

```css
:root {
  --background: #f4f9f7;
  --surface: #ffffff;
  --surface-hover: #edf5f1;
  --sidebar: #edf5f1;

  --foreground: #1a3b34;
  --muted-foreground: #6b8e85;

  --primary: #346b5a;
  --primary-foreground: #ffffff;

  --accent: #f4a261;
  --accent-foreground: #1a3b34;

  --border: #e5efea;
  --input-border: #c8ddd6;

  --risk-low-bg: #dcfce7;
  --risk-low-text: #166534;
  --risk-medium-bg: #fef3c7;
  --risk-medium-text: #92400e;
  --risk-high-bg: #fee2e2;
  --risk-high-text: #991b1b;
}
```

### 4.2 Modo oscuro — Rol estudiante (Solarized Dark)

```css
.dark {
  --background: #022c22;
  --surface: #064e3b;
  --surface-hover: #064e3b;
  --sidebar: #052e22;

  --foreground: #e5e7eb;
  --muted-foreground: #6ee7b7;

  --primary: #34d399;
  --primary-foreground: #022c22;

  --accent: #a3e635;
  --accent-foreground: #022c22;

  --border: #065f46;
  --input-border: #065f46;

  --risk-low-bg: #14532d;
  --risk-low-text: #86efac;
  --risk-medium-bg: #78350f;
  --risk-medium-text: #fcd34d;
  --risk-high-bg: #7f1d1d;
  --risk-high-text: #fca5a5;
}
```

### 4.3 Modo claro — Rol psicólogo

```css
.psychologist-theme {
  --background: #f8fafc;
  --surface: #ffffff;
  --surface-hover: #f1f5f9;
  --sidebar: #edf5f1;

  --foreground: #1e293b;
  --muted-foreground: #64748b;

  --primary: #6c5dd3;
  --primary-foreground: #ffffff;

  --accent: #10b981;
  --accent-foreground: #ffffff;

  --border: #e2e8f0;
  --input-border: #cbd5e1;

  --risk-low-bg: #dcfce7;
  --risk-low-text: #166534;
  --risk-medium-bg: #fef3c7;
  --risk-medium-text: #92400e;
  --risk-high-bg: #fee2e2;
  --risk-high-text: #991b1b;
}
```

### 4.4 Modo oscuro — Rol psicólogo

```css
.psychologist-theme.dark {
  --background: #0f172a;
  --surface: #1e293b;
  --surface-hover: #263348;
  --sidebar: #0f2d2a;

  --foreground: #f8fafc;
  --muted-foreground: #94a3b8;

  --primary: #7c6ddb;
  --primary-foreground: #ffffff;

  --accent: #34d399;
  --accent-foreground: #0f172a;

  --border: #1e293b;
  --input-border: #334155;
}
```

### 4.5 Paleta Lavanda (alternativa documentada)

La paleta lavanda se documenta como alternativa de contraste para escenarios de diseño distintos al productivo. No está en uso en el MVP.

```css
/* Documentada para referencia de diseño; no se implementa en v1 */
:root {
  --color-background: #f6f5ff;
  --color-surface: #ffffff;
  --color-foreground: #1e1b3a;
  --color-muted: #7875a8;
  --color-primary: #6c5dd3;
  --color-accent: #f4a261;
  --color-border: #e4e2f5;
}
```

### 4.6 Tipografía

```
Rol estudiante:
  - Títulos: Nunito, 700
  - Cuerpo:  Inter, 400/500

Rol psicólogo:
  - Títulos y cuerpo: Inter, 400/500/600
```

---

## 5. Estructura de carpetas del proyecto

El flag `--src-dir` de Next.js 15 aísla el código fuente de las configuraciones de despliegue.

```
isoft-project/
└── src/
    ├── frontend/
    │   ├── package.json
    │   ├── next.config.ts
    │   ├── tailwind.config.ts
    │   └── src/
    │       ├── app/
    │       │   ├── favicon.ico
    │       │   ├── globals.css
    │       │   ├── layout.tsx
    │       │   ├── page.tsx                  ← Landing page pública
    │       │   ├── terminos/
    │       │   ├── (auth)/
    │       │   │   ├── login/
    │       │   │   └── register/
    │       │   ├── (student)/
    │       │   │   ├── layout.tsx
    │       │   │   ├── foro/
    │       │   │   │   └── [id]/
    │       │   │   ├── perfil/
    │       │   │   ├── configuracion/
    │       │   │   └── chat/
    │       │   └── (psychologist)/
    │       │       ├── layout.tsx
    │       │       ├── dashboard/
    │       │       ├── alerts/
    │       │       │   └── [alertId]/
    │       │       └── cases/
    │       │           └── [caseId]/
    │       │               └── chat/
    │       ├── components/
    │       │   ├── forum/
    │       │   ├── chat/
    │       │   ├── alerts/
    │       │   └── ui/                       ← Primitivos shadcn/ui
     │       ├── lib/
     │       │   ├── utils.ts
     │       │   ├── campus.ts                ← All 11 campuses as const
     │       │   ├── student-code.ts          ← Student code validation
     │       │   ├── i18n/
     │       │   │   └── risk.ts               ← Diccionario LOW→Bajo, etc.
     │       │   └── mock/
     │       │       ├── posts.json
     │       │       ├── alerts.json
     │       │       └── chat-messages.json
    │       └── types/
    │           └── domain.ts
    ├── backend/
    └── nlp_engine/
```

---

## 6. Arquitectura de componentes

### 6.1 Clasificación

**UI Components** — renderizan datos sin gestionar estado de interacción. Server Components por defecto.

| Componente       | Descripción                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `PostCard`       | Tarjeta de publicación: seudónimo, texto, fecha, conteo de comentarios |
| `PostFeed`       | Lista de PostCards con layout de feed                                  |
| `CommentItem`    | Comentario con referencia a cita opcional                              |
| `AlertCard`      | Tarjeta de alerta con RiskBadge                                        |
| `AlertList`      | Lista de AlertCards ordenada por prioridad                             |
| `RiskBadge`      | Badge semántico LOW/MEDIUM/HIGH con tokens de color correspondientes   |
| `ProfileHistory` | Historial de publicaciones propias del estudiante                      |
| `MessageBubble`  | Burbuja de mensaje en el chat                                          |

**Avatar Implementation:** Los avatares se generan dinámicamente usando DiceBear Open Peeps API (`https://api.dicebear.com/10.x/open-peeps/svg?seed=<pseudonym>`). El proveedor se configura mediante la variable de entorno `NEXT_PUBLIC_AVATAR_BASE_URL`.

**UI Process Components** — gestionan estado de interacción, formularios, efectos. Client Components (`"use client"`).

| Componente         | Descripción                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `RegisterForm`     | Registro del estudiante con validación progresiva de seudónimo y contraseña |
| `LoginForm`        | Login con redirección por rol post-autenticación                            |
| `CreatePostForm`   | Nueva publicación con indicador de envío                                    |
| `ChatWindow`       | Ventana de chat con scroll automático                                       |
| `AlertDetailPanel` | Panel de detalle con acciones de aceptación y gestión                       |
| `ThemeToggle`      | Toggle claro/oscuro persistido                                              |

### 6.2 Regla de composición

Un UI Process Component puede contener UI Components como `children`. Un UI Component nunca importa un UI Process Component.

---

## 7. Mapa de pantallas

### 7.1 Rol estudiante

| Ruta             | Archivo                                 | RF asociados |
| ---------------- | --------------------------------------- | ------------ |
| `/`              | `app/page.tsx`                          | —            |
| `/registro`      | `app/(auth)/register/page.tsx`          | RF01, RF02   |
| `/login`         | `app/(auth)/login/page.tsx`             | —            |
| `/foro`          | `app/(student)/foro/page.tsx`           | RF07, RF08   |
| `/foro/[id]`     | `app/(student)/foro/[id]/page.tsx`      | RF08, RF12   |
| `/perfil`        | `app/(student)/perfil/page.tsx`         | RF11, RF22   |
| `/configuracion` | `app/(student)/configuracion/page.tsx`  | —            |
| `/chat`          | `app/(student)/chat/page.tsx`           | RF23         |
| `/terminos`      | `app/terminos/page.tsx`                 | —            |

### 7.2 Rol psicólogo

| Ruta                         | Archivo                                           | RF asociados     |
| ---------------------------- | ------------------------------------------------- | ---------------- |
| `/panel`                     | `app/(psychologist)/dashboard/page.tsx`           | RF15, RF16       |
| `/panel/alertas/[alertId]`   | `app/(psychologist)/alerts/[alertId]/page.tsx`    | RF14, RF19, RF21 |
| `/panel/casos/[caseId]/chat` | `app/(psychologist)/cases/[caseId]/chat/page.tsx` | RF23, RF24       |

---

## 8. Decisiones de diseño cerradas

Las siguientes decisiones estaban pendientes en v1.1 y quedan resueltas en esta versión:

**Identificador de login del estudiante.** El estudiante se registra con seudónimo, contraseña, código estudiantil y sede. El seudónimo puede generarse automáticamente si el campo se envía vacío. El código estudiantil se encripta antes de persistir y no se muestra en ninguna interfaz.

**Paginación del foro.** Se implementa paginación por cursor basada en `created_at` (timestamp ISO 8601) internamente en las llamadas a la API. El frontend presenta una barra de navegación horizontal con números de página (`‹ 1 2 3 … 10 ›`), no scroll infinito. El cursor se gestiona internamente para las solicitudes al backend.

**Consentimiento FO-BU-O13.** El psicólogo envía el enlace al formulario Google Forms desde el módulo de chat mediante un mensaje de tipo `CHARACTERIZATION_LINK`. El backend inyecta la URL configurada automáticamente.

**Roles administrativos en el MVP.** El MVP solo contempla los roles Estudiante y Psicólogo. Los roles Administrador y Superadministrador se gestionan directamente desde Supabase Studio en esta versión.

**Traducción de enums.** Los valores de enums que devuelve la API están en inglés (LOW, MEDIUM, HIGH; PENDING, ACCEPTED, etc.). El archivo `lib/i18n/risk.ts` contiene el diccionario de traducción para la presentación en español.

---

## 9. Estrategia de datos mock

Mientras el backend no esté disponible, las pantallas consumen datos desde `lib/mock/`. Estos archivos replican la forma exacta del JSON que el backend entregará, constituyendo el contrato de la API expresado como datos de ejemplo.

```typescript
// types/domain.ts

interface Post {
  id: string;
  pseudonym: string;
  text_content: string;
  created_at: string;
  status: "VISIBLE" | "MODERATED" | "DELETED";
  comment_count: number;
  is_own: boolean;
}

interface Alert {
  id: string;
  pseudonym: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  status:
    | "PENDING"
    | "ACCEPTED"
    | "SERVED"
    | "FALSE_POSITIVE"
    | "COMPLEMENTARY";
  trigger_text: string;
  generated_at: string;
  is_complementary: boolean;
  nlp_scores: {
    depression: number;
    anxiety: number;
    suicidal: number;
    imb: number;
    suicidal_override: boolean;
  };
}

interface ChatMessage {
  id: string;
  sender_role: "STUDENT" | "PSYCHOLOGIST";
  text_content: string;
  type: "STANDARD_TEXT" | "APPOINTMENT_PROPOSAL" | "CHARACTERIZATION_LINK";
  sent_at: string;
  read: boolean;
}
```

---

## 10. Restricciones no funcionales

| Restricción                   | Valor                                                  | Referencia                       |
| ----------------------------- | ------------------------------------------------------ | -------------------------------- |
| Contraste mínimo texto/fondo  | 4.5:1 (WCAG 2.2 AA)                                    | Accesibilidad                    |
| Tiempo de carga inicial (LCP) | < 2.5 segundos                                         | Core Web Vitals                  |
| Modo oscuro                   | Sí, con toggle y persistencia                          | Principio 2.5                    |
| Soporte mobile                | Diseño responsive, mobile-first                        | Contexto universitario           |
| Framework                     | Next.js 15, App Router, TypeScript                     | RD-08                            |
| Librería de componentes       | shadcn/ui sobre Tailwind CSS v4                        | RD-08                            |
| Autenticación                 | Supabase Auth, JWT, SSR middleware                     | RD-06                            |
| Anonimato visible             | El estudiante siempre ve su seudónimo, nunca su nombre | RD-04                            |
| Sin scroll infinito           | Paginación por cursor en el foro                       | Decisión 8 (Hick + Von Restorff) |
| Navegación por teclado        | Componentes de entrada navegables                      | WCAG 2.2                         |

---

## 11. Roadmap de construcción

### Fase 0 — Fundación ✅ COMPLETADA

Creación del proyecto Next.js con `--src-dir`. Configuración de Tailwind con tokens de color para ambos modos y roles. Instalación y configuración de shadcn/ui. Definición de `types/domain.ts`. Configuración de Supabase Auth básica.

### Fase 1 — Landing y autenticación ✅ COMPLETADA

Landing page con identidad visual del sistema. Formulario de registro (RF01, RF02) con validación progresiva del seudónimo y contraseña. Formulario de login con redirección por rol. Middleware de protección de rutas. Suspense boundaries para `useSearchParams()`. Pseudonym stored in localStorage con `created_at` y `avatar_url` from `/auth/me`.

**Pantallas:** `/`, `/registro`, `/login`.

### Fase 2 — Foro del estudiante ✅ COMPLETADA

Feed de publicaciones con paginación por cursor. Sidebar fijo (`fixed left-0 top-14`), main content con `pl-56` para offset. Crear publicación. Detalle de publicación con comentarios. Perfil con historial de publicaciones propias (reads from localStorage). Eliminación y edición (RF11, RF12). DiceBear avatars integrados. Avatar URL support via `PATCH /api/v1/forum/profile/avatar`.

**Pantallas:** `/foro`, `/foro/[id]`, `/perfil`.

### Fase 3 — Panel del psicólogo 🔄 EN EJECUCIÓN

Dashboard con lista de alertas priorizadas y RiskBadges. Detalle de alerta con puntuaciones NLP (RF14). Aceptación de caso (RF19). Chat básico (RF23).

**Pantallas:** `/panel`, `/panel/alertas/[alertId]`, `/panel/casos/[caseId]/chat`.
**Status:** Route group `(psychologist)/layout.tsx` + `dashboard/page.tsx` created. Layout pending.

### Fase 4 — Integración con backend 🔄 EN EJECUCIÓN

Reemplazo de funciones mock por llamadas reales al backend Fastify. Backend forum CRUD endpoints ya implementados (`POST /api/v1/forum/posts`, `PATCH`, `DELETE`, comments). JWT fix applied (`fastify.jwt.decode()`). Avatar endpoint implemented. Conexión con Supabase Realtime para el chat. Manejo de estados de carga, error y vacío en todas las pantallas.

**Status:** Forum endpoints working. Auth, Alerts, Cases, Chat endpoints pending.

### Fase 5 — Integración NLP y funciones avanzadas 🔲 PENDIENTE

Visualización de resultado del análisis NLP en el panel del psicólogo. Moderación retroactiva visible en el foro. Protocolo de recaptura de chats inactivos (RF20). Exportación de caso como PDF (RF04).

**Precondición:** Fase 4 completada, microservicio NLP integrado con el backend.

### Fase 6 — Pulido y entrega 🔲 PENDIENTE

Accesibilidad final (contraste, teclado, roles ARIA). Optimización de rendimiento. Cierre de diagramas UML pendientes.

---

## 12. Contrato de API — Forum Endpoints

### Endpoints GET (sin autenticación)

#### `GET /api/v1/forum/posts?page=1&limit=10`

Retorna todas las publicaciones visibles, paginadas por cursor basado en `created_at`.

**Parámetros de query:**
- `page` (number, default 1): número de página
- `limit` (number, default 10): cantidad de posts por página

**Respuesta (200):**
```json
{
  "data": {
    "posts": [
      {
        "id": "uuid",
        "pseudonym": "string",
        "text": "string",
        "createdAt": "2026-06-07T10:30:00Z",
        "status": "VISIBLE",
        "campus": "string"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 10
  }
}
```

#### `GET /api/v1/forum/posts/:postId`

Retorna el detalle de una publicación individual con su seudónimo.

**Respuesta (200):**
```json
{
  "data": {
    "id": "uuid",
    "pseudonym": "string",
    "text": "string",
    "createdAt": "2026-06-07T10:30:00Z",
    "status": "VISIBLE",
    "campus": "string"
  }
}
```

#### `GET /api/v1/forum/posts/:postId/comments`

Retorna todos los comentarios de una publicación, ordenados por `created_at` ASC.

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "pseudonym": "string",
      "text": "string",
      "createdAt": "2026-06-07T10:35:00Z",
      "status": "VISIBLE"
    }
  ]
}
```

### Endpoints GET (con autenticación JWT)

#### `GET /api/v1/forum/posts/mine`

Retorna todas las publicaciones del estudiante autenticado.

**Headers requeridos:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Respuesta (200):**
```json
{
  "data": {
    "posts": [
      {
        "id": "uuid",
        "pseudonym": "string",
        "text": "string",
        "createdAt": "2026-06-07T10:30:00Z",
        "status": "VISIBLE",
        "campus": "string"
      }
    ]
  }
}
```

### Estructura de datos — PostItem

```typescript
interface PostItem {
  id: string;              // UUID
  pseudonym: string;       // from student → pseudonym.texto
  text: string;            // from text_content
  createdAt: string;       // ISO 8601
  status: "VISIBLE" | "MODERATED" | "DELETED";
  campus?: string;         // from student.campus (solo en list/detail endpoints)
}
```

### Estructura de datos — CommentItem

```typescript
interface CommentItem {
  id: string;
  pseudonym: string;
  text: string;
  createdAt: string;
  status: "VISIBLE" | "MODERATED" | "DELETED";
}
```

### Patrón PostgREST para resolución de seudónimo

Los endpoints utilizan un join anidado de PostgREST para resolver el seudónimo a través de dos relaciones:

```
student:student_id (
  campus,
  pseudonym:student_active_pseudonym_id_fkey (
    texto,
    avatar_url
  )
)
```

**Requisito crítico:** La restricción de clave foránea debe tener el nombre exacto `student_active_pseudonym_id_fkey` en la columna `student.active_pseudonym_id → pseudonym.id`. Si el nombre auto-generado difiere, debe recrearse con este nombre exacto para que PostgREST pueda resolver la relación.

### Políticas RLS

Se han creado dos políticas RLS en Supabase para permitir acceso público a contenido visible:

- **`post_select_all_authenticated`** — Permite SELECT en tabla `post` WHERE `status = 'VISIBLE'` para usuarios autenticados
- **`comment_select_all_authenticated`** — Permite SELECT en tabla `comment` WHERE `status = 'VISIBLE'` para usuarios autenticados

Estas políticas reemplazan las políticas anteriores por usuario/psicólogo, simplificando el modelo de seguridad.

---

## 13. Pendientes formalizados

El mecanismo de aplicación del tema por rol (clase CSS en `<html>` vs atributo `data-role`) debe definirse antes de la Fase 3, ya que afecta la forma en que los tokens del psicólogo sobreescriben los del estudiante en el `layout.tsx` de cada route group.

El layout del panel del psicólogo (sidebar fijo vs topbar) queda pendiente hasta el wireframe de la Fase 3. Impacta el `layout.tsx` de `(psychologist)`.
