import axios, { AxiosResponse } from "axios";
import {
  ComentarioParaAnalise,
  AnaliseResultado,
  AnaliseAspecto,
  ComentarioSentimento,
  ResumoColetivoEntrada,
} from "../resources/comentario/comentario.types";
import { IAnalysisService } from "./modulo/analysis.interface";

// --- CONFIGURAÇÃO PRINCIPAL ---
// Google Gemini API - Configuração atualizada
// ALTERAÇÃO 1: Mudar para o modelo que funcionou no seu exemplo
const MODELO_FLASH = "gemini-2.5-flash"; 
const BASE_URL = "https://generativelanguage.googleapis.com";
const TEMPERATURE = 0.2;
const TIMEOUT_MS = 30000;

export class GeminiAnalysisService implements IAnalysisService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não está configurada.");
    }
    this.apiKey = apiKey;
  }

  private getEndpoint(model?: string): string {
    const modelName = model ?? MODELO_FLASH;
    // ALTERAÇÃO 2: Mudar para o endpoint v1beta, que é o correto para a série 2.5
    return `${BASE_URL}/v1beta/models/${modelName}:generateContent`;
  }


  private async requestGemini(
    body: Record<string, unknown>,
    options?: { model?: string; timeoutMs?: number }
  ): Promise<AxiosResponse<any>> {
    return axios.post(this.getEndpoint(options?.model), body, {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      timeout: options?.timeoutMs ?? TIMEOUT_MS,
      // Manter validateStatus: () => true é bom para capturar o corpo do 404/400
      validateStatus: () => true,
    });
  }

  private extractPrimaryText(payload: any): string | null {
    const parts = payload?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;
    const texto = parts
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("\n")
      .trim();
    return texto.length ? texto : null;
  }

  private buildPrompt(comentario: ComentarioParaAnalise): string {
    return `
Você é um assistente que avalia comentários de usuários sobre dispositivos eletrônicos.
Leia o comentário e identifique características específicas do aparelho que foram elogiadas ou criticadas.
Classifique cada característica utilizando **somente** um dos rótulos da escala abaixo e associe um valor de 0 a 5:
- horrivel -> 0
- ruim -> 1
- basica -> 2
- boa -> 3
- otima -> 4
- excelente -> 5

Responda **somente** em JSON com o formato:

{
  "summary": "Resumo curto do sentimento geral",
  "aspects": [
    {
      "aspect": "nome_da_caracteristica",
      "sentiment_label": "horrivel|ruim|basica|boa|otima|excelente",
      "score": 0-5,
      "justification": "frase curta explicando"
    }
  ]
}

Comentário: """${comentario.conteudo}"""
    `.trim();
  }

  async analisarComentario(
    comentario: ComentarioParaAnalise
  ): Promise<AnaliseResultado> {
    const prompt = this.buildPrompt(comentario);

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      // O 'generationConfig' está correto (sem responseMimeType, conforme o seu exemplo funcional)
      generationConfig: { temperature: TEMPERATURE },
    };

    const response = await this.requestGemini(body, { model: MODELO_FLASH });

    if (response.status >= 400) {
      throw new Error(`Erro ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const rawText = this.extractPrimaryText(response.data) ?? "";
    if (!rawText.trim()) {
      throw new Error("Resposta do Gemini vazia ou inesperada.");
    }

    const parsed = this.parseJsonSafe(rawText);
    const summary = this.extrairResumo(parsed);
    const aspects = this.sanitizarAspectos(parsed?.aspects);

    return {
      summary: summary ?? undefined,
      aspects,
      promptPayload: { prompt },
      responsePayload: {
        model: MODELO_FLASH,
        rawText,
        parsed,
        apiResponse: response.data,
      },
    };
  }

  private parseJsonSafe(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return {};
        }
      }
      return {};
    }
  }

  private extrairResumo(payload: any): string | undefined {
    if (!payload || typeof payload !== "object") return undefined;
    for (const key of ["summary", "resumo", "overview"]) {
      const val = payload[key];
      if (typeof val === "string" && val.trim()) return val.trim();
    }
    return undefined;
  }

  private sanitizarAspectos(input: any): AnaliseAspecto[] {
    if (!Array.isArray(input)) return [];
    const result: AnaliseAspecto[] = [];

    for (const x of input) {
      if (!x || typeof x !== "object") continue;

      const aspect = x.aspect || x.caracteristica || x.nome || x.feature || null;
      const sentimentPayload = this.normalizarSentimento(
        x.sentiment_label ?? x.sentiment ?? x.sentimento ?? null,
        x.score ?? x.nota ?? x.valor ?? null
      );
      const justification =
        x.justification || x.justificativa || x.reason || undefined;

      if (!aspect || !sentimentPayload) continue;

      result.push({
        aspect: String(aspect),
        sentimentLabel: sentimentPayload.label,
        score: sentimentPayload.score,
        ...(justification ? { justification: String(justification) } : {}),
      });
    }
    return result;
  }

  async sintetizarResumoColetivo(
    entrada: ResumoColetivoEntrada
  ): Promise<string | null> {
    if (!entrada.comentarios.length) return null;

    const prompt = this.buildResumoColetivoPrompt(entrada);
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      // O 'generationConfig' está correto (sem responseMimeType, conforme o seu exemplo funcional)
      generationConfig: { temperature: TEMPERATURE },
    };

    const response = await this.requestGemini(body, { model: MODELO_FLASH });

    if (response.status >= 400) {
      throw new Error(`Erro ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const texto = this.extractPrimaryText(response.data);
    if (!texto) return null;
    const trimmed = texto.trim();
    return trimmed.length ? trimmed : null;
  }

  private buildResumoColetivoPrompt(entrada: ResumoColetivoEntrada): string {
    const blocos = entrada.comentarios
      .map((comentario, index) => {
        const aspectos =
          comentario.aspectos?.length && comentario.aspectos.length > 0
            ? comentario.aspectos
                .map((aspecto) => {
                  const partes = [
                    `aspecto: ${aspecto.aspect}`,
                    `sentimento: ${aspecto.sentimentLabel}`,
                    `score: ${aspecto.score}`,
                  ];
                  if (aspecto.justification) {
                    partes.push(`justificativa: ${aspecto.justification}`);
                  }
                  return `- ${partes.join(" | ")}`;
                })
                .join("\n")
            : "- Nenhum aspecto destacado";
        return [
          `Comentário ${index + 1}:`,
          `Resumo: ${comentario.resumo}`,
          "Aspectos:",
          aspectos,
        ].join("\n");
      })
      .join("\n\n");

    return `
Você é um assistente que sintetiza opiniões de consumidores sobre dispositivos eletrônicos.
Leia os resumos e aspectos avaliados a seguir e escreva um único parágrafo em Português do Brasil que explique, de forma acolhedora e fácil de entender, como as pessoas têm se sentido em relação ao produto.
- Destaque os principais pontos fortes e eventuais pontos de atenção.
- Evite números e porcentagens; prefira expressões qualitativas.
- Limite a resposta a no máximo 5 frases curtas.

Dados para análise:
${blocos}

Resposta:`.trim();
  }

  private readonly SENTIMENT_SCALE: Array<{
    label: ComentarioSentimento;
    score: number;
    aliases: string[];
  }> = [
    {
      label: "horrivel",
      score: 0,
      aliases: [
        "horrivel",
        "horrível",
        "pessimo",
        "péssimo",
        "terrivel",
        "terrível",
        "awful",
        "terrible",
        "dreadful",
        "horrid",
        "very bad",
      ],
    },
    {
      label: "ruim",
      score: 1,
      aliases: [
        "ruim",
        "fraco",
        "negativo",
        "defeituoso",
        "poor",
        "bad",
        "weak",
        "not good",
      ],
    },
    {
      label: "basica",
      score: 2,
      aliases: [
        "basica",
        "básica",
        "mediano",
        "mediana",
        "ok",
        "okay",
        "regular",
        "average",
        "neutro",
        "neutra",
      ],
    },
    {
      label: "boa",
      score: 3,
      aliases: [
        "boa",
        "positiva",
        "satisfeito",
        "satisfeita",
        "satisfatorio",
        "satisfatório",
        "good",
        "decent",
        "nice",
      ],
    },
    {
      label: "otima",
      score: 4,
      aliases: [
        "otima",
        "ótima",
        "muito boa",
        "great",
        "very good",
        "muito bom",
        "awesome",
        "strong",
      ],
    },
    {
      label: "excelente",
      score: 5,
      aliases: [
        "excelente",
        "perfeito",
        "perfeita",
        "fantastico",
        "fantástico",
        "incrivel",
        "incrível",
        "amazing",
        "outstanding",
        "excelent",
      ],
    },
  ];

  private normalizarTexto(valor: string): string {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private normalizarSentimento(
    valor: unknown,
    scoreBruto: unknown
  ): { label: ComentarioSentimento; score: number } | null {
    const numeric =
      typeof scoreBruto === "number" && Number.isFinite(scoreBruto)
        ? Math.max(0, Math.min(5, scoreBruto))
        : null;

    if (numeric !== null) {
      const arredondado = Math.round(numeric);
      const entry = this.SENTIMENT_SCALE.find(
        (item) => item.score === arredondado
      );
      if (entry) return { label: entry.label, score: arredondado };
    }

    const texto =
      typeof valor === "string" ? this.normalizarTexto(valor) : "";
    if (!texto) return null;

    for (const entry of this.SENTIMENT_SCALE) {
      if (
        entry.aliases.some((alias) =>
          texto.includes(this.normalizarTexto(alias))
        )
      ) {
        return { label: entry.label, score: entry.score };
      }
    }
    return null;
  }
}