export function buildCriteriaExtractionPrompt(userMessage: string): string {
  return `You are a technical criteria extractor for an intelligent smartphone recommendation engine.
The user message is written in Brazilian Portuguese (PT-BR).

Extract explicit and implicit constraints and priority weights from the user message into a strict JSON object.

Allowed aspects:
- "battery": user wants long battery life, endurance, large capacity.
- "camera": user wants great photos, night mode, selfies, zoom.
- "performance": user wants gaming, speed, smooth multitasking, fast processor.
- "screen": user wants large display, OLED/AMOLED, high refresh rate (120Hz).
- "storage": user wants lots of storage (128GB, 256GB, 512GB).
- "valueForMoney": user wants best bang for buck, cheap, cost-benefit.

Allowed hard constraint kinds:
- maxPrice: integer value in cents (e.g. R$ 1.500 -> 150000)
- minPrice: integer value in cents
- requires5g: boolean true if 5G is asked
- minRamGb: integer RAM in GB
- minStorageGb: integer storage in GB
- brand: brand name (Motorola, Samsung, Xiaomi, Apple, etc.)

OUTPUT FORMAT - Output strictly a raw JSON object with NO markdown formatting, NO backticks, and NO extra text:
{
  "constraints": [
    { "kind": "maxPrice", "value": 150000 },
    { "kind": "requires5g" }
  ],
  "prioritizedAspects": [
    { "aspect": "battery", "weight": 0.4 },
    { "aspect": "camera", "weight": 0.3 }
  ],
  "rawKeywords": ["bateria", "5g", "barato"]
}

User Message:
"""${userMessage}"""`;
}
