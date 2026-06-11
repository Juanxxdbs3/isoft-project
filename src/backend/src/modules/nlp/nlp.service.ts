import { FastifyBaseLogger } from "fastify";
import { CONFIG } from "../../config.js";
import type { NLPRequest, NLPResponse } from "./nlp.types.js";

export class NLPService {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async analyze(payload: NLPRequest): Promise<NLPResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.NLP_TIMEOUT_MS);

    try {
      const res = await fetch(`${CONFIG.NLP_SERVICE_URL}/api/v1/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CONFIG.NLP_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        this.logger.warn(
          { status: res.status, id: payload.id_publicacion },
          "NLP service returned non-200",
        );
        return null;
      }

      return (await res.json()) as NLPResponse;
    } catch (err: any) {
      if (err.name === "AbortError") {
        this.logger.warn(
          { id: payload.id_publicacion },
          "NLP request timed out",
        );
      } else {
        this.logger.error(
          { err, id: payload.id_publicacion },
          "NLP request failed",
        );
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
