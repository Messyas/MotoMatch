import type { Aspect, HardConstraint } from "../../recommender";
import type { CriteriaExtractor, ExtractedCriteria } from "./criteria-extractor";

export class RuleBasedCriteriaExtractor implements CriteriaExtractor {
  async extract(message: string): Promise<ExtractedCriteria> {
    const normalized = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const constraints: HardConstraint[] = [];
    const prioritizedAspects: { aspect: Aspect; weight: number }[] = [];
    const rawKeywords: string[] = [];

    // 1. Max price (e.g. "ate 1500", "ate R$ 2.000", "no maximo 1800 reais")
    const maxPriceMatch = /(?:ate|no maximo|em torno de|menos de)\s*(?:r\$)?\s*(\d[\d.]*)/i.exec(
      normalized,
    );
    if (maxPriceMatch && maxPriceMatch[1]) {
      const numStr = maxPriceMatch[1].replace(/\./g, "");
      const val = parseInt(numStr, 10);
      if (!isNaN(val) && val >= 200 && val <= 30000) {
        constraints.push({ kind: "maxPrice", value: val * 100 });
        rawKeywords.push(`preco_max_${val}`);
      }
    }

    // 2. 5G
    if (/\b5g\b/.test(normalized)) {
      constraints.push({ kind: "requires5g" });
      rawKeywords.push("5g");
    }

    // 3. RAM (e.g. "8gb de ram", "6 gb ram")
    const ramMatch = /(\d+)\s*(?:gb|gigas?)\s*(?:de\s*)?ram\b/i.exec(normalized);
    if (ramMatch && ramMatch[1]) {
      const ram = parseInt(ramMatch[1], 10);
      if (!isNaN(ram) && ram >= 2 && ram <= 32) {
        constraints.push({ kind: "minRamGb", value: ram });
        rawKeywords.push(`ram_${ram}gb`);
      }
    }

    // 4. Storage (e.g. "128gb de espaco", "256gb de memoria")
    const storageMatch = /(\d+)\s*(?:gb|gigas?)\s*(?:de\s*)?(?:armazenamento|memoria|espaco|rom)\b/i.exec(
      normalized,
    );
    if (storageMatch && storageMatch[1]) {
      const storage = parseInt(storageMatch[1], 10);
      if (!isNaN(storage) && storage >= 32 && storage <= 1024) {
        constraints.push({ kind: "minStorageGb", value: storage });
        rawKeywords.push(`storage_${storage}gb`);
      }
    }

    // 5. Brand
    const brands = ["motorola", "samsung", "xiaomi", "apple", "realme", "poco", "infinix"];
    for (const brand of brands) {
      if (new RegExp(`\\b${brand}\\b`, "i").test(normalized)) {
        const capitalized = brand.charAt(0).toUpperCase() + brand.slice(1);
        constraints.push({ kind: "brand", value: capitalized });
        rawKeywords.push(`marca_${brand}`);
        break;
      }
    }

    // 6. Aspect priorities
    if (/\b(bateria|dura muito|autonomia|dura o dia todo)\b/.test(normalized)) {
      prioritizedAspects.push({ aspect: "battery", weight: 0.35 });
      rawKeywords.push("bateria");
    }

    if (/\b(camera|foto|fotos|fotografia|selfie|filmagem)\b/.test(normalized)) {
      prioritizedAspects.push({ aspect: "camera", weight: 0.35 });
      rawKeywords.push("camera");
    }

    if (/\b(jogo|jogos|desempenho|rapido|potente|processador|velocidade)\b/.test(normalized)) {
      prioritizedAspects.push({ aspect: "performance", weight: 0.35 });
      rawKeywords.push("desempenho");
    }

    if (/\b(tela grande|tela oled|tela amoled|taxa de atualizacao|120hz)\b/.test(normalized)) {
      prioritizedAspects.push({ aspect: "screen", weight: 0.3 });
      rawKeywords.push("tela");
    }

    if (/\b(custo beneficio|bom e barato|barato e bom|economico)\b/.test(normalized)) {
      prioritizedAspects.push({ aspect: "valueForMoney", weight: 0.35 });
      rawKeywords.push("custo_beneficio");
    }

    return {
      constraints,
      prioritizedAspects,
      rawKeywords,
    };
  }
}
