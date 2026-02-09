/**
 * @component QualCelResults
 * @description Componente responsável por renderizar a seção de resultados da busca de celulares. Ele gerencia a exibição condicional com base no estado da aplicação (carregando, erro, sucesso ou sem resultados).
 * @param {object} props - As propriedades do componente.
 * @param {boolean} [props.loading] - Se `true`, exibe os skeletons de carregamento (`PhoneCardSkeleton`).
 * @param {PhoneItem[] | null} [props.items] - Array com os celulares encontrados para renderizar os cards (`PhoneCard`).
 * @param {string | null} [props.error] - Se presente, exibe uma mensagem de erro.
 * @returns {JSX.Element} A UI correspondente ao estado atual: uma grade de skeletons, uma mensagem de erro, uma mensagem de "nada encontrado" ou a grade de resultados.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PhoneCard } from "./Phone-card";
import { PhoneCardSkeleton } from "./Phone-card-skeleton";
import type { PhoneItem } from "@/types/phones";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Props = {
  loading?: boolean;
  items?: PhoneItem[] | null;
  error?: string | null;
  onToggleFavorite: (phone: PhoneItem) => void;
  isTogglingFavorite?: boolean;
  pendingFavoriteIds: ReadonlySet<string>;
};

type ResultListProps = {
  items: PhoneItem[];
  onToggleFavorite: (phone: PhoneItem) => void;
  isTogglingFavorite?: boolean;
  pendingFavoriteIds: ReadonlySet<string>;
};

function getDisableFavoriteState(
  pendingFavoriteIds: ReadonlySet<string>,
  isTogglingFavorite: boolean | undefined,
  id: string
) {
  return (
    pendingFavoriteIds.has(id) ||
    (pendingFavoriteIds.size === 0 && Boolean(isTogglingFavorite))
  );
}

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.08,
    },
  },
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function ResultsGrid({
  items,
  onToggleFavorite,
  isTogglingFavorite,
  pendingFavoriteIds,
}: ResultListProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
      variants={gridContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((it) => (
        <motion.div key={it.id} variants={gridItemVariants}>
          <PhoneCard
            item={it}
            onToggleFavorite={onToggleFavorite}
            disableFavorite={getDisableFavoriteState(
              pendingFavoriteIds,
              isTogglingFavorite,
              it.id
            )}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

const carouselItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.12 },
  }),
};

function PhoneCarousel({
  items,
  onToggleFavorite,
  isTogglingFavorite,
  pendingFavoriteIds,
}: ResultListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const itemsKey = useMemo(
    () => items.map((item) => item.id).join("|"),
    [items]
  );

  const computeStepWidth = (container: HTMLDivElement) => {
    const firstCard = container.firstElementChild as HTMLElement | null;
    if (!firstCard) {
      return container.clientWidth;
    }
    const computedStyle = window.getComputedStyle(container);
    const gap = Number.parseFloat(computedStyle.gap || "0") || 0;
    return firstCard.clientWidth + gap;
  };

  useEffect(() => {
    setActiveIndex(0);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: 0, behavior: "auto" });
    });
  }, [itemsKey]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const step = computeStepWidth(container);
      if (!step) return;
      const nextIndex = Math.round(container.scrollLeft / step);
      setActiveIndex((prev) => {
        const clamped = Math.max(
          0,
          Math.min(items.length - 1, nextIndex)
        );
        return clamped === prev ? prev : clamped;
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [items.length]);

  const scrollToIndex = (targetIndex: number) => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const step = computeStepWidth(container);
    container.scrollTo({
      left: targetIndex * step,
      behavior: "smooth",
    });
  };

  const handlePrev = () => {
    const next = Math.max(0, activeIndex - 1);
    scrollToIndex(next);
  };

  const handleNext = () => {
    const next = Math.min(items.length - 1, activeIndex + 1);
    scrollToIndex(next);
  };

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < items.length - 1;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-pl-2 pr-4 pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it, index) => (
          <motion.div
            key={it.id}
            className="flex-[0_0_85%] snap-center"
            custom={index}
            variants={carouselItemVariants}
            initial="hidden"
            animate="visible"
          >
            <PhoneCard
              item={it}
              onToggleFavorite={onToggleFavorite}
              disableFavorite={getDisableFavoriteState(
                pendingFavoriteIds,
                isTogglingFavorite,
                it.id
              )}
            />
          </motion.div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <CarouselControl
            direction="left"
            disabled={!canPrev}
            onClick={handlePrev}
          />
          <CarouselControl
            direction="right"
            disabled={!canNext}
            onClick={handleNext}
          />
        </>
      )}

      {items.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={`Ir para recomendação ${index + 1}`}
              className={cn(
                "h-2.5 rounded-full transition-all",
                activeIndex === index
                  ? "w-6 bg-slate-900"
                  : "w-2 bg-slate-300"
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CarouselControl({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Anterior" : "Próximo"}
      className={cn(
        "absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition disabled:opacity-40 disabled:shadow-none",
        direction === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"
      )}
    >
      <Icon className="h-5 w-5 text-slate-700" />
    </button>
  );
}

export function MessageResults({
  loading,
  items,
  error,
  onToggleFavorite,
  isTogglingFavorite,
  pendingFavoriteIds,
}: Props) {
  
  const shouldUseCarousel = useMediaQuery("(max-width: 768px)");

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <PhoneCardSkeleton />
        <PhoneCardSkeleton />
        <PhoneCardSkeleton />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!items || items.length === 0) {
    return (
      <p className="text-sm">
        Nada foi encontrado para estes critérios. Tente selecionar menos
        filtros.
      </p>
    );
  }



  if (shouldUseCarousel) {
    return (
      <PhoneCarousel
        items={items}
        onToggleFavorite={onToggleFavorite}
        isTogglingFavorite={isTogglingFavorite}
        pendingFavoriteIds={pendingFavoriteIds}
      />
    );
  }

  return (
    <ResultsGrid
      items={items}
      onToggleFavorite={onToggleFavorite}
      isTogglingFavorite={isTogglingFavorite}
      pendingFavoriteIds={pendingFavoriteIds}
    />
  );
}
