import axios from "axios";
import { createHash } from "crypto";
import {
  ComentarioCsvDTO,
  ResumoProdutoCsvDTO,
} from "../resources/comentario/comentario.types";

const mesesPtBr: { [key: string]: number } = {
  "jan.": 0, "fev.": 1, "mar.": 2, "abr.": 3, "mai.": 4, "jun.": 5,
  "jul.": 6, "ago.": 7, "set.": 8, "out.": 9, "nov.": 10, "dez.": 11,
};

// Função para interpretar datas como "10 ago. 2025"
function parseDatePtBr(dateString: string): Date | null {
  const parts = dateString.toLowerCase().split(" ");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = mesesPtBr[parts[1]];
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || month === undefined || isNaN(year)) {
    return null;
  }

  return new Date(year, month, day);
}

/**
 * Busca e interpreta comentários de um arquivo CSV hospedado em uma URL.
 */
export async function buscarComentariosCSV(
  url: string
): Promise<ComentarioCsvDTO[]> {
  try {
    const response = await axios.get(url, { responseType: "text" });
    const linhas = parseCsv(response.data);
    const registros = csvRowsToRecords(linhas);

    const comentarios: ComentarioCsvDTO[] = [];
    for (const registro of registros) {
      const normalizado = normalizarComentario(registro);
      if (normalizado) {
        comentarios.push(normalizado);
      }
    }
    return comentarios;
  } catch (error) {
    console.error(`[csv-client] Erro ao baixar o arquivo CSV da URL ${url}:`, error);
    return [];
  }
}

export async function buscarResumoProdutosCSV(
  url: string
): Promise<ResumoProdutoCsvDTO[]> {
  try {
    const response = await axios.get(url, { responseType: "text" });
    const linhas = parseCsv(response.data);
    const registros = csvRowsToRecords(linhas);

    const resumos: ResumoProdutoCsvDTO[] = [];
    for (const registro of registros) {
      const normalizado = normalizarResumoProduto(registro);
      if (normalizado) {
        resumos.push(normalizado);
      }
    }
    return resumos;
  } catch (error) {
    console.error(
      `[csv-client] Erro ao baixar o arquivo de resumos da URL ${url}:`,
      error
    );
    return [];
  }
}

/**
 * Converte uma linha do CSV para o nosso formato de DTO padronizado.
 */
function normalizarComentario(entry: Record<string, string>): ComentarioCsvDTO | null {
  if (!entry) return null;

  // Mapeia as colunas do seu CSV
  const dispositivoIdExterno = entry.Produto;
  const content = entry.Comentario;
  const publishedAtStr = entry.Data;
  const rating = entry.Nota;
  
  // O comentário é obrigatório, o resto pode ser opcional
  if (!dispositivoIdExterno || !content || !publishedAtStr) {
    return null;
  }

  const publishedAt = parseDatePtBr(publishedAtStr);
  if (!publishedAt) {
    console.warn(`[csv-client] Data em formato inválido ignorada: "${publishedAtStr}"`);
    return null; // Descarta linhas com data inválida
  }

  const parsedRating = rating && rating.trim() !== "" ? parseInt(rating, 10) : undefined;
  
  // Gera um ID único e determinístico para o comentário
  const externalId = createHash('md5')
    .update(dispositivoIdExterno + content + publishedAt.toISOString())
    .digest('hex');

  return {
    dispositivoIdExterno: dispositivoIdExterno.trim(),
    externalId,
    content: content.trim().replace(/\s+/g, ' '), 
    publishedAt: publishedAt.toISOString(),
    author: "Anônimo", 
    rating: Number.isFinite(parsedRating) ? parsedRating : undefined,
  };
}

function normalizarResumoProduto(
  entry: Record<string, string>
): ResumoProdutoCsvDTO | null {
  const produto = entry["Produto"]?.trim();
  if (!produto) {
    return null;
  }

  return {
    produto,
    notaGeral: parseNumber(entry["Nota Geral"]),
    totalAvaliacoes: parseNumber(entry["Total de Avaliações"]),
    custoBeneficio: parseNumber(entry["Custo-benefício"]),
    qualidadeCamera: parseNumber(entry["Qualidade da câmera"]),
    duracaoBateria: parseNumber(entry["Duração da bateria"]),
    durabilidade: parseNumber(entry["Durabilidade"]),
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (insideQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (insideQuotes) {
    throw new Error("CSV malformado: aspas não foram fechadas corretamente.");
  }

  row.push(current);
  rows.push(row);

  return rows.filter((cols) => !(cols.length === 1 && cols[0].trim() === ""));
}

function csvRowsToRecords(rows: string[][]): Record<string, string>[] {
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => header?.trim() ?? "");
  const registros: Record<string, string>[] = [];

  for (const values of rows.slice(1)) {
    const registro: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      registro[header] = (values[index] ?? "").trim();
    });

    registros.push(registro);
  }

  return registros;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const sanitized = trimmed
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  if (!sanitized) {
    return null;
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}
