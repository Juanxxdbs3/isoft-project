# Flujo completo del sistema — MindBridge

## Capas del sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 16, TypeScript)                                  │
│  src/frontend/src/                                                   │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Page Components      │  │ UI Components    │  │ lib/api.ts   │  │
│  │ (server o client)    │──│ (shadcn, custom) │──│ apiGet       │  │
│  │                      │  │                  │  │ apiPost      │  │
│  │                      │  │                  │  │ apiPatch     │  │
│  │                      │  │                  │  │ apiDelete    │  │
│  └──────────────────────┘  └──────────────────┘  └──────┬───────┘  │
│                                                          │ HTTP     │
├──────────────────────────────────────────────────────────┼─────────┤
│  BACKEND (Fastify 5, TypeScript)                         │         │
│  src/backend/src/                                         ▼         │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Routers        │──│ Services     │──│ Repositories         │    │
│  │ (validan con   │  │ (lógica de   │  │ (queries a Supabase) │    │
│  │  Zod schemas)  │  │  negocio)    │  │                      │    │
│  └────────────────┘  └──────┬───────┘  └──────────┬───────────┘    │
│                             │                      │                │
│              ┌──────────────▼───────┐              │                │
│              │ nlp/NLPService       │              │                │
│              │ (fetch a NLP Engine) │              │                │
│              └──────────────┬───────┘              │                │
│                             │ HTTP                 │ Supabase SDK   │
├─────────────────────────────┼──────────────────────┼────────────────┤
│  NLP ENGINE (FastAPI, Python)│                      │                │
│  src/nlp_engine/src/        │                      │                │
│  ┌──────────────────────┐   │                      │                │
│  │ routers/analysis.py  │   │                      │                │
│  │ POST /api/v1/analyze │   │                      │                │
│  └──────────┬───────────┘   │                      │                │
│             ▼               │                      │                │
│  ┌──────────────────────┐   │                      │                │
│  │ AnalysisPipeline     │   │                      │                │
│  │ (orquestación)       │   │                      │                │
│  └──┬───────┬───────┬───┘   │                      │                │
│     ▼       ▼       ▼       │                      │                │
│  ┌──────┐┌──────┐┌──────┐   │                      │                │
│  │Pre-  ││Safety││BETO  │   │                      │                │
│  │proc. ││Filter││Model │   │                      │                │
│  └──────┘└──────┘└──────┘   │                      │                │
│  ┌──────────────────────┐   │                      │                │
│  │ CommunityClassifier  │   │                      │                │
│  └──────────────────────┘   │                      │                │
└─────────────────────────────┼──────────────────────┼────────────────┘
                              │                      │
                              ▼                      ▼
                    ┌──────────────────────────────────────┐
                    │  SUPABASE (PostgreSQL)                │
                    │  tablas: post, comment, nlp_analysis, │
                    │  alert, clinical_case, student,       │
                    │  pseudonym, psychologist,             │
                    │  complementary_data, chat_room,       │
                    │  chat_message                         │
                    └──────────────────────────────────────┘
```

---

## 1. Flujo: Estudiante crea una publicación en el foro

### 1.1 Frontend — `create-post-form.tsx`

| Artefacto | Ruta |
|-----------|------|
| Componente | `CreatePostForm` (`src/frontend/src/components/forum/create-post-form.tsx`) |
| Función submit | `handleSubmit()` |
| API client | `apiPost(path, body, token)` de `src/frontend/src/lib/api.ts` |
| Llamada | `apiPost("/forum/posts", { text_content: text }, token)` |
| Response type | `PostSummary` (`src/frontend/src/types/domain.ts:168`) |
| Error type | `ApiError` (`api.ts:13`) — contiene `statusCode`, `error` (SCREAMING_SNAKE_CASE), `message` |

**Secuencia:**
```
Usuario escribe en <textarea> → hace clic en "Publicar"
  → CreatePostForm.handleSubmit()
    → localStorage.getItem("access_token")
    → apiPost("/forum/posts", { text_content }, token)
      → fetch(`${API_BASE}/forum/posts`, { method: "POST", headers, body })
        API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://<hostname>:3001/api/v1"  (api.ts:3)
    → si éxito: onPostCreated() → refetchPosts() → apiGet("/forum/posts") actualiza lista
    → si error: muestra ApiError.message debajo del formulario
```

### 1.2 Backend — Router

| Artefacto | Ruta |
|-----------|------|
| Router | `forum.router.ts` (`src/backend/src/modules/forum/forum.router.ts`) |
| Endpoint | `POST /api/v1/forum/posts` (registrado en `server.ts:49`) |
| PreHandler | `fastify.authenticate` (verifica JWT, inyecta `request.user`) |
| Validación body | `CreatePostBodySchema` — Zod: `{ text_content: z.string().min(1).max(2000) }` |
| Role check | `request.user.role !== "student"` → 403 |
| Llama a | `ForumService.createPost(request.user.sub, text_content)` |

```
POST /api/v1/forum/posts
  → fastify.authenticate (JWT → request.user.sub, request.user.role, request.user.campus)
  → CreatePostBodySchema.safeParse(request.body) → { text_content }
  → role === "student"?
  → forumService.createPost(userId, textContent)
```

### 1.3 Backend — Service

| Artefacto | Ruta |
|-----------|------|
| Clase | `ForumService` (`src/backend/src/modules/forum/forum.service.ts`) |
| Método | `async createPost(studentId: string, textContent: string): Promise<PostResponse>` |
| Método privado | `async _runTriagePipeline(contentId: string, studentId: string, text: string, contentType: "POST" | "COMMENT")` |
| Inyecciones | `supabase: SupabaseClient`, `nlpService: NLPService`, `caseRepo: ICaseRepository` |

**Secuencia `createPost`:**
```
createPost(studentId, textContent)
  1. INSERT INTO post (student_id, text_content, status) VALUES ($1, $2, 'VISIBLE') RETURNING *
     → post = { id, student_id, text_content, status, created_at, updated_at }
  
  2. return post  ← respuesta inmediata al cliente (el post es visible)
  
  3. fire-and-forget: _runTriagePipeline(post.id, studentId, textContent, "POST")
```

### 1.4 Backend — Triage Pipeline (`_runTriagePipeline`)

Este método privado dentro de `ForumService` es el núcleo de la moderación retroactiva.

```
_runTriagePipeline(contentId, studentId, text, contentType)
  │
  ├─ 1. Obtener estudiante: SELECT campus, active_pseudonym_id, caso_formal_activo
  │       FROM student WHERE id = studentId
  │
  ├─ 2. Llamar al NLP Engine:
  │       nlpResult = await this.nlpService.analyze({
  │         id_publicacion: contentId,
  │         id_seudonimo: studentId,
  │         texto: text,
  │         timestamp: new Date().toISOString(),
  │         incluir_explicabilidad: false,
  │       })
  │     Si nlpResult es null → log error y return (fallo silencioso)
  │
  ├─ 3. Moderación comunitaria:
  │       if nlpResult.community?.moderation_decision === "REJECTED":
  │         UPDATE post/comment SET status = "MODERATED" WHERE id = contentId
  │
  ├─ 4. Si no hay datos clínicos (!nlpResult.clinical || !texto_suficiente):
  │       return  ← no se crea alerta
  │
  ├─ 5. Si risk_level === "LOW" && !safety_filter_triggered:
  │       return  ← contenido seguro, no se crea alerta
  │
  ├─ 6. Determinar risk_level final:
  │       if safety_filter_triggered → risk_level = "HIGH"
  │       else → risk_level = nlpResult.clinical.risk_level (LOW|MEDIUM|HIGH)
  │
  ├─ 7. INSERT INTO nlp_analysis (
  │       id, post_id, student_id, depressive_probability, anxiety_probability,
  │       suicidal_probability, base_malaise_index, suicidal_override,
  │       risk_level, safety_filter_triggered, texto_suficiente,
  │       modelo_clinico_version, modelo_normas_version,
  │       raw_ml_snapshot, analyzed_at
  │     )
  │
  ├─ 8. Buscar caso clínico activo del estudiante:
  │       existingCase = caseRepo.findActiveByStudent(studentId)
  │       → busca clinical_case WHERE student_id = $1 AND status IN ('OPENED', 'ASSIGNED')
  │
  ├─ 9. Si existe caso:
  │       caseId = existingCase.id
  │       if caso_formal_activo → is_complementary = true
  │   Si no existe:
  │       INSERT INTO clinical_case (student_id, case_type, status)
  │       VALUES ($1, 'AUTOMATIC_ALERT', 'OPENED')
  │       caseId = newCase.id
  │
  ├─ 10. INSERT INTO alert (
  │        case_id, nlp_analysis_id, student_id, campus,
  │        risk_level, status, is_complementary
  │      ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
  │
  └─ 11. Log: "STUB: Notification to psychologist would fire here (RF15 pending)"
```

### 1.5 Backend — NLP Service

| Artefacto | Ruta |
|-----------|------|
| Clase | `NLPService` (`src/backend/src/modules/nlp/nlp.service.ts`) |
| Método | `async analyze(request: NLPRequest): Promise<NLPResponse | null>` |
| HTTP call | `fetch(`${CONFIG.NLP_SERVICE_URL}/api/v1/analyze`, { method: "POST", headers, body })` |
| Timeout | `AbortController` con `CONFIG.NLP_TIMEOUT_MS` (default: 5000ms) |
| Auth | `Authorization: Bearer ${CONFIG.NLP_API_KEY}` |

### 1.6 NLP Engine — FastAPI

| Artefacto | Ruta |
|-----------|------|
| App | `FastAPI` en `src/nlp_engine/src/main.py` |
| Router | `analysis.py` — `POST /api/v1/analyze` |
| Pipeline | `AnalysisPipeline` (`src/nlp_engine/src/orchestration/pipeline.py`) |
| Método | `run(request: AnalysisRequest) → AnalysisResponse` |

**Input — `AnalysisRequest` (Pydantic):**

| Campo wire (JSON) | Campo Python | Tipo | Validación |
|-------------------|-------------|------|------------|
| `id_publicacion` | `publication_id` | `str` (UUID) | `field_validator` UUID |
| `id_seudonimo` | `pseudonym_id` | `str` | — |
| `texto` | `text` | `str` | min_length=1 |
| `timestamp` | `timestamp` | `datetime` | — |
| `contexto_previo` | `previous_context` | `list[PreviousContext]` | max 5 entries |
| `incluir_explicabilidad` | `include_explainability` | `bool` | default false |

**Output — `AnalysisResponse`:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id_publicacion` | `str` | Eco del input |
| `status` | `str` | `"success"` |
| `timestamp_analisis` | `str` | ISO 8601 |
| `execution_time_ms` | `float` | Tiempo de ejecución |
| `texto_suficiente` | `bool` | `true` si word_count >= 20 |
| `safety_filter_triggered` | `bool` | `true` si se encontró expresión de riesgo inmediato |
| `confianza_reducida` | `bool` | `true` si se detectó lenguaje mixto |
| `advertencias` | `list[str]` | Códigos: `"texto_mixto_detectado"` |
| `clinical` | `ClinicalSection \| null` | `null` si texto insuficiente |
| `community` | `CommunitySection \| null` | `null` si texto insuficiente |
| `metadatos` | `dict` | Tokens, versiones de modelo |
| `explicabilidad` | `dict \| null` | Siempre `null` (no implementado) |

**Pipeline interno (`AnalysisPipeline.run`):**

```
AnalysisPipeline.run(request)
  │
  ├─ TextPreprocessor.process(raw_text)
  │    → normalized_text, word_count, mixed_language_detected
  │    Usa: spaCy es_core_news_sm, emoji_map.json, en_markers.txt
  │
  ├─ if word_count < min_words_for_analysis (20):
  │    └─ SafetyFilter.evaluate(normalized_text)
  │         → SafetyFilterResult(activated, matched_expression)
  │    └─ return AnalysisResponse(texto_suficiente=false, clinical=null, community=null)
  │
  └─ if word_count >= 20:
       ├─ BETO tokenizer (max_length=256, truncation=true)
       ├─ BETOClinicalModel.predict_tokens(input_ids, attention_mask)
       │    → { p_depresion, p_ansiedad, p_suicida }  (0-100)
       ├─ CommunityClassifier.predict(input_ids, attention_mask)
       │    → score_normas (0-1)
       ├─ IMB = 0.6 * p_depresion + 0.4 * p_ansiedad
       ├─ suicidal_override = p_suicida >= 60
       ├─ risk_level = stratify(IMB, suicidal_override):
       │    suicidal_override → "HIGH"
       │    IMB >= 70 → "HIGH"
       │    IMB >= 40 → "MEDIUM"
       │    else → "LOW"
       └─ return AnalysisResponse(clinical=ClinicalSection{...}, community=CommunitySection{...})
```

### 1.7 Persistencia — Supabase

**Tablas involucradas al crear un post:**

```
post
  id UUID PK
  student_id UUID FK → student.id
  text_content TEXT
  status VARCHAR (VISIBLE | MODERATED | DELETED)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

nlp_analysis
  id UUID PK
  post_id UUID FK → post.id (nullable)
  comment_id UUID FK → comment.id (nullable)
  student_id UUID FK → student.id
  depressive_probability NUMERIC(5,2)
  anxiety_probability NUMERIC(5,2)
  suicidal_probability NUMERIC(5,2)
  base_malaise_index NUMERIC(5,2)
  suicidal_override BOOLEAN
  risk_level VARCHAR
  safety_filter_triggered BOOLEAN
  texto_suficiente BOOLEAN
  analyzed_at TIMESTAMPTZ

clinical_case
  id UUID PK
  student_id UUID FK → student.id
  case_type VARCHAR (AUTOMATIC_ALERT | SELF_REFERRAL)
  status VARCHAR (OPENED | ASSIGNED | ARCHIVED | RESOLVED)
  assigned_psychologist_id UUID FK → psychologist.id (nullable)
  is_unsubscribed_from_recapture BOOLEAN
  opened_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

alert
  id UUID PK
  case_id UUID FK → clinical_case.id
  nlp_analysis_id UUID FK → nlp_analysis.id
  student_id UUID FK → student.id
  campus VARCHAR
  risk_level VARCHAR
  status VARCHAR (PENDING | ACCEPTED | SERVED | FALSE_POSITIVE)
  is_complementary BOOLEAN
  assigned_psychologist_id UUID FK → psychologist.id (nullable)
  generated_at TIMESTAMPTZ
  accepted_at TIMESTAMPTZ
  ai_generated_summary TEXT
```

---

## 2. Flujo: Estudiante crea un comentario

### 2.1 Frontend — `comment-thread.tsx`

| Artefacto | Ruta |
|-----------|------|
| Componente | `CommentThread` (`src/frontend/src/components/forum/comment-thread.tsx`) |
| Llamada | `apiPost("/forum/posts/${postId}/comments", { text_content }, token)` |
| Refresh | Tras crear, refetchea todos los comentarios: `apiGet("/forum/posts/${postId}/comments", token)` |

### 2.2 Backend

| Endpoint | `POST /api/v1/forum/posts/:postId/comments` |
| Router | `forum.router.ts:302` — valida params con `PostIdParamsSchema`, body con `CreateCommentBodySchema` |
| Service | `ForumService.createComment(postId, userId, textContent)` |
| Método | `createComment(postId, studentId, textContent)` (forum.service.ts:174) |

**Secuencia:**
```
createComment(postId, studentId, textContent)
  1. Verifica que el post padre existe y es VISIBLE
     → SELECT * FROM post WHERE id = postId AND status = 'VISIBLE'
     → si no existe: throw NOT_FOUND
  
  2. INSERT INTO comment (student_id, post_id, text_content, status)
     VALUES ($1, $2, $3, 'VISIBLE') RETURNING *
  
  3. return comment  ← NO ejecuta _runTriagePipeline

  ⚠️ Los comentarios NO pasan por análisis NLP ni generan alertas.
```

---

## 3. Flujo: Ciclo de vida de una alerta (lado del psicólogo)

### 3.1 Listar alertas pendientes

| Frontend | `AlertFeed` (`src/frontend/src/components/alerts/alert-feed.tsx`) |
|----------|-------|
| Backend | `GET /api/v1/alerts?status=PENDING` → `AlertsService.listAlerts(campus, { status: "PENDING" })` |
| Query | `SELECT ... FROM alert WHERE campus = $1 AND status = 'PENDING'` con embed `student → pseudonym` |

### 3.2 Ver detalle de alerta

| Frontend | `AlertDetailPanel` → `POST /alerts/:alertId/accept` (aceptar) |
|----------|-------|
| Backend | `GET /api/v1/alerts/:alertId` → `AlertsService.getAlertDetail(alertId, psychologistId, campus)` |
| Protección | Si alerta ya fue aceptada por otro → `403 ALERT_ASSIGNED_TO_ANOTHER` |
| Datos visibles | Solo `pseudonym`, `risk_level`, `ai_generated_summary` mientras esté PENDING |
| Post-acceptación | Datos desanonimizados: `student_code` (desencriptado), `nombre_completo`, `programa`, historial de posts, scores NLP |

### 3.3 Aceptar alerta

| Backend | `POST /api/v1/alerts/:alertId/accept` → `AlertsService.acceptAlert(alertId, psychologistId, campus)` |
|----------|-------|

**Secuencia `acceptAlert` (alerts.service.ts:218-335):**
```
acceptAlert(alertId, psychologistId, campus)
  1. Buscar alerta por ID → alertRepo.findById(alertId)
     Si no existe → 404 NOT_FOUND
     Si campus mismatch → 403 FORBIDDEN
     Si status !== "PENDING" → 409 ALERT_ALREADY_ACCEPTED
  
  2. UPDATE alert SET status = 'ACCEPTED', assigned_psychologist_id = $1, accepted_at = NOW()
     WHERE id = $2 AND status = 'PENDING'
     Si falla (race condition) → rechazar con 409
  
  3. Buscar caso activo existente del estudiante:
     SELECT * FROM clinical_case WHERE student_id = $1 AND status IN ('OPENED', 'ASSIGNED')
  
  4. Si existe caso:
       caseData = existingCase
       isComplementary = true
       Si existingCase.assigned_psychologist_id IS NULL (ej. autoderivación):
         UPDATE clinical_case SET assigned_psychologist_id = $1, status = 'ASSIGNED'
         isComplementary = false
  
  5. Si no existe caso:
       INSERT INTO clinical_case (student_id, case_type, status, assigned_psychologist_id)
       VALUES ($1, 'AUTOMATIC_ALERT', 'ASSIGNED', $2)
  
  6. UPDATE alert SET case_id = $1, is_complementary = $2 WHERE id = $3
  
  7. Desencriptar código de estudiante:
     decryptStudentCode(student.codigo_estudiante_encrypted, CONFIG.STUDENT_CODE_ENCRYPTION_KEY)
  
  8. return { alert, clinical_case, deanonymized_student_code }
```

### 3.4 Ver casos asignados

| Frontend | `MyCasesPage` (`src/frontend/src/app/(psychologist)/cases/page.tsx`) |
|----------|-------|
| Backend | `GET /api/v1/cases?status=ASSIGNED` → `CasesService.listCases(psychologistId, { status: "ASSIGNED" })` |
| Query | `SELECT ... FROM clinical_case WHERE assigned_psychologist_id = $1 AND status = 'ASSIGNED'` con embed `student → pseudonym` |

---

## 4. Catálogo de artefactos por capa

### 4.1 Frontend (`src/frontend/src/`)

| Artefacto | Tipo | Ruta |
|-----------|------|------|
| `API_BASE` | `string` (constante) | `lib/api.ts:11` |
| `apiPost<T>(path, body, token)` | Función | `lib/api.ts:63` |
| `apiGet<T>(path, token)` | Función | `lib/api.ts:123` |
| `apiPatch<T>(path, body, token)` | Función | `lib/api.ts:82` |
| `apiDelete<T>(path, body, token)` | Función | `lib/api.ts:101` |
| `ApiError` | Clase | `lib/api.ts:13` |
| `handleResponse<T>(res)` | Función privada | `lib/api.ts:24` |
| `CreatePostForm` | Componente (client) | `components/forum/create-post-form.tsx` |
| `CommentThread` | Componente (client) | `components/forum/comment-thread.tsx` |
| `AlertDetailPanel` | Componente (client) | `components/alerts/alert-detail-panel.tsx` |
| `AlertFeed` | Componente (client) | `components/alerts/alert-feed.tsx` |
| `PostSummary` | Interface | `types/domain.ts:168` |
| `PostDetail` | Interface | `types/domain.ts:179` |
| `CommentItem` | Interface | `types/domain.ts:183` |
| `AlertSummary` | Interface | `types/domain.ts:195` |
| `AlertDetail` | Interface | `types/domain.ts:208` |
| `NivelRiesgo` | Type alias | `types/domain.ts:14` — `"bajo" \| "medio" \| "alto"` |
| `EstadoAlerta` | Type alias | `types/domain.ts:15` — `"pendiente" \| "aceptada" \| ...` |

### 4.2 Backend (`src/backend/src/`)

#### Routers

| Router | Prefix | Archivo |
|--------|--------|---------|
| `forumRouter` | `/api/v1/forum` | `modules/forum/forum.router.ts` |
| `alertsRouter` | `/api/v1/alerts` | `modules/alerts/alerts.router.ts` |
| `casesRouter` | `/api/v1/cases` | `modules/cases/cases.router.ts` |
| `authRouter` | `/api/v1/auth` | `modules/auth/auth.router.ts` |
| `chatRouter` | `/api/v1/chat` | `modules/chat/chat.router.ts` |

#### Services

| Clase | Métodos clave | Archivo |
|-------|---------------|---------|
| `ForumService` | `createPost()`, `createComment()`, `_runTriagePipeline()`, `listPosts()`, `getPostById()`, `updatePost()`, `deletePost()`, `listComments()`, `updateComment()`, `deleteComment()` | `modules/forum/forum.service.ts` |
| `AlertsService` | `listAlerts()`, `getAlertDetail()`, `acceptAlert()`, `updateAlertStatus()` | `modules/alerts/alerts.service.ts` |
| `CasesService` | `listCases()`, `getCaseById()`, `createSelfReferral()`, `setFormalActive()`, `createChatRoom()`, `getCaseChat()`, `sendChatMessage()`, `archiveChatRoom()`, `createConsent()` | `modules/cases/cases.service.ts` |
| `NLPService` | `analyze(request: NLPRequest): Promise<NLPResponse \| null>` | `modules/nlp/nlp.service.ts` |

#### Schemas (Zod)

| Schema | Campos | Archivo |
|--------|--------|---------|
| `CreatePostBodySchema` | `text_content: z.string().min(1).max(2000)` | `forum.schema.ts:6` |
| `CreateCommentBodySchema` | `text_content: z.string().min(1).max(1000)` | `forum.schema.ts:30` |
| `PostsQuerySchema` | `page: z.coerce.number().min(1).default(1)`, `limit: z.coerce.number().min(1).max(50).default(10)` | `forum.schema.ts:78` |
| `PostIdParamsSchema` | `postId: z.string().uuid()` | `forum.schema.ts:54` |
| `AlertsQuerySchema` | `status: z.enum(["PENDING","ACCEPTED","SERVED","FALSE_POSITIVE","COMPLEMENTARY"]).optional()` | `alerts.schema.ts:3` |
| `AlertIdParamsSchema` | `alertId: z.string().uuid()` | `alerts.schema.ts:9` |
| `UpdateAlertStatusBodySchema` | `status: z.enum(["SERVED","FALSE_POSITIVE"])` | `alerts.schema.ts:15` |
| `CasesQuerySchema` | `status: z.enum(["OPENED","ASSIGNED","ARCHIVED","RESOLVED"]).optional()` | `cases.schema.ts:19` |

#### Repositories (Interfaces + Implementaciones)

| Interfaz | Métodos | Implementación |
|----------|---------|---------------|
| `ICaseRepository` | `findById()`, `findByStudentId()`, `findByPsychologistId()`, `findByStatus()`, `findActiveByStudent()`, `create()`, `update()` | `SupabaseCaseRepository` (`repositories/case.repository.ts`) |
| `IAlertRepository` | `findById()`, `findByCampusAndStatus()`, `findByPsychologistId()`, `findPendingByCampus()`, `updateStatus()` | `SupabaseAlertRepository` (`repositories/alert.repository.ts`) |
| `IPsychologistRepository` | `findById()`, `findByCampus()`, `findByCampusAndShift()` | — |
| `IChatRepository` | `findRoomById()`, `findRoomsByPsychologistId()`, ... | — |

#### Domain types (backend)

| Type | Definición | Archivo |
|------|-----------|---------|
| `RiskLevel` | `"LOW" \| "MEDIUM" \| "HIGH"` | `types/domain.ts` |
| `UdecCampus` | `"BOGOTA" \| "SOGAMOSO" \| "DUITAMA" \| "CHIQUINQUIRA"` | `types/domain.ts` |
| `AlertStatus` | `"PENDING" \| "ACCEPTED" \| "SERVED" \| "FALSE_POSITIVE"` | `types/domain.ts` |
| `CaseStatus` | `"OPENED" \| "ASSIGNED" \| "ARCHIVED" \| "RESOLVED"` | `types/domain.ts` |

#### NLP types

| Interface | Campos clave | Archivo |
|-----------|-------------|---------|
| `NLPRequest` | `id_publicacion`, `id_seudonimo`, `texto`, `timestamp`, `contexto_previo?`, `incluir_explicabilidad` | `modules/nlp/nlp.types.ts` |
| `NLPResponse` | `id_publicacion`, `status`, `timestamp_analisis`, `execution_time_ms`, `texto_suficiente`, `safety_filter_triggered`, `confianza_reducida`, `advertencias`, `clinical?`, `community?`, `metadatos` | `modules/nlp/nlp.types.ts` |
| `NLPClinicalSection` | `p_depresion`, `p_ansiedad`, `p_suicida`, `imb`, `suicidal_override`, `risk_level`, `top_clinical_label` | `modules/nlp/nlp.types.ts` |
| `NLPCommunitySection` | `cumple_normas`, `score_normas`, `moderation_decision` | `modules/nlp/nlp.types.ts` |

### 4.3 NLP Engine (`src/nlp_engine/src/`)

| Artefacto | Tipo | Ruta |
|-----------|------|------|
| `AnalysisRequest` | Pydantic model (input) | `schemas/request.py` |
| `AnalysisResponse` | Pydantic model (output) | `schemas/response.py` |
| `ClinicalSection` | Pydantic model | `schemas/response.py` |
| `CommunitySection` | Pydantic model | `schemas/response.py` |
| `AnalysisPipeline` | Clase (orquestación) | `orchestration/pipeline.py` |
| `AnalysisPipeline.run()` | Método | `orchestration/pipeline.py` |
| `TextPreprocessor` | Clase | `orchestration/preprocessor.py` |
| `TextPreprocessor.process()` | Método → `PreprocessingResult` | `orchestration/preprocessor.py` |
| `SafetyFilter` | Clase | `orchestration/safety_filter.py` |
| `SafetyFilter.evaluate()` | Método → `SafetyFilterResult` | `orchestration/safety_filter.py` |
| `BETOClinicalModel` | Clase (PyTorch) | `models/clinical.py` |
| `BETOClinicalModel.predict_tokens()` | Método → `dict{p_depresion, p_ansiedad, p_suicida}` | `models/clinical.py` |
| `CommunityClassifier` | Clase | `models/community.py` |
| `CommunityClassifier.predict()` | Método → `float` (0-1) | `models/community.py` |
| `ModelStub` | Clase (mock) | `stubs/model_stub.py` |
| `Settings` | Pydantic settings | `config.py` |

### 4.4 Configuración relevante

| Variable | Default | Dónde se usa |
|----------|---------|-------------|
| `CONFIG.NLP_SERVICE_URL` | `http://localhost:8000` | Backend → NLP HTTP call |
| `CONFIG.NLP_API_KEY` | `dev-nlp-secret` | Backend → NLP auth header |
| `CONFIG.NLP_TIMEOUT_MS` | `5000` | Backend → `AbortController` timeout |
| `CONFIG.STUDENT_CODE_ENCRYPTION_KEY` | — | Backend → AES-256-GCM decrypt |
| `CONFIG.PORT` | `3001` | Backend server listen |
| `settings.min_words_for_analysis` | `20` | NLP → short text bypass |
| `settings.suicide_override_threshold` | `60.0` | NLP → suicidal override |
| `settings.imb_high_threshold` | `70.0` | NLP → HIGH risk |
| `settings.imb_medium_threshold` | `40.0` | NLP → MEDIUM risk |

---

## 5. Diagrama de secuencia textual

```
ESTUDIANTE                  FRONTEND                    BACKEND                     NLP ENGINE                SUPABASE
    │                           │                           │                           │                         │
    │  Publica en foro          │                           │                           │                         │
    │──────────────────────────>│                           │                           │                         │
    │                           │  apiPost("/forum/posts",  │                           │                         │
    │                           │    { text_content })      │                           │                         │
    │                           │──────────────────────────>│                           │                         │
    │                           │                           │  CREATE post (VISIBLE)    │                         │
    │                           │                           │─────────────────────────────────────────────────>  post
    │                           │                           │                           │                         │
    │                           │  { id, status: "VISIBLE"} │                           │                         │
    │                           │<──────────────────────────│                           │                         │
    │  Post visible             │                           │                           │                         │
    │<──────────────────────────│                           │                           │                         │
    │                           │                           │                           │                         │
    │                           │                           │  _runTriagePipeline()     │                         │
    │                           │                           │  (fire-and-forget)        │                         │
    │                           │                           │                           │                         │
    │                           │                           │  POST /api/v1/analyze     │                         │
    │                           │                           │──────────────────────────>│                         │
    │                           │                           │                           │  preprocessor.process() │
    │                           │                           │                           │  safety_filter.eval()  │
    │                           │                           │                           │  clinical_model.predict│
    │                           │                           │                           │  community_model.predict│
    │                           │                           │                           │                         │
    │                           │                           │  AnalysisResponse         │                         │
    │                           │                           │<──────────────────────────│                         │
    │                           │                           │                           │                         │
    │                           │                           │  if riesgo alto:          │                         │
    │                           │                           │    CREATE nlp_analysis    │                         │
    │                           │                           │─────────────────────────────────────────────────>  nlp_analysis
    │                           │                           │                           │                         │
    │                           │                           │  Buscar/find/crear        │                         │
    │                           │                           │  clinical_case            │                         │
    │                           │                           │─────────────────────────────────────────────────>  clinical_case
    │                           │                           │                           │                         │
    │                           │                           │  CREATE alert             │                         │
    │                           │                           │─────────────────────────────────────────────────>  alert
    │                           │                           │                           │                         │
    │                           │                           │  (stub: notificar         │                         │
    │                           │                           │   al psicólogo)           │                         │
    │                           │                           │                           │                         │
  (el estudiante nunca ve       │                           │                           │                         │
   que se creó una alerta)      │                           │                           │                         │
```

## 6. Notas arquitectónicas importantes

1. **Fire-and-forget:** El triage pipeline se ejecuta después de que el post ya fue devuelto al cliente. Si el NLP falla, el post sigue visible y no se crea alerta.

2. **Los comentarios NO se analizan:** `createComment()` inserta directamente sin llamar a `_runTriagePipeline()`.

3. **Risk level mapping:** NLP devuelve `"LOW" | "MEDIUM" | "HIGH" | "SAFETY_FILTER_TRIGGERED"`. El backend mapea `SAFETY_FILTER_TRIGGERED` a `"HIGH"` en la BD.

4. **Alertas complementarias:** Si el estudiante ya tiene un caso clínico activo con `caso_formal_activo = true`, la nueva alerta se marca `is_complementary = true`.

5. **Sin notificaciones aún (RF15 pendiente):** El triage pipeline termina con un log "STUB: Notification to psychologist would fire here".

6. **Traducción de estados UI:** Los valores de backend (`"LOW"`, `"MEDIUM"`, `"HIGH"`, `"PENDING"`, `"ACCEPTED"`) se traducen en el frontend vía `lib/i18n/risk.ts` a los tipos Spanish `NivelRiesgo` (`"bajo"`, `"medio"`, `"alto"`) y `EstadoAlerta` (`"pendiente"`, `"aceptada"`, etc.).
