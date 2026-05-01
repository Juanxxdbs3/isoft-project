import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from groq import Groq

# =========================
# Configuración general
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
TEXTS_PATH = DATA_DIR / "phase2_texts.json"
RESULTS_PATH = DATA_DIR / "phase2_results.json"

MODEL_NAME = "llama-3.3-70b-versatile"

load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")
if not API_KEY:
    raise RuntimeError("No se encontró GROQ_API_KEY. Revisa tu archivo .env o la variable de entorno.")

client = Groq(api_key=API_KEY)

SYSTEM_PROMPT = """
Eres un clasificador clínico de señales de malestar psicológico en texto en español.

Para cada texto que recibas, devuelve ÚNICAMENTE un JSON con esta estructura:

{
  "p_depresion": <número de 0 a 100>,
  "p_ansiedad": <número de 0 a 100>,
  "p_suicida": <número de 0 a 100>,
  "score_normas": <número de 0 a 100>,
  "cumple_normas": <true o false>,
  "razon_normas": "<string breve si no cumple, null si cumple>",
  "notas": "<string breve explicando los scores>"
}

Reglas:
- p_depresion: señales de tristeza persistente, desesperanza, vacío, fatiga emocional, pérdida de interés.
- p_ansiedad: preocupación excesiva, tensión, anticipación negativa, agitación, síntomas somáticos de estrés.
- p_suicida: ideación pasiva (deseos de no existir, desaparecer) o activa (planes, métodos, intenciones explícitas).
- score_normas: 0 significa incumplimiento claro, 100 significa cumplimiento claro.
- cumple_normas: evalúa ÚNICAMENTE si el texto contiene contenido dañino dirigido a TERCEROS: insultos, amenazas, agresión verbal hacia otras personas.
    El malestar psicológico del autor, incluyendo ideación suicida, NO es violación de normas de comunidad. 
    Un texto con ideación suicida debe tener cumple_normas=true si no agrede a terceros.
- Si hay duda sobre normas, evalúa de forma conservadora.

Formato:
- Responde SOLO con el JSON.
- No uses texto adicional.
- No uses backticks.
- No agregues explicaciones fuera del JSON.
- Usa números, no cadenas, para los scores.
""".strip()


def extract_json(raw: str) -> Dict[str, Any]:
    text = raw.strip()

    # Quitar fences si el modelo los devuelve
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)

    # Intentar recortar hasta el primer JSON válido
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]

    return json.loads(text)


def top_clinical_label(scores: Dict[str, Any]) -> str | None:
    keys = ["p_depresion", "p_ansiedad", "p_suicida"]
    valid = {k: scores.get(k) for k in keys if isinstance(scores.get(k), (int, float))}
    if not valid:
        return None
    max_val = max(valid.values())
    if max_val == 0:
        return None  # sin señal clínica, no hay top
    return max(valid, key=valid.get)


def main() -> None:
    with TEXTS_PATH.open("r", encoding="utf-8") as f:
        texts: List[Dict[str, Any]] = json.load(f)

    results: List[Dict[str, Any]] = []

    for item in texts:
        user_text = item["texto"]

        response = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_text},
            ],
        )

        raw = response.choices[0].message.content.strip()

        try:
            scores = extract_json(raw)
        except Exception as exc:
            scores = {
                "error": "parse_failed",
                "exception": str(exc),
                "raw": raw,
            }

        predicted_top = top_clinical_label(scores) if "error" not in scores else None

        result = {
            "id": item["id"],
            "categoria_esperada": item.get("categoria_esperada", []),
            "cumple_normas_esperado": item.get("cumple_normas_esperado", None),
            "texto_preview": user_text[:120] + ("..." if len(user_text) > 120 else ""),
            "raw_response": raw,
            "scores": scores,
            "predicted_top_clinical": predicted_top,
        }

        results.append(result)
        print(f"[{item['id']}] esperado={item.get('categoria_esperada', [])} -> top={predicted_top} | normas={scores.get('cumple_normas')}")

    with RESULTS_PATH.open("w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nResultados guardados en: {RESULTS_PATH}")


if __name__ == "__main__":
    main()