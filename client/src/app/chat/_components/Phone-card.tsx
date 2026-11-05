"use client";

import { memo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Heart,
  Smartphone,
  ThumbsUp,
  ThumbsDown,
  BatteryCharging,
  BadgeDollarSign,
  Copy,
  Quote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PhoneItem } from "@/types/phones";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const parsePriceFromSpec = (value?: string): number | null => {
  if (!value) return null;
  const normalized = value
    .trim()
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

type Props = {
  item: PhoneItem;
  onToggleFavorite: (phone: PhoneItem) => void;
  disableFavorite?: boolean;
  leftAction?: ReactNode;
  onCritique?: (critique: { type: "more_battery" | "cheaper" | "similar"; deviceId: string }) => void;
};

const PhoneCardComponent = ({
  item,
  onToggleFavorite,
  onCritique,
}: Props) => {
  const router = useRouter();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const justificationItems = item.justificativas?.slice(0, 3) ?? [];

  const verDetalhesDispositivo = (id: string) => {
    if (!id || id === "undefined" || id === "null") {
      return;
    }
    router.push(`/dispositivo/${id}`);
  };

  const handleFeedback = async (kind: "up" | "down") => {
    if (feedback) return;
    setFeedback(kind);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      await fetch(`${apiUrl}/v1/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: item.id,
          kind,
        }),
      });
    } catch {
      // ignore
    }
  };

  const ariaLabel = item.isFavorite
    ? "Remover dos favoritos"
    : "Adicionar aos favoritos";
  const resolvedPrice =
    typeof item.price === "number" && Number.isFinite(item.price)
      ? item.price
      : parsePriceFromSpec(item.specs?.preco);
  const formattedPrice =
    resolvedPrice !== null ? currencyFormatter.format(resolvedPrice) : null;

  return (
    <Card className="group w-full max-w-[19rem] md:max-w-[26.5rem] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md hover:border-slate-300 py-0">
      <CardContent className="flex flex-1 flex-col p-0">
        <div className="flex flex-1 flex-col gap-2 p-4 pt-3 text-foreground">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                {item.title}
              </h3>
              {typeof item.matchScore === "number" && (
                <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  {item.matchScore}% match
                </span>
              )}
            </div>

            {formattedPrice && (
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {formattedPrice}
              </p>
            )}

            {/* Justificativas & Evidências */}
            {justificationItems.length > 0 && (
              <div className="space-y-1 text-xs text-muted-foreground mt-1">
                {justificationItems.map((text, index) => (
                  <p key={`${item.id}-just-${index}`} className="flex items-start gap-1">
                    <span aria-hidden="true" className="text-blue-500 font-bold shrink-0">
                      •
                    </span>
                    <span className="flex-1">{text}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Citação real de evidência */}
            {item.evidenceItems && item.evidenceItems.length > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                <Quote className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                <span className="italic">{item.evidenceItems[0]?.quote}</span>
              </div>
            )}
          </div>
        </div>

        {/* Imagem do Aparelho */}
        <button
          type="button"
          onClick={() => verDetalhesDispositivo(item.id)}
          className="group/button relative aspect-[3/4] w-full overflow-hidden bg-white dark:bg-slate-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={`Ver detalhes do dispositivo ${item.title}`}
        >
          {item.imageUrls[0] ? (
            <Image
              src={item.imageUrls[0]}
              alt={item.title}
              fill
              className="object-contain scale-90 transition-transform duration-500 group-hover:scale-95"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-gray-400">
              <Smartphone size={44} />
              <span className="text-xs font-medium">Imagem indisponível</span>
            </div>
          )}
        </button>

        {/* Botões de Crítica Rápida (Conversational Critiquing) */}
        <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-800/30 border-t border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px]">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground mr-1">
            Ajustar:
          </span>
          <button
            onClick={() => onCritique?.({ type: "more_battery", deviceId: item.id })}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 border text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            <BatteryCharging className="h-3 w-3 text-emerald-500" />
            <span>+ Bateria</span>
          </button>
          <button
            onClick={() => onCritique?.({ type: "cheaper", deviceId: item.id })}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 border text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            <BadgeDollarSign className="h-3 w-3 text-amber-500" />
            <span>+ Barato</span>
          </button>
          <button
            onClick={() => onCritique?.({ type: "similar", deviceId: item.id })}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 border text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            <Copy className="h-3 w-3 text-blue-500" />
            <span>Parecido</span>
          </button>
        </div>

        {/* Ações inferiores e Feedback 👍/👎 */}
        <div className="flex flex-1 flex-col gap-3 p-4 pt-3 text-foreground">
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleFeedback("up")}
                disabled={feedback !== null}
                className={`p-1.5 rounded-full transition-colors ${
                  feedback === "up"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title="Gostei da recomendação"
              >
                <ThumbsUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback("down")}
                disabled={feedback !== null}
                className={`p-1.5 rounded-full transition-colors ${
                  feedback === "down"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                    : "text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title="Não gostei"
              >
                <ThumbsDown size={16} />
              </button>
            </div>

            <Button
              onClick={() => verDetalhesDispositivo(item.id)}
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-semibold px-4"
            >
              Ver Detalhes
            </Button>

            <button
              type="button"
              onClick={() => onToggleFavorite(item)}
              aria-label={ariaLabel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-blue-500 transition-colors hover:text-blue-600"
            >
              <Heart
                size={22}
                fill={item.isFavorite ? "currentColor" : "none"}
                className="transition-colors"
              />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

PhoneCardComponent.displayName = "PhoneCardComponent";

export const PhoneCard = memo(PhoneCardComponent, (prev, next) => {
  if (prev.leftAction !== next.leftAction) return false;
  if (prev.disableFavorite !== next.disableFavorite) return false;
  if (prev.onToggleFavorite !== next.onToggleFavorite) return false;
  if (prev.item.id !== next.item.id) return false;
  if (prev.item.isFavorite !== next.item.isFavorite) return false;
  if (prev.item.matchScore !== next.item.matchScore) return false;
  if (prev.item.price !== next.item.price) return false;
  return true;
});

PhoneCard.displayName = "PhoneCard";
