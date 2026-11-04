import type { PhoneSpecs } from "@/types/phones";

export const specOrder: (keyof PhoneSpecs)[] = [
  "camera",
  "secondary_camera",
  "tertiary_camera",
  "front_camera",
  "ram",
  "storage",
  "battery",
  "display",
  "refreshRate",
  "processor",
  "benchmark",
];

const specFormatters: Partial<
  Record<keyof PhoneSpecs, { label: string; format: (value: string) => string }>
> = {
  battery: { label: "Bateria", format: (value) => `${value} mAh` },
  ram: { label: "Memória RAM", format: (value) => `${value} GB` },
  storage: { label: "Armazenamento interno", format: (value) => `${value} GB` },
  camera: { label: "Câmera Principal", format: (value) => `${value} MP` },
  front_camera: { label: "Câmera Frontal", format: (value) => `${value} MP` },
  secondary_camera: {
    label: "Câmera Secundária",
    format: (value) => `${value} MP`,
  },
  tertiary_camera: {
    label: "Câmera Terciária",
    format: (value) => `${value} MP`,
  },
  display: { label: "Tela", format: (value) => `${value}"` },
  processor: { label: "Processador", format: (value) => String(value) },
  benchmark: {
    label: "Pontuação no Antutu (Benchmark)",
    format: (value) => String(value),
  },
  refreshRate: {
    label: "Taxa de Atualização",
    format: (value) => `${value} Hz`,
  },
};

// Esta função recebe uma chave e um valor e retorna o rótulo e o valor formatados.
export function formatSpec(key: string, value: string | number) {
  // Verifica se existe formatador para a chave
  if (key in specFormatters && specFormatters[key as keyof PhoneSpecs]) {
    const formatter = specFormatters[key as keyof PhoneSpecs]!;
    return {
      label: formatter.label,
      formattedValue: formatter.format(String(value)),
    };
  }

  return {
    label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    formattedValue: String(value),
  };
}
