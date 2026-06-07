# MindBridge — Sistema visual

## Principios aplicados (referencia a `principios_diseno_ui_mindbridge.md`)

- **H8 Nielsen**: máximo 4 opciones de acción por pantalla. Sin scroll infinito en foro, pagínación númerica o con símbolos en su lugar.
- **Ley de Hick**: acciones del panel del psicólogo separadas de acciones del chat.
- **Ley de Fitts**: botones táctiles grandes en móvil. Diseño mobile-first para el estudiante.
- **Von Restorff**: badge rojo para riesgo HIGH — distinguible sin leer el texto.
- **WCAG 2.2 AA**: contraste mínimo 4.5:1 en todo par texto/fondo.

## Tipografía

| Contexto              | Fuente | Peso            |
| --------------------- | ------ | --------------- |
| Títulos estudiante    | Nunito | 700             |
| Cuerpo estudiante     | Inter  | 400 / 500       |
| Todo el rol psicólogo | Inter  | 400 / 500 / 600 |

## Tokens de color

### Modo claro — Estudiante (`:root`)

```css
--background: #f4f9f7;
--surface: #ffffff;
--surface-hover: #edf5f1;
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
```

### Modo oscuro — Estudiante (`.dark`)

```css
--background: #0d2321;
--surface: #122e29;
--surface-hover: #1a3b34;
--foreground: #e2f0eb;
--muted-foreground: #7dada0;
--primary: #5baf94;
--primary-foreground: #0d2321;
--accent: #f4a261;
--accent-foreground: #0d2321;
--border: #1e4a40;
--input-border: #2a5c50;
--risk-low-bg: #14532d;
--risk-low-text: #86efac;
--risk-medium-bg: #78350f;
--risk-medium-text: #fcd34d;
--risk-high-bg: #7f1d1d;
--risk-high-text: #fca5a5;
```

### Modo claro — Psicólogo (`.psychologist-theme`)

```css
--background: #f8fafc;
--surface: #ffffff;
--surface-hover: #f1f5f9;
--foreground: #1e293b;
--muted-foreground: #64748b;
--primary: #6c5dd3;
--primary-foreground: #ffffff;
--accent: #10b981;
--accent-foreground: #ffffff;
--border: #e2e8f0;
--input-border: #cbd5e1;
/* Risk tokens: mismos que modo claro estudiante */
```

### Modo oscuro — Psicólogo (`.psychologist-theme.dark`)

```css
--background: #0f172a;
--surface: #1e293b;
--surface-hover: #263348;
--foreground: #f8fafc;
--muted-foreground: #94a3b8;
--primary: #7c6ddb;
--primary-foreground: #ffffff;
--accent: #34d399;
--accent-foreground: #0f172a;
--border: #1e293b;
--input-border: #334155;
```

## Aplicación de tema por rol

El `layout.tsx` de `(psychologist)/` aplica la clase `.psychologist-theme` al `<html>`.
El modo oscuro se gestiona mediante la clase `.dark` (toggle del usuario).

## Reglas de densidad

| Rol        | Densidad | Elementos por pantalla                     |
| ---------- | -------- | ------------------------------------------ |
| Estudiante | Baja     | Máximo 4 acciones visibles                 |
| Psicólogo  | Media    | Sidebar + panel central + panel de detalle |

## Traducción de enums (lib/i18n/risk.ts)

```typescript
export const riskLabels = { LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto" };
export const alertStatusLabels = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  SERVED: "Atendida",
  FALSE_POSITIVE: "Falso positivo",
  COMPLEMENTARY: "Complementaria",
};
export const contentStatusLabels = {
  VISIBLE: "Visible",
  MODERATED: "Moderada",
  DELETED: "Eliminada",
};
```

## Accesibilidad

- Todo campo de formulario tiene `<label>` asociado.
- Componentes de entrada navegables por teclado (WCAG 2.2).
- El significado nunca depende solo del color (texto adicional o icono en badges de riesgo).
- Imágenes decorativas: `alt=""`. Imágenes informativas: descripción concisa.
