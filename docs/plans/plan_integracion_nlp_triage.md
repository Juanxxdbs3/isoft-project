# Plan de Integración NLP — Workflow de Triaje
## MindBridge · Workstreams finales antes del entregable

---

## Estado de partida

| Componente | Estado |
|---|---|
| Esqueleto FastAPI (`/api/v1/analyze`, `/health`) | ✅ Completo |
| `TextPreprocessor`, `SafetyFilter`, `AnalysisPipeline` | ✅ Completo |
| `BETOClinicalModel` + `clinical_model_v1/` | ✅ Completo (todos los artefactos) |
| `community_model_v1/` | ⚠️ Faltan `vocab.txt` y `special_tokens_map.json` |
| `CommunityClassifier` | ❌ No existe |
| `nlp.service.ts` en backend | ❌ No existe |
| Llamada NLP desde `forum.service.ts` | ❌ No existe |
| Creación de alerta desde resultado NLP | ❌ No existe |
| Notificaciones al psicólogo | 🔲 Stub (fuera de alcance) |

---

## Decisiones previas a ejecutar

Antes de escribir un solo prompt, estas cuatro preguntas deben estar respondidas.
El plan las responde con la opción recomendada; cámbiala si tienes criterio distinto.

**D1 — Arquitectura del modelo comunitario**
Los dos modelos comparten la misma base BETO. Cargar el encoder dos veces
consume ~1.4 GB de RAM innecesarios. La opción correcta es **un encoder
compartido con dos cabezas de clasificación independientes**. Esto implica
que `CommunityClassifier` recibe el encoder ya cargado por `BETOClinicalModel`
en lugar de instanciar uno propio.

**D2 — Alineación de esquema entre contrato y código**
El contrato v6 define `clinical: { ... }` y `community: { ... }` como
secciones anidadas. `response.py` tiene estructura plana. El código es la
fuente de verdad para el MVP. **Actualizar `response.py` para que coincida
con el contrato v6**, no al revés. Esto mantiene coherencia con el documento
de diseño y no rompe nada porque el endpoint aún no tiene cliente real.

**D3 — `risk_level` en inglés o español**
El contrato v6 dice inglés (`LOW/MEDIUM/HIGH`). `AGENTS.md` del backend dice
español. La BD almacena inglés (`risk_level` es un enum PostgreSQL
`LOW/MEDIUM/HIGH`). **Usar inglés en el microservicio y en la API**. El
frontend traduce al español vía `lib/i18n/risk.ts` como ya hace para el resto
de enums. Actualizar `AGENTS.md` si contradice esto.

**D4 — Modelo desplegado para pruebas end-to-end**
El modelo pesa ~800 MB. Para pruebas locales antes del entregable, el
microservicio puede correr en el mismo equipo de desarrollo. No necesita
servidor externo para el MVP. El `ModelStub` sigue disponible si el modelo
no carga (CPU lenta o sin RAM suficiente); en ese caso el workflow de triaje
funciona igual pero con scores ficticios.

---

## Workstream 1 — Completar el microservicio NLP

### Sesión NLP-1: Artefactos del modelo comunitario

**Objetivo:** que `community_model_v1/` tenga todos los archivos necesarios
para cargar el tokenizador BETO, igual que `clinical_model_v1/`.

**Archivos a intervenir:**
```
src/nlp_engine/src/models/community_model_v1/   ← copiar desde clinical_model_v1/
  vocab.txt
  special_tokens_map.json
```

**Verificación:**
```python
from transformers import BertTokenizerFast
tok = BertTokenizerFast.from_pretrained("src/models/community_model_v1")
print(tok.vocab_size)  # debe imprimir 31002
```

Si `community_classifier_head.pt` aún no existe (el fine-tuning de normas no
se ejecutó), crear un head aleatorio con la misma forma que el clinical para
que el pipeline no falle en carga. Marcar esto en `blockers.md`.

---

### Sesión NLP-2: `CommunityClassifier` y encoder compartido

**Objetivo:** crear el clasificador de normas reutilizando el encoder BETO
ya cargado por el modelo clínico.

**Archivo nuevo:**
```
src/nlp_engine/src/models/community.py
```

```python
import torch
import torch.nn as nn
from transformers import BertModel

class CommunityClassifier:
    """
    Clasificador binario de normas de comunidad.
    Recibe el encoder BETO ya instanciado por BETOClinicalModel
    para evitar cargar el modelo dos veces en memoria.
    """

    def __init__(self, shared_encoder: BertModel, head_path: str, device: str = "cpu"):
        self.encoder = shared_encoder
        self.device = device
        hidden_size = shared_encoder.config.hidden_size  # 768

        self.head = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(hidden_size, 1)
        )
        state = torch.load(head_path, map_location=device, weights_only=True)
        self.head.load_state_dict(state)
        self.head.to(device)
        self.head.eval()

    def predict(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> float:
        """
        Retorna score_normas en [0, 1].
        1.0 = cumple normas, 0.0 = viola normas.
        """
        with torch.no_grad():
            cls = self.encoder(
                input_ids=input_ids,
                attention_mask=attention_mask
            ).last_hidden_state[:, 0, :]
            logit = self.head(cls)
            return torch.sigmoid(logit).item()
```

**`src/config.py`** — agregar:
```python
community_model_path: str = "src/models/community_model_v1"
community_model_version: str = "community-v1.0"
clinical_model_version: str = "beto-v1.0"
```

---

### Sesión NLP-3: Actualizar `response.py` al contrato v6

**Objetivo:** alinear el esquema de respuesta con `contrato_microservicio_nlp_v6.md`.

**`src/nlp_engine/src/schemas/response.py`** — reemplazar la estructura plana
por secciones anidadas:

```python
from pydantic import BaseModel
from typing import Optional, List

class ClinicalSection(BaseModel):
    p_depresion: Optional[float] = None
    p_ansiedad: Optional[float] = None
    p_suicida: Optional[float] = None
    imb: Optional[float] = None
    suicidal_override: Optional[bool] = None
    risk_level: Optional[str] = None       # LOW | MEDIUM | HIGH | SAFETY_FILTER_TRIGGERED
    top_clinical_label: Optional[str] = None
    rationale: Optional[str] = None

class CommunitySection(BaseModel):
    cumple_normas: Optional[bool] = None
    score_normas: Optional[float] = None   # 0–1
    moderation_decision: Optional[str] = None  # APPROVED | REJECTED

class AnalysisResponse(BaseModel):
    id_publicacion: str
    status: str                            # success | error
    timestamp_analisis: str
    execution_time_ms: float
    texto_suficiente: bool
    safety_filter_triggered: bool
    confianza_reducida: bool
    advertencias: List[str]
    clinical: Optional[ClinicalSection] = None
    community: Optional[CommunitySection] = None
    metadatos: dict
    explicabilidad: Optional[dict] = None
```

---

### Sesión NLP-4: Integrar `CommunityClassifier` en el pipeline

**Objetivo:** que `pipeline.py` ejecute análisis clínico y de comunidad en
paralelo, como especifica el contrato.

**`src/nlp_engine/src/orchestration/pipeline.py`** — cambios concretos:

1. En `__init__`, cargar `CommunityClassifier` pasando el encoder ya cargado:
```python
from src.models.clinical import BETOClinicalModel
from src.models.community import CommunityClassifier

self.clinical_model = BETOClinicalModel(
    model_path=config.clinical_model_path,
    device=config.device
)
# Reutilizar el encoder del modelo clínico
self.community_model = CommunityClassifier(
    shared_encoder=self.clinical_model.bert,
    head_path=f"{config.community_model_path}/community_classifier_head.pt",
    device=config.device
)
```

2. En `_handle_full_analysis`, ejecutar ambos modelos:
```python
import asyncio, time

async def _handle_full_analysis(self, text: str, payload) -> AnalysisResponse:
    start = time.monotonic()

    # Tokenizar una sola vez (ambos modelos usan el mismo tokenizador)
    encoding = self.clinical_model.tokenizer(
        text,
        max_length=256,
        padding="max_length",
        truncation=True,
        return_tensors="pt"
    )

    # Ejecutar en paralelo usando run_in_executor para no bloquear el event loop
    loop = asyncio.get_event_loop()

    clinical_task = loop.run_in_executor(
        None,
        self.clinical_model.predict,
        encoding["input_ids"],
        encoding["attention_mask"]
    )
    community_task = loop.run_in_executor(
        None,
        self.community_model.predict,
        encoding["input_ids"],
        encoding["attention_mask"]
    )

    clinical_scores, score_normas = await asyncio.gather(
        clinical_task, community_task
    )

    # clinical_scores = { p_depresion, p_ansiedad, p_suicida }
    imb = 0.6 * clinical_scores["p_depresion"] + 0.4 * clinical_scores["p_ansiedad"]
    suicidal_override = clinical_scores["p_suicida"] >= config.suicidal_override_threshold
    risk_level = _stratify(imb, suicidal_override)

    elapsed_ms = (time.monotonic() - start) * 1000

    return AnalysisResponse(
        id_publicacion=payload.id_publicacion,
        status="success",
        timestamp_analisis=datetime.utcnow().isoformat(),
        execution_time_ms=round(elapsed_ms, 2),
        texto_suficiente=True,
        safety_filter_triggered=False,
        confianza_reducida=False,
        advertencias=[],
        clinical=ClinicalSection(
            p_depresion=round(clinical_scores["p_depresion"], 2),
            p_ansiedad=round(clinical_scores["p_ansiedad"], 2),
            p_suicida=round(clinical_scores["p_suicida"], 2),
            imb=round(imb, 2),
            suicidal_override=suicidal_override,
            risk_level=risk_level,
            top_clinical_label=_top_label(clinical_scores),
            rationale=None
        ),
        community=CommunitySection(
            cumple_normas=score_normas >= 0.5,
            score_normas=round(score_normas, 4),
            moderation_decision="APPROVED" if score_normas >= 0.5 else "REJECTED"
        ),
        metadatos={
            "tokens_procesados": encoding["input_ids"].shape[1],
            "publicaciones_contexto_usadas": len(payload.contexto_previo or []),
            "version_modelo_clinico": config.clinical_model_version,
            "version_modelo_normas": config.community_model_version
        }
    )
```

3. Helper `_stratify`:
```python
def _stratify(imb: float, suicidal_override: bool) -> str:
    if suicidal_override:
        return "HIGH"
    if imb >= 70:
        return "HIGH"
    if imb >= 40:
        return "MEDIUM"
    return "LOW"
```

**Validación:**
```bash
cd src/nlp_engine
python -m pytest tests/ -v
# test_safety_filter, test_pipeline_stratification, test_pydantic_validation deben pasar
```

---

## Workstream 2 — Cliente NLP en el backend

### Sesión BE-1: Módulo `nlp`

**Objetivo:** crear el cliente que llama al microservicio desde el backend.

**Archivos nuevos:**
```
src/backend/src/modules/nlp/nlp.types.ts
src/backend/src/modules/nlp/nlp.service.ts
```

**`nlp.types.ts`:**
```typescript
export interface NLPRequest {
  id_publicacion: string;
  id_seudonimo: string;
  texto: string;
  timestamp: string;
  contexto_previo?: Array<{
    texto_resumido: string;
    timestamp: string;
    nivel_riesgo_previo: string | null;
  }>;
  incluir_explicabilidad: boolean;
}

export interface NLPClinicalSection {
  p_depresion: number;
  p_ansiedad: number;
  p_suicida: number;
  imb: number;
  suicidal_override: boolean;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "SAFETY_FILTER_TRIGGERED";
  top_clinical_label: string | null;
  rationale: string | null;
}

export interface NLPCommunitySection {
  cumple_normas: boolean;
  score_normas: number;
  moderation_decision: "APPROVED" | "REJECTED";
}

export interface NLPResponse {
  id_publicacion: string;
  status: "success" | "error";
  timestamp_analisis: string;
  execution_time_ms: number;
  texto_suficiente: boolean;
  safety_filter_triggered: boolean;
  confianza_reducida: boolean;
  advertencias: string[];
  clinical: NLPClinicalSection | null;
  community: NLPCommunitySection | null;
  metadatos: {
    tokens_procesados: number;
    publicaciones_contexto_usadas: number;
    version_modelo_clinico: string;
    version_modelo_normas: string;
  };
}
```

**`nlp.service.ts`:**
```typescript
import { FastifyBaseLogger } from "fastify";
import { CONFIG } from "../../config.js";
import type { NLPRequest, NLPResponse } from "./nlp.types.js";

export class NLPService {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async analyze(payload: NLPRequest): Promise<NLPResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.nlpTimeoutMs);

    try {
      const res = await fetch(`${CONFIG.nlpServiceUrl}/api/v1/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CONFIG.nlpApiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        this.logger.warn(
          { status: res.status, id: payload.id_publicacion },
          "NLP service returned non-200"
        );
        return null;
      }

      return (await res.json()) as NLPResponse;
    } catch (err: any) {
      if (err.name === "AbortError") {
        this.logger.warn({ id: payload.id_publicacion }, "NLP request timed out");
      } else {
        this.logger.error({ err, id: payload.id_publicacion }, "NLP request failed");
      }
      return null;  // fallo silencioso: el post sigue visible
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

**`src/backend/src/config.ts`** — agregar:
```typescript
nlpServiceUrl: z.string().default("http://localhost:8000"),
nlpApiKey: z.string().default("dev-nlp-secret"),
nlpTimeoutMs: z.number().default(5000),
```

**`.env` y `.env.example`** — agregar:
```
NLP_SERVICE_URL=http://localhost:8000
NLP_API_KEY=dev-nlp-secret
NLP_TIMEOUT_MS=5000
```

---

### Sesión BE-2: Workflow de triaje en `forum.service.ts`

**Objetivo:** que cada post o comentario dispare el análisis NLP de forma
asíncrona y, si el resultado amerita una alerta, la cree en la BD.

**Precondición:** esta sesión requiere que la Sesión BE-1 esté completa y
que `NLPService` compile sin errores.

**Flujo completo:**

```
POST /api/v1/forum/posts
  ↓
forum.service.ts → createPost()
  ↓ (síncrono, inmediato)
INSERT post (status = VISIBLE)
  ↓
Respuesta 201 al estudiante
  ↓ (asíncrono, no bloquea)
_runTriagePipeline(postId, studentId, text, pseudonymHash)
  ↓
NLPService.analyze()
  ↓
Si resultado.clinical.risk_level IN [MEDIUM, HIGH] o safety_filter:
  INSERT nlp_analysis
  GET o CREATE clinical_case para el estudiante
  INSERT alert
  (notificaciones → stub por ahora)
Si community.moderation_decision === "REJECTED":
  UPDATE post SET status = 'MODERATED'
```

**Cambios en `forum.service.ts`:**

```typescript
// Inyectar NLPService en el constructor
constructor(
  private readonly supabase: SupabaseClient,
  private readonly logger: FastifyBaseLogger,
  private readonly nlpService: NLPService,
  private readonly alertRepo: IAlertRepository,
  private readonly caseRepo: ICaseRepository,
) {}

async createPost(studentId: string, textContent: string, pseudonymHash: string) {
  // 1. Insertar post de forma síncrona
  const { data: post, error } = await this.supabase
    .from("post")
    .insert({
      student_id: studentId,
      text_content: textContent,
      status: "VISIBLE",
    })
    .select("id, created_at")
    .single();

  if (error || !post) throw Errors.INTERNAL_SERVER_ERROR("Error al publicar");

  // 2. Disparar pipeline NLP sin await (fire-and-forget)
  this._runTriagePipeline(post.id, studentId, textContent, pseudonymHash, "POST")
    .catch(err => this.logger.error({ err, postId: post.id }, "Triage pipeline error"));

  return post;
}

private async _runTriagePipeline(
  contentId: string,
  studentId: string,
  text: string,
  pseudonymHash: string,
  contentType: "POST" | "COMMENT"
) {
  const nlpResult = await this.nlpService.analyze({
    id_publicacion: contentId,
    id_seudonimo: pseudonymHash,
    texto: text,
    timestamp: new Date().toISOString(),
    incluir_explicabilidad: false,
  });

  if (!nlpResult || nlpResult.status === "error") {
    this.logger.warn({ contentId }, "NLP returned null or error — skipping triage");
    return;
  }

  // Moderación retroactiva
  if (nlpResult.community?.moderation_decision === "REJECTED") {
    await this.supabase
      .from(contentType === "POST" ? "post" : "comment")
      .update({ status: "MODERATED" })
      .eq("id", contentId);
    this.logger.info({ contentId }, "Content moderated by community classifier");
  }

  // Solo continuar si hay análisis clínico
  if (!nlpResult.clinical || !nlpResult.texto_suficiente) return;
  const { risk_level, p_depresion, p_ansiedad, p_suicida, imb, suicidal_override } =
    nlpResult.clinical;

  // LOW sin safety_filter → no genera alerta
  if (risk_level === "LOW" && !nlpResult.safety_filter_triggered) return;

  // Guardar nlp_analysis
  const { data: nlpRecord } = await this.supabase
    .from("nlp_analysis")
    .insert({
      post_id: contentType === "POST" ? contentId : null,
      comment_id: contentType === "COMMENT" ? contentId : null,
      content_type: contentType,
      analyzed_text_snapshot: text,
      depressive_probability: p_depresion,
      anxiety_probability: p_ansiedad,
      suicidal_probability: p_suicida,
      base_malaise_index: imb,
      suicidal_override: suicidal_override ?? false,
      community_rules_infraction: nlpResult.community?.moderation_decision === "REJECTED",
      risk_level: nlpResult.safety_filter_triggered ? "HIGH" : risk_level,
    })
    .select("id")
    .single();

  if (!nlpRecord) return;

  // Obtener o crear caso clínico del estudiante
  let caseId: string;
  const existingCase = await this.caseRepo.findActiveByStudent(studentId);

  if (existingCase) {
    caseId = existingCase.id;
  } else {
    const newCase = await this.supabase
      .from("clinical_case")
      .insert({
        student_id: studentId,
        case_type: "AUTOMATIC_ALERT",
        status: "OPENED",
      })
      .select("id")
      .single();
    if (!newCase.data) return;
    caseId = newCase.data.id;
  }

  // Obtener campus del estudiante
  const { data: student } = await this.supabase
    .from("student")
    .select("campus, caso_formal_activo")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return;

  // Crear alerta
  await this.supabase.from("alert").insert({
    case_id: caseId,
    nlp_analysis_id: nlpRecord.id,
    student_id: studentId,
    campus: student.campus,
    risk_level: nlpResult.safety_filter_triggered ? "HIGH" : risk_level,
    status: "PENDING",
    is_complementary: !!existingCase && student.caso_formal_activo,
  });

  this.logger.info(
    { contentId, studentId, risk_level, caseId },
    "Alert created from triage pipeline"
  );

  // Notificaciones → stub: solo log por ahora
  this.logger.info(
    { campus: student.campus, risk_level },
    "STUB: Notification to psychologist would fire here (RF15 pending)"
  );
}
```

**`ICaseRepository`** — agregar método faltante en `interfaces.ts`:
```typescript
findActiveByStudent(studentId: string): Promise<{ id: string; status: string } | null>;
```

**`case.repository.ts`** — implementar:
```typescript
async findActiveByStudent(studentId: string) {
  const { data } = await this.supabase
    .from("clinical_case")
    .select("id, status")
    .eq("student_id", studentId)
    .in("status", ["OPENED", "ASSIGNED"])
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
```

**Registrar `NLPService` en `app.ts` / `server.ts`:**
```typescript
const nlpService = new NLPService(app.log);
// Inyectar en ForumService junto con alertRepo y caseRepo
```

---

## Workstream 3 — Términos y condiciones (modal)

### Sesión FE-1: Extracción y renderizado

**Objetivo:** mostrar el texto del documento de términos antes del registro
del estudiante.

**Pasos:**

1. Extraer el texto del `.docx`:
```bash
cd src/frontend
node -e "
const mammoth = require('mammoth');
mammoth.extractRawText({ path: '../../docs/notes/Terminos_y_Condiciones_MindBridge.docx' })
  .then(r => require('fs').writeFileSync('src/lib/terms-content.ts',
    'export const TERMS_CONTENT = ' + JSON.stringify(r.value) + ';'))
"
```

2. Crear `src/frontend/src/components/auth/terms-modal.tsx`:
```tsx
"use client";
import { TERMS_CONTENT } from "@/lib/terms-content";

interface TermsModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsModal({ onAccept, onDecline }: TermsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Términos y condiciones de uso
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 text-sm text-foreground whitespace-pre-wrap">
          {TERMS_CONTENT}
        </div>
        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Rechazar
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg"
          >
            Aceptar y continuar
          </button>
        </div>
      </div>
    </div>
  );
}
```

3. En `registro/page.tsx`, mostrar el modal antes del formulario:
```tsx
const [termsAccepted, setTermsAccepted] = useState(false);
const [showTerms, setShowTerms] = useState(true);

if (showTerms) {
  return (
    <TermsModal
      onAccept={() => { setTermsAccepted(true); setShowTerms(false); }}
      onDecline={() => { window.location.href = "https://google.com"; }}
    />
  );
}
```

La aceptación se persiste en el campo `registration_consent` de la BD
junto con el registro, que ya es el comportamiento actual de `RF02`. No
se necesita `localStorage` adicional.

---

## Orden de ejecución

```
NLP-1 → NLP-2 → NLP-3 → NLP-4
                              ↓
                         BE-1 → BE-2
                                     ↓
                                FE-1 (independiente, puede ir en paralelo)
```

Las sesiones NLP son prerequisito para BE-2. BE-1 (cliente HTTP) puede
escribirse sin el microservicio corriendo. FE-1 es completamente independiente.

---

## Validación end-to-end

Una vez completadas todas las sesiones, el flujo completo a verificar:

```
1. Estudiante publica en el foro
2. Backend recibe el post, responde 201 inmediatamente
3. Backend llama al NLP en background
4. NLP devuelve risk_level HIGH (o MEDIUM)
5. Backend inserta nlp_analysis + clinical_case + alert
6. Psicólogo recarga el dashboard → aparece la alerta
7. Psicólogo acepta la alerta → se revela la identidad del estudiante
8. Si community.moderation_decision = REJECTED → el post desaparece del foro
```

Para forzar el riesgo sin depender del modelo real, usar el script SQL de
prueba que ya tienes o configurar temporalmente el `ModelStub` para que
retorne scores específicos:

```python
# En model_stub.py, para pruebas:
def predict(self, ...):
    return { "p_depresion": 85.0, "p_ansiedad": 90.0, "p_suicida": 20.0 }
    # IMB = 0.6*85 + 0.4*90 = 87 → HIGH
```

---

## Fuera del alcance de este plan

| Módulo | Decisión |
|---|---|
| Notificaciones por correo (RF15) | Stub: solo log. Implementar después del entregable. |
| Exportación PDF (RF04) | Fuera del plan. |
| Google Calendar (RF03) | Fuera del plan. |
| Contexto previo en NLP | El campo `contexto_previo` se envía vacío por ahora. |
| Fine-tuning real del modelo comunitario | Si `community_classifier_head.pt` no existe, usar head aleatorio. Anotar en `blockers.md`. |
