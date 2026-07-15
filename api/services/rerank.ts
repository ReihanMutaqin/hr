import { getDb } from "../queries/connection.js";
import { aiLogs } from "../../db/schema.js";

/**
 * AI rerank service — NVIDIA Llama Nemotron Rerank VL 1B v2 via OpenRouter.
 * Endpoint: POST https://openrouter.ai/api/v1/rerank (Cohere-compatible).
 * Includes a deterministic keyword-based fallback when the API is unavailable.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/rerank";
const DEFAULT_MODEL = "nvidia/llama-nemotron-rerank-vl-1b-v2:free";

export type RerankResult = {
  index: number;
  score: number; // normalized 0-100 (best doc in batch = 100)
  rawScore: number; // raw relevance score from the model
};

export type RerankResponse = {
  results: RerankResult[];
  model: string;
  fallback: boolean;
};

type OpenRouterRerankPayload = {
  results?: Array<{
    index: number;
    relevance_score: number;
    document?: { text?: string };
  }>;
};

/* ------------------------------------------------------------------ */
/* Fallback: keyword overlap scoring (deterministic)                   */
/* ------------------------------------------------------------------ */
const STOPWORDS = new Set([
  "yang", "dan", "atau", "dengan", "untuk", "pada", "dari", "dalam", "the", "and",
  "for", "with", "a", "an", "of", "to", "in", "is", "are", "di", "ke", "ini", "itu",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function fallbackScore(query: string, documents: string[]): RerankResult[] {
  const qTokens = tokenize(query);
  const qSet = new Set(qTokens);
  const results = documents.map((doc, index) => {
    const dTokens = tokenize(doc);
    const dSet = new Set(dTokens);
    let matched = 0;
    for (const t of qSet) if (dSet.has(t)) matched += 1;
    // term-frequency weighting for repeated important tokens
    let tfBoost = 0;
    for (const t of qTokens) {
      const count = dTokens.filter((d) => d === t).length;
      if (count > 1) tfBoost += Math.min(count - 1, 3) * 0.5;
    }
    const base = qSet.size > 0 ? (matched / qSet.size) * 90 : 0;
    const score = Math.min(95, Math.round((base + tfBoost) * 10) / 10);
    return { index, score, rawScore: score / 100 };
  });
  return results.sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ */
/* Main rerank function                                                */
/* ------------------------------------------------------------------ */
export async function rerankDocuments(
  query: string,
  documents: string[],
  opts: { feature?: string; log?: boolean } = {},
): Promise<RerankResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_RERANK_MODEL || DEFAULT_MODEL;
  const feature = opts.feature ?? "generic";
  const shouldLog = opts.log !== false;

  let response: RerankResponse | null = null;

  if (apiKey && documents.length > 0) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          query: query.slice(0, 4000),
          documents: documents.map((d) => d.slice(0, 4000)),
          top_n: documents.length,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const payload = (await res.json()) as OpenRouterRerankPayload;
        const raw = payload.results ?? [];
        const maxRaw = Math.max(...raw.map((r) => r.relevance_score), 0);
        const results: RerankResult[] = raw
          .map((r) => ({
            index: r.index,
            rawScore: r.relevance_score,
            score:
              maxRaw > 0
                ? Math.round((r.relevance_score / maxRaw) * 1000) / 10
                : 0,
          }))
          .sort((a, b) => b.score - a.score);
        response = { results, model, fallback: false };
      } else {
        console.error(`[rerank] OpenRouter HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
    } catch (err) {
      console.error("[rerank] OpenRouter request failed:", err);
    }
  }

  if (!response) {
    response = { results: fallbackScore(query, documents), model: "keyword-fallback", fallback: true };
  }

  if (shouldLog) {
    try {
      await getDb().insert(aiLogs).values({
        feature,
        queryText: query.slice(0, 2000),
        model: response.model,
        docCount: documents.length,
        fallback: response.fallback,
      });
    } catch (err) {
      console.error("[rerank] failed to write ai log:", err);
    }
  }

  return response;
}
