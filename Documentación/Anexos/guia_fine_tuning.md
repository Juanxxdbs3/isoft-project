# Guía de Fine-Tuning — Motor NLP de MindBridge

Esta guía está dirigida a los integrantes del equipo responsables de entrenar los dos modelos del motor NLP: el **clasificador clínico** (BETO multilabel) y el **clasificador de normas de comunidad** (binario). Debe leerse completa antes de ejecutar cualquier celda.

---

## 1. Archivos que recibirás

Los siguientes archivos se te proporcionarán para ejecutar esta guía:

| Archivo / carpeta | Descripción |
|---|---|
| `nlp_engine/data_collection/cleaned/unified_dataset.json` | Dataset clínico unificado con 5 521 registros. Contiene etiquetas para depresión, ansiedad e ideación suicida. |
| `nlp_engine/data_collection/cleaned/dataset_stats.json` | Estadísticas de composición del dataset (positivos/negativos por clase, fuentes). |
| `nlp_engine/data_collection/prepare_datasets.py` | Script de construcción del dataset clínico. Úsalo como base para construir el dataset de normas de comunidad. |
| `nlp_engine/src/stubs/__init__.py` | Stub actual del modelo. Lo reemplazarás con la implementación real al finalizar. |
| `nlp_engine/src/config.py` | Configuración central del microservicio. Aquí están los parámetros de umbral que el modelo debe respetar. |

---

## 2. Preparación del entorno de entrenamiento

### Opción A — Google Colab (recomendada)

Google Colab ofrece GPU T4 gratuita suficiente para el fine-tuning con el dataset actual. Es la opción recomendada por su estabilidad y por el acceso a Google Drive para guardar checkpoints.

**Requisitos previos:**
1. Tener una cuenta Google con acceso a Google Drive.
2. Crear la carpeta `mindbridge_nlp/` en la raíz de tu Google Drive.
3. Subir `unified_dataset.json` a `mindbridge_nlp/unified_dataset.json`.
4. Al abrir Colab: `Entorno de ejecución → Cambiar tipo de entorno de ejecución → T4 GPU`.

### Opción B — Entorno local

Viable si el equipo dispone de una máquina con GPU dedicada NVIDIA (mínimo 6 GB VRAM) o con CPU de al menos 16 GB RAM (el entrenamiento en CPU tomará entre 8 y 14 horas con este dataset). Para CPU pura se recomienda reducir `batch_size` a 8 y `max_length` a 128.

```bash
# Crear entorno virtual
python -m venv venv_mindbridge
source venv_mindbridge/bin/activate  # Linux/macOS
venv_mindbridge\Scripts\activate     # Windows

# Instalar dependencias
pip install transformers==4.40.0 torch==2.3.0 datasets scikit-learn
```

---

## 3. Sobre el formato del dataset clínico

El archivo `unified_dataset.json` es una lista de objetos con esta estructura:

```json
{
  "id": "kdt_894",
  "fuente": "kaggle-depression-tweets",
  "texto": "Cansado sí, muy cansado de todo, de la gente y de la vida",
  "labels": {
    "depresion": -1,
    "ansiedad": 0,
    "suicida": 0
  },
  "anotador_1": { "depresion": 0, "ansiedad": 0, "suicida": 0 },
  "anotador_2": { "depresion": 0, "ansiedad": 0, "suicida": 0 },
  "acuerdo": true,
  "notas": "Imported from kaggle-depression-tweets."
}
```

**Los valores `-1` en `labels` significan que esa dimensión no fue anotada por la fuente de origen.** Por ejemplo, `suicide-comments-es` solo etiqueta ideación suicida; las dimensiones de depresión y ansiedad de esos registros tienen valor `-1` porque no existe anotación. El script de entrenamiento maneja esto con una función de pérdida enmascarada: las posiciones con `-1` se excluyen del cálculo del gradiente para esa dimensión. No debes filtrar estos registros; el notebook los usa correctamente.

Los valores `0` y `1` indican ausencia o presencia de la condición respectivamente.

---

## 4. Construcción del dataset de normas de comunidad

El clasificador de normas de comunidad necesita su propio dataset porque las fuentes clínicas no proveen esta etiqueta. A continuación se describe cómo construirlo.

### 4.1 Criterio de etiquetado

Esta distinción es la más importante de todo el proceso de anotación:

- **`cumple_normas = 0` (viola la norma):** Texto que contiene agresión directa hacia otra persona, insultos, acoso, intentos de humillación o discurso de odio basado en colectivos vulnerables.
- **`cumple_normas = 1` (cumple la norma):** Todo lo demás, incluyendo expresiones de malestar extremo del autor, ideación suicida, desesperanza y autodesprecio. El dolor propio no es una violación.

**Ejemplo crítico:** _"Ojalá pudiera desaparecer, no sirvo para nada"_ → `cumple_normas = 1`. _"Ojalá desaparezcas tú, inútil"_ → `cumple_normas = 0`. Esta distinción no es intuitiva y debe quedar explícita en la guía de anotación que el equipo redacte antes de comenzar.

### 4.2 Fuentes de datos sugeridas

- **Textos positivos (viola norma):** Dataset de HatEval en español (disponible en Hugging Face), tweets de acoso escolar en español, textos generados sintéticamente por el equipo con ejemplos claros de insultos y doxeo.
- **Textos negativos (cumple norma):** El propio `unified_dataset.json` ya etiquetado es una fuente válida para ejemplos que cumplen la norma: todos sus textos son de malestar del autor, no de agresión a terceros.
- **Objetivo mínimo:** 300 ejemplos anotados (150 por clase). Con 300 ejemplos, un clasificador TF-IDF + Regresión Logística puede alcanzar F1 > 0.80 en este dataset.

### 4.3 Formato del dataset de normas

Usar el siguiente formato JSON para que sea compatible con el pipeline del microservicio:

```json
[
  {
    "id": "cn_001",
    "fuente": "synthetic",
    "texto": "Ojalá pudiera desaparecer, no sirvo para nada",
    "labels": {
      "cumple_normas": 1
    },
    "anotador_1": { "cumple_normas": 1 },
    "anotador_2": { "cumple_normas": 1 },
    "acuerdo": true,
    "notas": ""
  }
]
```

Guardar el archivo como `nlp_engine/data_collection/cleaned/community_dataset.json`.

### 4.4 Adaptar prepare_datasets.py

Para limpiar y unificar el dataset de normas, crear una versión adaptada del script existente:

```python
# community_prepare.py — Adaptar desde prepare_datasets.py
# El script existente ya maneja:
#   - Normalización Unicode NFC
#   - Eliminación de URLs y hashtags
#   - Conversión de emojis a texto (usando emoji_map.json)
# Agregar solo la carga de la nueva fuente de datos y el mapeo al campo "cumple_normas"

def load_community_source(filepath: str) -> list:
    """Carga y normaliza una fuente de datos de normas de comunidad."""
    # Adaptar según el formato de origen (CSV de HatEval, JSON manual, etc.)
    pass

def build_community_dataset(sources: list) -> list:
    """Unifica las fuentes y aplica el mismo preprocesamiento del pipeline clínico."""
    pass
```

---

## 5. Fine-tuning del modelo clínico (BETO multilabel)

El notebook está organizado en celdas numeradas. Ejecutarlas en orden es obligatorio.

```python
# ============================================================
# CELDA 1 — Instalación de dependencias
# ============================================================
!pip install transformers==4.40.0 torch==2.3.0 scikit-learn --quiet
```

```python
# ============================================================
# CELDA 2 — Importaciones y configuración global
# ============================================================
import json, os, torch, numpy as np
import torch.nn.functional as F
from torch import nn
from torch.utils.data import Dataset, DataLoader, random_split
from transformers import (
    BertTokenizerFast, BertModel,
    AdamW, get_linear_schedule_with_warmup
)
from sklearn.metrics import f1_score, classification_report
from google.colab import drive

drive.mount('/content/drive')

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device activo: {DEVICE}")

CONFIG = {
    "model_name":    "dccuchile/bert-base-spanish-wwm-cased",  # BETO
    "dataset_path":  "/content/drive/MyDrive/mindbridge_nlp/unified_dataset.json",
    "output_dir":    "/content/drive/MyDrive/mindbridge_nlp/checkpoints/clinical",
    "max_length":    256,      # 512 es el límite teórico; 256 reduce RAM sin pérdida significativa
    "batch_size":    16,
    "num_epochs":    5,
    "lr":            2e-5,
    "weight_decay":  0.01,
    "train_ratio":   0.80,
    "val_ratio":     0.10,
    "seed":          42,
    # pos_weight = neg_count / pos_count por clase (compensa desbalance)
    "class_weights": {
        "depression": 5121 / 400,   # ~12.8
        "anxiety":    5116 / 405,   # ~12.6
        "suicidal":   3114 / 2407,  # ~1.3
    }
}

torch.manual_seed(CONFIG["seed"])
```

```python
# ============================================================
# CELDA 3 — Dataset con soporte para etiquetas faltantes (-1)
# ============================================================
class MindBridgeDataset(Dataset):
    def __init__(self, records, tokenizer, max_length):
        self.records = records
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        record = self.records[idx]
        enc = self.tokenizer(
            record["texto"],
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )
        labels = record["labels"]
        # -1 indica dimensión no anotada; se preserva para la pérdida enmascarada
        label_tensor = torch.tensor(
            [labels["depresion"], labels["ansiedad"], labels["suicida"]],
            dtype=torch.float32
        )
        return {
            "input_ids":      enc["input_ids"].squeeze(0),
            "attention_mask": enc["attention_mask"].squeeze(0),
            "labels":         label_tensor
        }
```

```python
# ============================================================
# CELDA 4 — Modelo BETO con tres cabezas sigmoid independientes
# ============================================================
class BETOMultilabelClassifier(nn.Module):
    """
    Encoder BETO compartido + tres cabezas de clasificación independientes.
    Cada cabeza produce un logit escalar; sigmoid se aplica en la función de pérdida.
    """
    def __init__(self, model_name: str, dropout: float = 0.3):
        super().__init__()
        self.bert = BertModel.from_pretrained(model_name)
        hidden = self.bert.config.hidden_size  # 768

        self.depression_head = nn.Sequential(nn.Dropout(dropout), nn.Linear(hidden, 1))
        self.anxiety_head    = nn.Sequential(nn.Dropout(dropout), nn.Linear(hidden, 1))
        self.suicidal_head   = nn.Sequential(nn.Dropout(dropout), nn.Linear(hidden, 1))

    def forward(self, input_ids, attention_mask):
        # El token [CLS] (posición 0) condensa la representación global de la secuencia
        cls = self.bert(input_ids=input_ids, attention_mask=attention_mask
                        ).last_hidden_state[:, 0, :]  # (batch, 768)

        return torch.cat([
            self.depression_head(cls),
            self.anxiety_head(cls),
            self.suicidal_head(cls)
        ], dim=1)  # (batch, 3)
```

```python
# ============================================================
# CELDA 5 — Función de pérdida enmascarada (maneja los -1)
# ============================================================
def masked_bce_loss(logits, labels, pos_weights: torch.Tensor) -> torch.Tensor:
    """
    Excluye del cálculo del gradiente las posiciones con etiqueta -1.
    pos_weights penaliza más los falsos negativos en clases desbalanceadas.
    """
    mask = (labels >= 0).float()  # 1 donde hay anotación, 0 donde hay -1
    loss_matrix = F.binary_cross_entropy_with_logits(
        logits,
        labels.clamp(min=0),        # convierte -1 a 0 para evitar NaN; la máscara los excluye
        pos_weight=pos_weights,
        reduction='none'             # (batch, 3)
    )
    # Promedio solo sobre posiciones anotadas
    return (loss_matrix * mask).sum() / mask.sum().clamp(min=1e-8)


pos_weights = torch.tensor([
    CONFIG["class_weights"]["depression"],
    CONFIG["class_weights"]["anxiety"],
    CONFIG["class_weights"]["suicidal"]
], dtype=torch.float32).to(DEVICE)
```

```python
# ============================================================
# CELDA 6 — Carga del dataset y splits
# ============================================================
with open(CONFIG["dataset_path"], "r", encoding="utf-8") as f:
    records = json.load(f)

print(f"Registros cargados: {len(records)}")

tokenizer   = BertTokenizerFast.from_pretrained(CONFIG["model_name"])
full_ds     = MindBridgeDataset(records, tokenizer, CONFIG["max_length"])

n_total = len(full_ds)
n_train = int(n_total * CONFIG["train_ratio"])
n_val   = int(n_total * CONFIG["val_ratio"])
n_test  = n_total - n_train - n_val

train_ds, val_ds, test_ds = random_split(
    full_ds, [n_train, n_val, n_test],
    generator=torch.Generator().manual_seed(CONFIG["seed"])
)

print(f"Train: {n_train} | Val: {n_val} | Test: {n_test}")

train_loader = DataLoader(train_ds, batch_size=CONFIG["batch_size"], shuffle=True,  num_workers=2)
val_loader   = DataLoader(val_ds,   batch_size=CONFIG["batch_size"], shuffle=False, num_workers=2)
test_loader  = DataLoader(test_ds,  batch_size=CONFIG["batch_size"], shuffle=False, num_workers=2)
```

```python
# ============================================================
# CELDA 7 — Inicialización del modelo, optimizador y scheduler
# ============================================================
model = BETOMultilabelClassifier(CONFIG["model_name"]).to(DEVICE)

optimizer = AdamW(
    model.parameters(),
    lr=CONFIG["lr"],
    weight_decay=CONFIG["weight_decay"]
)

total_steps = len(train_loader) * CONFIG["num_epochs"]
scheduler   = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps=int(0.1 * total_steps),
    num_training_steps=total_steps
)
```

```python
# ============================================================
# CELDA 8 — Funciones de entrenamiento y evaluación
# ============================================================
def train_epoch(model, loader, optimizer, scheduler):
    model.train()
    total_loss = 0.0
    for batch in loader:
        ids   = batch["input_ids"].to(DEVICE)
        mask  = batch["attention_mask"].to(DEVICE)
        lbls  = batch["labels"].to(DEVICE)

        optimizer.zero_grad()
        loss = masked_bce_loss(model(ids, mask), lbls, pos_weights)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()
        total_loss += loss.item()
    return total_loss / len(loader)


def evaluate(model, loader, threshold: float = 0.5):
    model.eval()
    total_loss, all_preds, all_labels = 0.0, [], []
    with torch.no_grad():
        for batch in loader:
            ids  = batch["input_ids"].to(DEVICE)
            mask = batch["attention_mask"].to(DEVICE)
            lbls = batch["labels"].to(DEVICE)

            logits     = model(ids, mask)
            total_loss += masked_bce_loss(logits, lbls, pos_weights).item()

            probs = torch.sigmoid(logits).cpu().numpy()
            preds = (probs >= threshold).astype(int)
            # Excluir posiciones no anotadas de las métricas
            valid_mask = (lbls.cpu().numpy() >= 0)
            all_preds.append(preds)
            all_labels.append(np.where(valid_mask, lbls.cpu().numpy(), -1))

    all_preds  = np.vstack(all_preds)
    all_labels = np.vstack(all_labels)

    names = ["depresion", "ansiedad", "suicida"]
    f1 = {}
    for i, name in enumerate(names):
        valid = all_labels[:, i] >= 0
        if valid.sum() > 0:
            f1[name] = f1_score(all_labels[valid, i], all_preds[valid, i], zero_division=0)
        else:
            f1[name] = 0.0

    return {"loss": total_loss / len(loader), "f1": f1,
            "f1_macro": float(np.mean(list(f1.values())))}
```

```python
# ============================================================
# CELDA 9 — Bucle de entrenamiento con guardado del mejor modelo
# ============================================================
os.makedirs(CONFIG["output_dir"], exist_ok=True)
best_f1_suicidal = 0.0

for epoch in range(1, CONFIG["num_epochs"] + 1):
    train_loss   = train_epoch(model, train_loader, optimizer, scheduler)
    val_metrics  = evaluate(model, val_loader)

    print(f"\nEpoch {epoch}/{CONFIG['num_epochs']}")
    print(f"  Train loss : {train_loss:.4f}")
    print(f"  Val loss   : {val_metrics['loss']:.4f}")
    for dim, score in val_metrics["f1"].items():
        print(f"  Val F1 {dim:10s}: {score:.3f}")
    print(f"  Val F1 macro: {val_metrics['f1_macro']:.3f}")

    # Criterio de guardado: F1 en ideación suicida (dimensión más crítica)
    if val_metrics["f1"]["suicida"] > best_f1_suicidal:
        best_f1_suicidal = val_metrics["f1"]["suicida"]
        ckpt_dir = CONFIG["output_dir"]
        model.bert.save_pretrained(ckpt_dir)
        tokenizer.save_pretrained(ckpt_dir)
        torch.save(model.state_dict(), os.path.join(ckpt_dir, "classifier_heads.pt"))
        # Guardar metadatos del entrenamiento
        metadata = {
            "epoch": epoch,
            "f1_suicidal": best_f1_suicidal,
            "f1_depression": val_metrics["f1"]["depresion"],
            "f1_anxiety": val_metrics["f1"]["ansiedad"],
            "config": {k: v for k, v in CONFIG.items() if k != "class_weights"}
        }
        with open(os.path.join(ckpt_dir, "training_metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"  ✓ Checkpoint guardado (F1 suicidal: {best_f1_suicidal:.3f})")

print("\n=== Entrenamiento completado ===")
```

```python
# ============================================================
# CELDA 10 — Evaluación final en test set
# ============================================================
test_metrics = evaluate(model, test_loader)

print("\n=== Evaluación en Test Set ===")
print(f"Loss: {test_metrics['loss']:.4f}")
for dim, score in test_metrics["f1"].items():
    print(f"F1 {dim:10s}: {score:.3f}")
print(f"F1 macro : {test_metrics['f1_macro']:.3f}")

# Criterio de éxito (sección 16.3 del contrato NLP):
# F1 suicidal >= 0.70 en test set
threshold_ok = test_metrics["f1"]["suicida"] >= 0.70
status = "✓ CRITERIO ALCANZADO" if threshold_ok else "✗ POR DEBAJO DEL UMBRAL (0.70)"
print(f"\n{status} — F1 suicidal = {test_metrics['f1']['suicida']:.3f}")

if not threshold_ok:
    print("Acciones posibles:")
    print("  1. Aumentar num_epochs (probar 8-10).")
    print("  2. Reducir threshold a 0.4 y re-evaluar.")
    print("  3. Revisar calidad del dataset: buscar registros suicida=1 con texto ambiguo.")
```

---

## 6. Entrenamiento del clasificador de normas de comunidad

El clasificador de normas de comunidad es más simple que el clínico porque opera sobre una tarea binaria con vocabulario más acotado. Se recomienda comenzar con TF-IDF + Regresión Logística y escalar a BETO solo si los resultados no satisfacen el umbral.

```python
# ============================================================
# CELDA 1 — Clasificador de normas (TF-IDF + Regresión Logística)
# Ejecutar en un notebook separado: community_model_training.ipynb
# ============================================================
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, classification_report
import joblib, os

# Cargar dataset de normas de comunidad
with open("/content/drive/MyDrive/mindbridge_nlp/community_dataset.json", "r", encoding="utf-8") as f:
    records = json.load(f)

texts  = [r["texto"] for r in records]
labels = [r["labels"]["cumple_normas"] for r in records]

X_train, X_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.20, random_state=42, stratify=labels
)

# TF-IDF con n-gramas de 1 y 2 palabras
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    max_features=20_000,
    sublinear_tf=True  # normalización logarítmica
)
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf  = vectorizer.transform(X_test)

# Regresión Logística con balanceo automático de clases
clf = LogisticRegression(
    C=1.0,
    class_weight="balanced",
    max_iter=1000,
    random_state=42
)
clf.fit(X_train_tfidf, y_train)

y_pred = clf.predict(X_test_tfidf)
print(classification_report(y_test, y_pred, target_names=["viola_norma", "cumple_norma"]))

# Umbral de éxito: F1 en clase viola_norma >= 0.75
f1_violation = f1_score(y_test, y_pred, pos_label=0)
print(f"\nF1 viola_norma: {f1_violation:.3f}")
if f1_violation >= 0.75:
    print("✓ Criterio de éxito alcanzado")
else:
    print("✗ Considerar usar BETO fine-tuneado para esta tarea")

# Guardar el modelo
output_dir = "/content/drive/MyDrive/mindbridge_nlp/checkpoints/community"
os.makedirs(output_dir, exist_ok=True)
joblib.dump(vectorizer, os.path.join(output_dir, "tfidf_vectorizer.pkl"))
joblib.dump(clf,        os.path.join(output_dir, "lr_classifier.pkl"))
print(f"\nModelo guardado en: {output_dir}")
```

Si el F1 en `viola_norma` no alcanza 0.75 con TF-IDF, escalar a BETO usando el mismo esqueleto del notebook clínico con una sola cabeza sigmoid (reemplazar las tres cabezas por una).

---

## 7. Artefactos a entregar

Al finalizar el entrenamiento, entregar los siguientes archivos para que Juan Diego los integre al microservicio:

### Modelo clínico → carpeta `nlp_engine/src/models/clinical_model_v1/`

| Archivo | Origen |
|---|---|
| `config.json` | Generado automáticamente por `save_pretrained()` |
| `pytorch_model.bin` o `model.safetensors` | Pesos de BETO generados por `save_pretrained()` |
| `vocab.txt` | Generado automáticamente por `tokenizer.save_pretrained()` |
| `tokenizer_config.json` | Generado automáticamente por `tokenizer.save_pretrained()` |
| `special_tokens_map.json` | Generado automáticamente por `tokenizer.save_pretrained()` |
| `classifier_heads.pt` | Guardado explícitamente en la Celda 9 con `torch.save(model.state_dict(), ...)` |
| `training_metadata.json` | Guardado en Celda 9; contiene F1 por dimensión, época y configuración de entrenamiento |

### Clasificador de normas → carpeta `nlp_engine/src/models/community_model_v1/`

Si se usó TF-IDF + LR:

| Archivo | Origen |
|---|---|
| `tfidf_vectorizer.pkl` | Guardado con `joblib.dump` |
| `lr_classifier.pkl` | Guardado con `joblib.dump` |

Si se usó BETO fine-tuneado para normas:

Los mismos archivos del modelo clínico pero sin `classifier_heads.pt` (solo un peso de cabeza) más `community_classifier_head.pt`.

### Qué NO entregar

- La carpeta `venv_mindbridge/` o cualquier entorno virtual.
- Los archivos `.csv` o `.json` de los datasets fuente.
- Los notebooks `.ipynb` (son herramienta de desarrollo, no artefacto de entrega).

---

## 8. Verificación de la integración

Una vez que los archivos estén en `src/models/`, Juan Diego reemplazará el stub en `src/stubs/` por la clase `BETOClinicalModel` que cargue estos artefactos. Para verificar que la integración es correcta antes de la entrega, el test existente `test_pipeline_stratification` en `tests/` se ejecuta sobre el modelo real. Si pasa, la integración es correcta. Si falla con error de forma de tensor, revisar que `classifier_heads.pt` corresponde exactamente al modelo guardado en `config.json`.
