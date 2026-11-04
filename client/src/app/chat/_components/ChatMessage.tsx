import type {
  CriterioPesquisa,
  ConsoleSeletores,
  PhoneItem,
} from "@/types/phones";
import { Loader2 } from "lucide-react";
import { ChatMsg } from "../_types/chat.types";
import { MessageBubble } from "./Message-bubble";
import { MessageResults } from "./Message-results";
import { motion } from "framer-motion";

const CHIP_BASE_CLASS =
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide shadow-sm";

const DEFAULT_CHIP_CLASS = "bg-white/30 text-white border-white/40";

const CRITERIO_METADATA: Record<
  string,
  {
    label: string;
    options?: Record<
      string,
      {
        label: string;
        className: string;
      }
    >;
  }
> = {
  ram: {
    label: "Memória RAM",
    options: {
      "4": {
        label: "Uso básico",
        className: "bg-rose-100 text-rose-900 border-rose-200",
      },
      "6": {
        label: "Uso moderado",
        className: "bg-amber-100 text-amber-900 border-amber-200",
      },
      "8": {
        label: "Bom desempenho",
        className: "bg-sky-100 text-sky-900 border-sky-200",
      },
      "12": {
        label: "Alto desempenho",
        className: "bg-violet-100 text-violet-900 border-violet-200",
      },
    },
  },
  rom: {
    label: "Armazenamento",
    options: {
      "64": {
        label: "Espaço básico",
        className: "bg-teal-100 text-teal-900 border-teal-200",
      },
      "128": {
        label: "Espaço padrão",
        className: "bg-emerald-100 text-emerald-900 border-emerald-200",
      },
      "256": {
        label: "Espaço amplo",
        className: "bg-blue-100 text-blue-900 border-blue-200",
      },
      "512": {
        label: "Espaço máximo",
        className: "bg-indigo-100 text-indigo-900 border-indigo-200",
      },
    },
  },
  battery: {
    label: "Bateria",
    options: {
      "4000": {
        label: "Uso leve",
        className: "bg-lime-100 text-lime-900 border-lime-200",
      },
      "4500": {
        label: "Uso moderado",
        className: "bg-yellow-100 text-yellow-900 border-yellow-200",
      },
      "5000": {
        label: "Dia todo",
        className: "bg-orange-100 text-orange-900 border-orange-200",
      },
      "6000": {
        label: "Mais de um dia",
        className: "bg-amber-100 text-amber-900 border-amber-200",
      },
    },
  },
  main_camera: {
    label: "Câmera principal",
    options: {
      "50": {
        label: "Boa qualidade",
        className: "bg-pink-100 text-pink-900 border-pink-200",
      },
      "64": {
        label: "Equilibrada",
        className: "bg-sky-100 text-sky-900 border-sky-200",
      },
      "108": {
        label: "Alta resolução",
        className: "bg-purple-100 text-purple-900 border-purple-200",
      },
      "200": {
        label: "Profissional",
        className: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200",
      },
    },
  },
  benchmark: {
    label: "Benchmark",
    options: {
      "400000": {
        label: "Uso básico",
        className: "bg-orange-100 text-orange-900 border-orange-200",
      },
      "700000": {
        label: "Intermediário",
        className: "bg-sky-100 text-sky-900 border-sky-200",
      },
      "1000000": {
        label: "Avançado",
        className: "bg-emerald-100 text-emerald-900 border-emerald-200",
      },
      "1500000": {
        label: "Topo de linha",
        className: "bg-indigo-100 text-indigo-900 border-indigo-200",
      },
    },
  },
  // Mapeamento para o nome que vem da API (criterios)
  preco_intervalo: {
    label: "Faixa de preço",
    options: {
      "600-999": {
        label: "R$ 600 - R$ 999",
        className: "bg-orange-100 text-orange-900 border-orange-200",
      },
      "1000-1499": {
        label: "R$ 1.000 - R$ 1.499",
        className: "bg-amber-100 text-amber-900 border-amber-200",
      },
      "1500-1999": {
        label: "R$ 1.500 - R$ 1.999",
        className: "bg-lime-100 text-lime-900 border-lime-200",
      },
      "2000-2999": {
        label: "R$ 2.000 - R$ 2.999",
        className: "bg-emerald-100 text-emerald-900 border-emerald-200",
      },
      "3000-": {
        label: "A partir de R$ 3.000",
        className: "bg-indigo-100 text-indigo-900 border-indigo-200",
      },
    },
  },
  // Mapeamento para o nome que vem dos seletores (UI) - Mantido por segurança, mas não será iterado
  price_range: {
    label: "Faixa de preço",
    options: {
      "600-999": {
        label: "R$ 600 - R$ 999",
        className: "bg-orange-100 text-orange-900 border-orange-200",
      },
      "1000-1499": {
        label: "R$ 1.000 - R$ 1.499",
        className: "bg-amber-100 text-amber-900 border-amber-200",
      },
      "1500-1999": {
        label: "R$ 1.500 - R$ 1.999",
        className: "bg-lime-100 text-lime-900 border-lime-200",
      },
      "2000-2999": {
        label: "R$ 2.000 - R$ 2.999",
        className: "bg-emerald-100 text-emerald-900 border-emerald-200",
      },
      "3000-": {
        label: "A partir de R$ 3.000",
        className: "bg-indigo-100 text-indigo-900 border-indigo-200",
      },
    },
  },
  texto_livre: {
    label: "Descrição",
  },
};

function formatTipoLabel(tipo: string): string {
  if (CRITERIO_METADATA[tipo]) {
    return CRITERIO_METADATA[tipo].label;
  }
  return tipo
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function UserCriteriaContent({
  criterios,
  consoleInput,
}: Readonly<{
  criterios: CriterioPesquisa[];
  consoleInput?: string | null;
  seletores?: Partial<ConsoleSeletores> | null;
}>) {
  const normalizedConsoleInput = (consoleInput ?? "").trim();
  const freeTextValues = criterios
    .filter(
      (criterio) =>
        criterio.tipo === "texto_livre" && criterio.descricao.trim().length > 0
    )
    .map((criterio) => criterio.descricao.trim());

  const textBlocks = Array.from(
    new Set(
      [normalizedConsoleInput, ...freeTextValues].filter(
        (value) => value && value.length > 0
      )
    )
  );

  // Pegamos apenas os critérios estruturados
  const structuredCriteria = criterios.filter(
    (criterio) => criterio.tipo !== "texto_livre"
  );

  // --- CORREÇÃO 2: REMOVIDA ITERAÇÃO REDUNDANTE ---
  // Não processamos mais 'selectorEntries'.
  // Assumimos que tudo o que é relevante para visualização
  // já está na lista 'criterios' (convertido no envio).
  
  const chips: Array<{ key: string; text: string; className: string }> = [];
  const seen = new Set<string>();

  const addChip = (tipo: string, rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;
    const key = `${tipo}-${value.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    const metadata = CRITERIO_METADATA[tipo] ?? {
      label: formatTipoLabel(tipo),
    };
    const option = metadata.options?.[value];
    const chipText = option
      ? `${metadata.label}: ${option.label}`
      : `${metadata.label}: ${value}`;
    const className = option?.className ?? DEFAULT_CHIP_CLASS;

    chips.push({
      key,
      text: chipText,
      className: `${CHIP_BASE_CLASS} ${className}`,
    });
  };

  // Só iteramos sobre os critérios já normalizados
  structuredCriteria.forEach((criterio) =>
    addChip(criterio.tipo, criterio.descricao)
  );

  const showNothing =
    textBlocks.length === 0 &&
    chips.length === 0;
  if (showNothing) {
    return (
      <p className="text-sm font-semibold opacity-80">
        Nenhuma preferência informada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {textBlocks.map((text) => (
        <p key={text} className="text-sm leading-relaxed">
          {text}
        </p>
      ))}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip.key} className={chip.className}>
              {chip.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChatMessageListProps {
  messages: ChatMsg[];
  isLoadingHistory: boolean;
  error: string | null;
  onToggleFavorite: (phone: PhoneItem) => void;
  isTogglingFavorite?: boolean;
  pendingFavoriteIds: ReadonlySet<string>;
}

export function ChatMessageList({
  messages,
  isLoadingHistory,
  error,
  isTogglingFavorite,
  onToggleFavorite,
  pendingFavoriteIds,
}: Readonly<ChatMessageListProps>) {
  const isChatEmpty = messages.length === 0 && !isLoadingHistory;

  return (
    <div className="max-w-5xl w-full mx-auto px-1.5 sm:px-4 py-6 space-y-4">
      {isLoadingHistory && (
        <div className="flex justify-center my-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      )}

      {isChatEmpty && (
        <MessageBubble align="left" title="Moto Match AI">
          <p>
            Descreva em texto o celular que você procura e eu encontro os melhores modelos para você.
          </p>
        </MessageBubble>
      )}

      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <MessageBubble
              key={message.id}
              align="right"
              title="Seus critérios"
            >
              <UserCriteriaContent
                criterios={message.criterios}
                consoleInput={message.consoleInput}
                seletores={message.seletores}
              />
            </MessageBubble>
          );
        }

        switch (message.type) {
          case "loading":
            return (
              <MessageBubble
                key={message.id}
                align="left"
                title="Moto Match AI está pensando..."
              >
                <div className="flex justify-center py-8">
                  <motion.span
                    role="status"
                    aria-label="IA pensando"
                    className="inline-flex h-6 w-6 rounded-full bg-sky-500 shadow-[0_0_25px_rgba(14,165,233,0.75)]"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </MessageBubble>
            );
          case "cards":
            return (
              <MessageBubble
                key={message.id}
                align="left"
                contentClassName="mx-[-8px] sm:mx-[-16px]"
                title="Aqui estão minhas recomendações"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <MessageResults
                    items={message.items}
                    error={null}
                    isTogglingFavorite={isTogglingFavorite}
                    pendingFavoriteIds={pendingFavoriteIds}
                    onToggleFavorite={onToggleFavorite}
                  />
                </motion.div>
              </MessageBubble>
            );
          case "text":
            return (
              <MessageBubble
                key={message.id}
                align="left"
                title="Moto Match AI"
              >
                <p>{message.content}</p>
              </MessageBubble>
            );
          default:
            return null;
        }
      })}

      {error && (
        <MessageBubble align="left" title="Ocorreu um erro">
          <p className="text-sm text-destructive">{error}</p>
        </MessageBubble>
      )}
    </div>
  );
}