import { getDb } from "../queries/connection.js";
import { aiLogs } from "../../db/schema.js";

/**
 * AI CV Reader service — Uses OpenRouter Chat Completions (or fallback)
 * to evaluate a candidate's CV against a job description.
 */

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_CHAT_MODEL = "tencent/hy3:free";

export type CVEvaluationResponse = {
  opinion: string;
  model: string;
  fallback: boolean;
};

export async function evaluateCandidateCV(
  jobDetails: string,
  cvText: string,
): Promise<CVEvaluationResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_CHAT_MODEL || DEFAULT_CHAT_MODEL;
  
  if (!apiKey) {
    return {
      opinion: "Silakan tambahkan OPENROUTER_API_KEY di environment variables untuk mendapatkan analisis AI yang komprehensif. Secara umum, sistem belum dapat memberikan pendapat yang mendetail tanpa akses ke API LLM.",
      model: "fallback-static",
      fallback: true,
    };
  }

  const prompt = `Anda adalah seorang HR Expert / Perekrut Profesional.
Saya akan memberikan deskripsi lowongan kerja dan teks CV/resume dari seorang kandidat.
Tugas Anda adalah:
1. Evaluasi apakah keterampilan (skills) dan pengalaman kandidat cocok (nyambung) dengan posisi tersebut.
2. Berikan pendapat profesional singkat (maksimal 2-3 paragraf singkat) mengenai kekuatan dan kelemahan utama kandidat ini terkait lowongan tersebut.
3. Gunakan bahasa Indonesia yang profesional, ramah, dan langsung pada intinya.
4. Jangan menuliskan pendahuluan basa-basi seperti "Tentu, saya bantu", langsung berikan pendapat Anda.

=== DETAIL LOWONGAN ===
${jobDetails}

=== CV KANDIDAT ===
${cvText}
`;

  try {
    const res = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (res.ok) {
      const payload = (await res.json()) as any;
      const opinion = payload.choices?.[0]?.message?.content || "Tidak ada respon dari AI.";
      
      try {
        await getDb().insert(aiLogs).values({
          feature: "cv-evaluation",
          queryText: prompt.substring(0, 2000),
          model,
          docCount: 1,
          fallback: false,
        });
      } catch (e) {
        console.error("Failed to insert AI log", e);
      }

      return {
        opinion: opinion.trim(),
        model,
        fallback: false,
      };
    } else {
      const errorText = await res.text();
      console.error(`[cvReader] OpenRouter HTTP ${res.status}: ${errorText}`);
      
      let parsedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        parsedError = errorJson.error?.message || errorText;
      } catch (e) {}

      return {
        opinion: `Gagal terhubung ke layanan AI (HTTP ${res.status}).\nPesan Error: ${parsedError}`,
        model: "error-fallback",
        fallback: true,
      };
    }
  } catch (err: any) {
    console.error("[cvReader] OpenRouter request failed:", err);
    return {
      opinion: `Gagal mengirim request ke AI. Detail: ${err.message}`,
      model: "error-fallback",
      fallback: true,
    };
  }
}
