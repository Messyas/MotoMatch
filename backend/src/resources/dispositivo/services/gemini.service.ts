import axios, { AxiosResponse } from "axios";

import {
  CriterioPesquisa,
  GenerateContentResponse,
  SeletoresPesquisa,
  ChatMsg,
} from "../dispositivo.types";

const allowedTypes = [
  "ram",
  "rom",
  "battery",
  "benchmark",
  "screen_size",
  "main_camera",
  "secondary_camera",
  "tertiary_camera",
  "front_camera",
  "refresh_rate",
  "processor",
  "preco_intervalo",
];

export class GeminiService {
  static readonly FALLBACK_ERROR_PROMPT =
    "Desculpe, tive um problema ao processar seu pedido. Pode tentar de novo?";

  /**
   * MODO ANTIGO (Transacional): Apenas extrai filtros de um texto.
   * (Mantido para compatibilidade, mas a lógica nova usa 'orquestrar')
   */
  static async extract(text: string): Promise<CriterioPesquisa[]> {
    const prompt = `
      Você é um extrator de critérios técnicos para celulares.  
      Sua única saída deve ser **um JSON válido**, nada além disso.

      Formato de saída:
      [
        { "tipo": "um dos tipos permitidos", "descricao": "valor convertido" }
      ]

      Tipos permitidos: ${allowedTypes.join(", ")}, texto_livre

      Instruções críticas:
      - Extraia **todas** as informações possíveis que o usuário mencionar, mesmo que sejam vagas, aproximadas ou em sinônimos.
      - Se o usuário falar sobre mais de uma característica (ex.: RAM, bateria, câmera, processador, tela), extraia todas em entradas separadas no JSON.
      - Se houver múltiplos detalhes sobre câmeras (principal, frontal, etc.), extraia em campos distintos.
      - Nunca descarte uma informação relevante. Se não tiver certeza absoluta de onde mapear, escolha o tipo mais próximo da lista.
      - Se o valor não estiver nos mapeamentos, normalize para o mais parecido. Exemplo: “tela gigante” → “6.8”.
      - Se o usuário citar nomes técnicos (ex.: processador Snapdragon), retorne exatamente o texto citado.
      - Só use os tipos da lista; se não encontrar correspondência, use "texto_livre" e a descrição original.
      
      Conversão de descrições vagas para valores (usar exatamente como abaixo):

      RAM:
        - "básica" → 4
        - "intermediária" → 6
        - "boa", "ótima" → 8
        - "excelente", "topo" → 12

      ROM:
        - "baixo" → 64
        - "intermediário" → 128
        - "grande espaço" → 256
        - "muito espaço", "máximo" → 512

      Bateria:
        - "uso leve", "bateria fraca" → 4000
        - "uso moderado", "bateria ok" → 4500
        - "boa bateria", "dura o dia todo" → 5000
        - "muita bateria", "dura mais de um dia" → 6000

      Benchmark:
        - "básico" → 400000
        - "intermediário" → 700000
        - "avançado" → 1000000
        - "topo de linha", "máximo desempenho" → 1500000

      Tela (screen_size):
        - "pequena" → 5.5
        - "média" → 6.0
        - "grande" → 6.5
        - "muito grande", "gigante" → 6.8

      Câmeras:
        - "fraca" → 8~12
        - "razoável" → 12~20
        - "boa" → 50
        - "top" → 64+

      Refresh Rate:
        - "normal" → 60
        - "boa" → 90
        - "ótima" → 120

      Processador:
        - Retorne o nome citado pelo usuário, sem alteração.

      Exemplo de comportamento:
      Usuário: "quero celular com 6GB RAM, tela gigante, bateria que dure o dia todo e câmera frontal boa"
      Saída:
      [
        { "tipo": "ram", "descricao": "6" },
        { "tipo": "screen_size", "descricao": "6.8" },
        { "tipo": "battery", "descricao": "5000" },
        { "tipo": "front_camera", "descricao": "50" }
      ]

      Texto do usuário: """${text}"""
      `;
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    const body = { contents: [{ parts: [{ text: prompt }] }] };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return [];
    }

    try {
      const res: AxiosResponse<GenerateContentResponse> = await axios.post(
        URL,
        body,
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
        }
      );

      const raw = res.data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = new RegExp(/\[[\s\S]*\]/).exec(raw);
        parsed = match ? JSON.parse(match[0]) : [];
      }

      const clean = Array.isArray(parsed)
        ? parsed.filter(
            (item: any) =>
              item &&
              typeof item === "object" &&
              (allowedTypes.includes(item.tipo) || item.tipo === "texto_livre")
          )
        : [];

      return clean;
    } catch (err) {
      console.error(
        "[GeminiService] Falha ao extrair critérios com texto livre:",
        err
      );
      return [];
    }
  }

  /**
   * MODO NOVO (Conversacional): Orquestra a conversa E extrai o perfil.
   * Agora com tratamento para respostas "preguiçosas" do Gemini.
   */
  static async orquestrar(
    historicoConversa: ChatMsg[],
    filtrosSelecionados: SeletoresPesquisa
  ): Promise<{ acao: "PERGUNTAR" | "PESQUISAR"; dados: any }> {
    console.log("[GeminiService.orquestrar] Iniciando orquestração...");

    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { acao: "PESQUISAR", dados: { filtros: [] } };
    }

    const ultimaMensagem = historicoConversa.slice(-1)[0];
    const textoUsuario =
      (ultimaMensagem as any).consoleInput ??
      (ultimaMensagem as any).content ??
      "";

    // ** O PROMPT ROBUSTO **
    const prompt = `
      Sua tarefa é dupla:
      1.  **Orquestrar:** Decidir o próximo passo (PERGUNTAR ou PESQUISAR).
      2.  **Extrair:** Se for PESQUISAR, extrair TODOS os critérios (explícitos e de perfil).

      Sua saída DEVE ser um JSON puro.

      --- Histórico (Contexto) ---
      ${JSON.stringify(historicoConversa)}

      --- Filtros Manuais Atuais ---
      ${JSON.stringify(filtrosSelecionados)}

      --- Tipos Permitidos para Extração ---
      ${allowedTypes.join(", ")}, texto_livre

      --- Regras de Decisão ---
      1.  **Se a informação for insuficiente (ex: falta orçamento, ou o usuário só disse "oi"), você DEVE PERGUNTAR.**
          Exemplo: { "acao": "PERGUNTAR", "dados": { "pergunta": "..." } }

      2.  **Se a informação for suficiente, você DEVE PESQUISAR.**
          Extraia TODOS os critérios da última mensagem.
          Exemplo: { "acao": "PESQUISAR", "dados": { "filtros": [ { "tipo": "ram", "descricao": "8" } ] } }
      
      --- Texto do Usuário ---
      """${textoUsuario}"""
    `;

    const body = { contents: [{ parts: [{ text: prompt }] }] };

    try {
      const res: AxiosResponse<GenerateContentResponse> = await axios.post(
        URL,
        body,
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
        }
      );

      const raw = res.data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = new RegExp(/\{[\s\S]*\}/).exec(raw);
        parsed = match ? JSON.parse(match[0]) : {};
      }

      // 1. Caso Perfeito: Gemini seguiu o formato
      if (parsed.acao === "PERGUNTAR" || parsed.acao === "PESQUISAR") {
        // Correção de fallback se filtros vierem vazios em pesquisa
        if (
          parsed.acao === "PESQUISAR" &&
          (!parsed.dados?.filtros || parsed.dados.filtros.length === 0) &&
          textoUsuario.length > 0
        ) {
          parsed.dados = {
            filtros: [{ tipo: "texto_livre", descricao: textoUsuario }],
          };
        }
        return parsed;
      }

      // 2. Caso "Preguiçoso": Gemini mandou o objeto direto (ex: { "ram": "8" })
      // Vamos tentar salvar a resposta convertendo para o nosso formato.
      const keys = Object.keys(parsed);
      // Verifica se alguma chave parece um dos nossos tipos (ex: ram, battery, preco)
      const temChavesValidas = keys.some(
        (k) =>
          allowedTypes.includes(k) ||
          k === "texto_livre" ||
          k === "price_range"
      );

      if (temChavesValidas) {
        console.warn(
          "[GeminiService] Gemini respondeu fora do formato, tentando corrigir..."
        );

        const filtrosConvertidos = keys
          .map((key) => ({
            tipo: key,
            descricao: String(parsed[key]),
          }))
          .filter(
            (f) => allowedTypes.includes(f.tipo) || f.tipo === "texto_livre"
          );

        return {
          acao: "PESQUISAR",
          dados: {
            filtros: filtrosConvertidos,
          },
        };
      }

      throw new Error(`Resposta inesperada do Gemini.orquestrar: ${raw}`);
    } catch (error) {
      console.error("[GeminiService.orquestrar] Erro ao chamar IA:", error);
      return {
        acao: "PERGUNTAR",
        dados: {
          pergunta: GeminiService.FALLBACK_ERROR_PROMPT,
        },
      };
    }
  }
}