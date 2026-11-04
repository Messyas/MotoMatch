"use client";

import { memo, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, Smartphone } from "lucide-react";
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
};

const PhoneCardComponent = ({
  item,
  onToggleFavorite,
  disableFavorite = false,
  leftAction,
}: Props) => {
  const router = useRouter();
  const justificationItems = item.justificativas?.slice(0, 3) ?? [];

  const verDetalhesDispositivo = (id: string) => {
    if (!id || id === "undefined" || id === "null") {
      console.warn("ID inválido, não foi possível abrir detalhes:", id);
      return;
    }
    router.push(`/dispositivo/${id}`);
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
    <Card className="group w-full max-w-[19rem] md:max-w-[26.5rem] bg-[#ffffff] border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-transform duration-300 hover:scale-[1.02] hover:border-gray-300 py-0">
      <CardContent className="flex flex-1 flex-col p-0">
        <div className="flex flex-1 flex-col gap-3 p-4 pt-3 text-[#001428]">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold leading-tight line-clamp-2">
              {item.title}
            </h3>
            {formattedPrice && (
              <p className="text-xs font-semibold text-slate-600">
                {formattedPrice}
              </p>
            )}
            {typeof item.matchScore === "number" && (
              <p className="text-xs font-semibold text-emerald-600">
                {item.matchScore}% de compatibilidade
              </p>
            )}
            {justificationItems.length > 0 && (
              <div className="space-y-1 text-xs text-slate-600">
                {justificationItems.map((text, index) => (
                  <p key={`${item.id}-just-${index}`} className="flex gap-1">
                    <span aria-hidden="true" className="text-[#a8c8ff]">
                      •
                    </span>
                    <span className="flex-1">{text}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => verDetalhesDispositivo(item.id)}
          className="group/button relative aspect-[3/4] w-full overflow-hidden bg-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#001428]/30"
          aria-label={`Ver detalhes do dispositivo ${item.title}`}
        >
          {item.imageUrls[0] ? (
            <Image
              src={item.imageUrls[0]}
              alt={item.title}
              fill
              className="object-contain scale-90 transition-transform duration-500 group-hover:scale-100"
              sizes="(max-width: 768px) 100vw,
                    (max-width: 1200px) 50vw,
                    33vw"
              priority
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-gray-400">
              <Smartphone size={44} />
              <span className="text-xs font-medium">Imagem indisponível</span>
            </div>
          )}
        </button>
        <div className="flex flex-1 flex-col gap-3 p-4 pt-3 text-[#001428]">
          <div className="mt-auto w-full pt-2 relative flex justify-center">
            <Button
              onClick={() => verDetalhesDispositivo(item.id)}
              className="w-[60%] h-10 rounded-full text-sm font-semibold
                bg-transparent border-2 border-[#001428]/12 text-[#001428]
                transition-all duration-200
                hover:bg-gradient-to-r
                hover:from-orange-500
                hover:via-pink-500
                hover:to-blue-500
                hover:text-white
                hover:border-transparent
                bg-clip-padding
                active:scale-95"
            >
              Ver Especificações
            </Button>
            {leftAction ? (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[20%]">
                {leftAction}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => onToggleFavorite(item)}
              aria-label={ariaLabel}
              aria-pressed={item.isFavorite ? "true" : "false"}
              aria-busy={disableFavorite ? "true" : undefined}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[20%] inline-flex h-10 w-10 items-center justify-center rounded-full text-blue-500 transition-colors hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f3f1]"
            >
              <Heart
                size={28}
                fill={item.isFavorite ? "currentColor" : "none"}
                aria-hidden="true"
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

/**
 * Memo evita re-renderizações dos cards que não tiveram estado alterado,
 * preservando a fluidez das listas com muitos itens.
 */
export const PhoneCard = memo(PhoneCardComponent, (prev, next) => {
  if (prev.leftAction !== next.leftAction) return false;
  if (prev.disableFavorite !== next.disableFavorite) return false;
  if (prev.onToggleFavorite !== next.onToggleFavorite) return false;
  if (prev.item.id !== next.item.id) return false;
  if (prev.item.isFavorite !== next.item.isFavorite) return false;
  if (prev.item.favoriteId !== next.item.favoriteId) return false;
  if (prev.item.matchScore !== next.item.matchScore) return false;
  if (prev.item.price !== next.item.price) return false;
  const prevJust = prev.item.justificativas?.join("|") ?? "";
  const nextJust = next.item.justificativas?.join("|") ?? "";
  if (prevJust !== nextJust) return false;
  return true;
});

PhoneCard.displayName = "PhoneCard";
