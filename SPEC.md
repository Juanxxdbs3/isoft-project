# MindBridge — Especificación del proyecto

## Qué hace este sistema

El sistema es una Plataforma de Acompañamiento Psicológico, Triaje Automatizado y Gestión de Alertas Críticas diseñada específicamente para la comunidad universitaria de la Universidad de Cartagena (UdeC).

El sistema funciona de la siguiente manera:

Foro de Expresión y Detección Temprana (Triaje): Los estudiantes pueden publicar de manera anónima utilizando un seudónimo (pseudonym) para proteger su identidad real. Cada texto o comentario publicado es analizado automáticamente en tiempo real por un componente de Procesamiento de Lenguaje Natural (NLPService / NLPAnalysis). Este módulo evalúa indicadores críticos de salud mental como la probabilidad de ansiedad, depresión o ideación suicida (anxietyProbability, depressiveProbability, suicidalProbability).

Gestión de Casos y Alertas Críticas: Si el motor de NLP detecta que una publicación infringe las normas de la comunidad o sobrepasa los umbrales de riesgo, se dispara automáticamente una alerta (Alert) con un nivel de riesgo asociado (Bajo, Medio, Alto). Esto da apertura a un caso (Case) dentro de la plataforma.

Intervención Profesional y Canales de Atención: Los psicólogos de la institución son notificados de inmediato (vía correo o notificaciones integradas) y pueden asumir el caso (assignCaseToPsychologist). Desde allí, pueden iniciar un canal de chat terapéutico directo y privado (ChatRoom) con el estudiante. Para proceder con la exportación legal de las historias o derivaciones médicas, el sistema requiere la firma digital de un consentimiento informado (InformedConsentSignature).

## Arquitectura

Todo esto se soporta sobre una arquitectura por capas bien delimitada (Presentación, Negocio y Datos) que interactúa con servicios externos (Google Gmail, Calendar, Forms) y persiste la información en una base de datos PostgreSQL administrada a través de Supabase (SupabaseClient)
Tres servicios independientes más persistencia en un monorepo (`isoft-project/src/`).

| Servicio       | Stack                                           | Estado                           |
| -------------- | ----------------------------------------------- | -------------------------------- |
| Frontend + BFF | Next.js 15, TypeScript, Tailwind v4, shadcn/ui  | Fases 0–1 completas              |
| Backend API    | Fastify 5, TypeScript, Node.js 22               | No iniciado                      |
| Motor NLP      | Python 3.13, FastAPI, BETO, spaCy               | Esqueleto Fase 3 completo        |
| Persistencia   | PostgreSQL via Supabase (RLS + Realtime + Auth) | Schema v1.1 listo, sin desplegar |

El frontend nunca llama al motor NLP directamente. Toda comunicación pasa por el backend.

## Documentos de referencia

| Documento              | Ruta                               | Uso                                  |
| ---------------------- | ---------------------------------- | ------------------------------------ |
| Contratos por servicio | `docs/contracts/`                  | Fuente de verdad para implementación |
| Diagramas UML          | `docs/diagrams/`                   | Estructura de clases y componentes   |
| Decisiones canónicas   | `docs/notes/design-decisions.md`   | Decisiones cerradas, no reabrir      |
| Estado del dataset NLP | `docs/notes/nlp-dataset-status.md` | Bloqueante activo                    |
| Blockers conocidos     | `docs/notes/blockers.md`           | Issues en curso                      |

## Restricciones no negociables

1. Código en inglés. Documentación en español.
2. Enums en BD y API: `UPPER_SNAKE_CASE` inglés. Traducción al español en `lib/i18n/`.
3. El motor NLP nunca recibe la identidad real del estudiante. Solo el hash del seudónimo.
4. Sin APIs externas de terceros en NLP en producción.
5. Sin hardcodeo de valores configurables. Módulo central: `config.py` (NLP), `config.ts` (backend/frontend).
6. `.env` real nunca entra al repositorio. Siempre existe `.env.example` con claves sin valores.

## Fecha de entrega

11 de junio de 2026, 8:40 a.m.
