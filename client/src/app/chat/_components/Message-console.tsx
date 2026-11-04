"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SendHorizonal, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CriterioPesquisa, ConsoleSeletores } from "@/types/phones";
import { useDevice } from "@/hooks/useDevice";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const filterMappings: Record<
  "price_range" | "ram" | "rom" | "battery" | "main_camera" | "benchmark",
  { value: string; label: string }[]
> = {
  price_range: [
    { value: "600-999", label: "R$ 600 - R$ 999" },
    { value: "1000-1499", label: "R$ 1.000 - R$ 1.499" },
    { value: "1500-1999", label: "R$ 1.500 - R$ 1.999" },
    { value: "2000-2999", label: "R$ 2.000 - R$ 2.999" },
    { value: "3000-", label: "A partir de R$ 3.000" },
  ],
  ram: [
    { value: "4", label: "Uso básico" },
    { value: "6", label: "Uso moderado" },
    { value: "8", label: "Bom desempenho" },
    { value: "12", label: "Alto desempenho" },
  ],
  rom: [
    { value: "64", label: "Espaço básico" },
    { value: "128", label: "Espaço padrão" },
    { value: "256", label: "Espaço amplo" },
    { value: "512", label: "Espaço máximo" },
  ],
  battery: [
    { value: "4000", label: "Uso leve" },
    { value: "4500", label: "Uso moderado" },
    { value: "5000", label: "Dia todo" },
    { value: "6000", label: "Mais de um dia" },
  ],
  main_camera: [
    { value: "50", label: "Boa qualidade" },
    { value: "64", label: "Equilibrada" },
    { value: "108", label: "Alta resolução" },
    { value: "200", label: "Profissional" },
  ],
  benchmark: [
    { value: "400000", label: "Uso básico" },
    { value: "700000", label: "Intermediário" },
    { value: "1000000", label: "Avançado" },
    { value: "1500000", label: "Topo de linha" },
  ],
};

const placeholderMap: Record<keyof typeof filterMappings, string> = {
  price_range: "Faixa de preço",
  ram: "RAM",
  rom: "Armazenamento",
  battery: "Bateria",
  main_camera: "Câmera",
  benchmark: "Benchmark",
};

const tooltips: Record<string, Record<string, string>> = {
  price_range: {
    "600-999": "Foco em modelos de entrada (até R$ 999).",
    "1000-1499": "Intermediários acessíveis (R$ 1.000 a R$ 1.499).",
    "1500-1999": "Intermediários avançados com bom equilíbrio.",
    "2000-2999": "Modelos premium de alto valor agregado.",
    "3000-": "Topo de linha sem limite superior definido.",
  },
  ram: {
    "4": "4 GB — ideal para uso básico de apps e mensagens.",
    "6": "6 GB — bom para multitarefa leve e uso diário fluido.",
    "8": "8 GB — roda a maioria dos apps e jogos com tranquilidade.",
    "12": "12 GB — excelente para multitarefa intensa e jogos pesados.",
  },
  rom: {
    "64": "64 GB — espaço suficiente para apps e fotos básicas.",
    "128": "128 GB — armazenamento equilibrado para fotos e vídeos.",
    "256": "256 GB — ótimo para vídeos, jogos e muitos apps.",
    "512":
      "512 GB — enorme capacidade para uso profissional e arquivos grandes.",
  },
  battery: {
    "4000": "4000 mAh — uso leve, dura cerca de um dia.",
    "4500": "4500 mAh — uso moderado, autonomia sólida.",
    "5000": "5000 mAh — ideal para um dia intenso de uso.",
    "6000": "6000 mAh — mais de um dia sem precisar recarregar.",
  },
  main_camera: {
    "50": "50 MP — boa para fotos nítidas no dia a dia.",
    "64": "64 MP — equilíbrio entre detalhes e desempenho em baixa luz.",
    "108": "108 MP — altíssima definição e zoom detalhado.",
    "200": "200 MP — nível profissional, máximo em detalhes e recorte.",
  },
  benchmark: {
    "400000": "Aprox. 400k — uso básico e apps essenciais.",
    "700000": "Aprox. 700k — bom para jogos casuais e multitarefa.",
    "1000000": "Aprox. 1M — jogos pesados e uso intenso.",
    "1500000": "Aprox. 1.5M — topo de linha, performance máxima.",
  },
};

const CLEAR_VALUE = "__clear__";

export function Console() {
  const { setCriterios, isHydrated } = useDevice();
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [textAreaValue, setTextAreaValue] = useState("");
  const MAX_CHARS = 300;
  const hydratedOnceRef = useRef(false);
  const [selectorValues, setSelectorValues] = useState<
    Record<keyof typeof filterMappings, string>
  >({
    price_range: "",
    ram: "",
    rom: "",
    battery: "",
    main_camera: "",
    benchmark: "",
  });
  const [openSelect, setOpenSelect] = useState<
    keyof typeof filterMappings | null
  >(null);
  const [hoveredOption, setHoveredOption] = useState<{
    tipo: keyof typeof filterMappings;
    value: string;
    rect: DOMRect;
  } | null>(null);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [containerState, setContainerState] = useState<
    "collapsed" | "expanded"
  >("collapsed");
  const [showStartHint, setShowStartHint] = useState(true);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isOpen = expanded;
  const filterKeys = Object.keys(
    filterMappings
  ) as (keyof typeof filterMappings)[];

  function handleSelectChange(
    tipo: keyof typeof filterMappings,
    valor: string
  ) {
    setOpenSelect(null);
    setHoveredOption(null);
    setSelectorValues((prev) => ({
      ...prev,
      [tipo]: valor === CLEAR_VALUE ? "" : valor,
    }));
  }

  useEffect(() => {
    // Apenas marca como hidratado, sem sobrescrever o estado local
    // para evitar que inputs "limpos" sejam repovoados
    if (isHydrated && !hydratedOnceRef.current) {
      hydratedOnceRef.current = true;
    }
  }, [isHydrated]);

  useEffect(() => {
    if (!isMobile) {
      setIsSpecsModalOpen(false);
    }
    if (isMobile) {
      setHoveredOption(null);
    }
  }, [isMobile]);

  useEffect(() => {
    setShowContent(false);
    if (isOpen) {
      setContainerState("expanded");
      setShowStartHint(false);
      const raf = requestAnimationFrame(() => {
        if (isOpen) {
          setShowContent(true);
        }
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setContainerState("collapsed");
      setShowStartHint(true);
      setShowContent(false);
      setIsSpecsModalOpen(false);
      setOpenSelect(null);
      setHoveredOption(null);
    }
  }, [isOpen]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    const textoLivre = textAreaValue.trim();

    const criteriosParaApi: CriterioPesquisa[] = [];

    (Object.keys(selectorValues) as (keyof typeof filterMappings)[]).forEach(
      (tipo) => {
        const valor = selectorValues[tipo];
        if (valor) {
          if (tipo === "price_range") {
            criteriosParaApi.push({
              tipo: "preco_intervalo",
              descricao: valor,
            });
          } else {
            criteriosParaApi.push({
              tipo,
              descricao: valor,
            });
          }
        }
      }
    );

    if (textoLivre) {
      criteriosParaApi.push({
        tipo: "texto_livre",
        descricao: textoLivre,
      });
    }

    if (criteriosParaApi.length === 0) {
      alert("Selecione filtros ou descreva o que você busca.");
      return;
    }

    const seletoresParaApi: ConsoleSeletores = {};
    (Object.keys(selectorValues) as (keyof typeof filterMappings)[]).forEach(
      (tipo) => {
        const valor = selectorValues[tipo];
        if (valor) {
          seletoresParaApi[tipo] = valor;
        }
      }
    );

    // Atualiza o contexto global e dispara a pesquisa
    setCriterios({
      criterios: criteriosParaApi,
      consoleInput: textoLivre || undefined,
      seletores: seletoresParaApi,
    });

    // --- LIMPEZA PÓS-ENVIO ---
    // Limpa o campo de texto
    setTextAreaValue("");
    // Reseta todos os seletores para o valor vazio
    setSelectorValues({
      price_range: "",
      ram: "",
      rom: "",
      battery: "",
      main_camera: "",
      benchmark: "",
    });
  }

  const renderSelect = (
    tipo: keyof typeof filterMappings,
    variant: "inline" | "modal" = "inline"
  ) => {
    const triggerClasses =
      variant === "inline"
        ? "w-full px-2"
        : "w-full px-3 h-12 rounded-xl text-sm";
    const wrapperClasses =
      variant === "inline" ? "relative flex-1 min-w-[120px]" : "w-full";

    return (
      <div key={`${variant}-${tipo}`} className={wrapperClasses}>
        <Select
          value={selectorValues[tipo] || undefined}
          onValueChange={(valor) => handleSelectChange(tipo, valor)}
          onOpenChange={(isOpenDropdown) => {
            setOpenSelect(isOpenDropdown ? tipo : null);
            if (!isOpenDropdown) setHoveredOption(null);
          }}
        >
          <SelectTrigger className={triggerClasses}>
            <SelectValue placeholder={placeholderMap[tipo]} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLEAR_VALUE}>
              Limpar {placeholderMap[tipo].toLowerCase()}
            </SelectItem>
            {filterMappings[tipo].map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                onMouseEnter={
                  !isMobile
                    ? (e) => {
                        const rect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();
                        setHoveredOption({
                          tipo,
                          value: option.value,
                          rect,
                        });
                      }
                    : undefined
                }
                onMouseLeave={
                  !isMobile ? () => setHoveredOption(null) : undefined
                }
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isOpen || isSpecsModalOpen) {
        return;
      }
      if (!formRef.current?.contains(event.target as Node) && !openSelect) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, openSelect, isSpecsModalOpen]);

  return (
    <motion.form
      ref={formRef}
      layout
      onSubmit={handleSend}
      onClick={() => {
        if (!isOpen) setExpanded(true);
      }}
      className={`relative w-full flex items-center gap-2 bg-white rounded-2xl border p-2 shadow-sm overflow-hidden transition-shadow ${
        isOpen ? "cursor-text" : "cursor-pointer"
      }`}
      style={{ minHeight: "56px", originX: 0.5, originY: 0.5 }}
      transition={{ layout: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } }}
      initial={false}
      animate={containerState}
      onAnimationComplete={() => {
        if (containerState === "expanded" && isOpen) {
          setShowContent(true);
        }
        if (containerState === "collapsed" && !isOpen) {
          setShowStartHint(true);
        }
      }}
      variants={{
        collapsed: {
          width: "min(360px, 100%)",
          scale: 0.99,
          opacity: 0.96,
          borderRadius: 9999,
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 10,
          paddingBottom: 10,
          boxShadow: "0 10px 30px rgba(0,0,0,0.07)",
          transition: {
            type: "spring",
            stiffness: 210,
            damping: 30,
            mass: 0.9,
            borderRadius: {
              type: "tween",
              duration: 0.22,
              ease: [0.4, 0, 0.2, 1],
            },
          },
        },
        expanded: {
          width: "100%",
          scale: 1,
          opacity: 1,
          borderRadius: 16,
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 12,
          paddingBottom: 12,
          boxShadow: "0 16px 44px rgba(0,0,0,0.10)",
          transition: {
            type: "spring",
            stiffness: 210,
            damping: 26,
            mass: 0.9,
          },
        },
      }}
    >
      {!isOpen && showStartHint && (
        <div
          className="absolute inset-0 flex items-center justify-center text-gray-500 font-semibold z-10"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          Clique aqui para começar
        </div>
      )}

      <AnimatePresence
        initial={false}
        onExitComplete={() => {
          if (!isOpen) {
            setContainerState("collapsed");
          }
        }}
      >
        {isOpen && showContent && (
          <motion.div
            key="filters"
            className="flex flex-col gap-3 relative z-10 flex-1"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            <div className="w-full relative">
              <Textarea
                placeholder="Descreva seu celular ideal..."
                className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-[40px] py-2 pr-14"
                value={textAreaValue}
                onChange={(e) => setTextAreaValue(e.target.value)}
                maxLength={MAX_CHARS}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {textAreaValue.length}/{MAX_CHARS}
              </div>
            </div>

            {isMobile ? (
              <div className="flex w-full items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSpecsModalOpen(true)}
                  className="flex h-11 w-24 flex-shrink-0 items-center justify-center rounded-full border-dashed border-slate-300 text-xs font-semibold uppercase tracking-wide"
                >
                  Filtros
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="ml-auto h-11 w-11 rounded-full text-white font-semibold
             bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500
             bg-[length:200%_200%] animate-gradient-move
             transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  <SendHorizonal className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl">
                <div className="flex flex-1 flex-wrap gap-2 pr-2">
                  {filterKeys.map((tipo) => renderSelect(tipo, "inline"))}
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full text-white font-semibold
             bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500
             bg-[length:200%_200%] animate-gradient-move
             transition-transform duration-200 hover:scale-105 active:scale-95 "
                >
                  <SendHorizonal className="h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isMobile && hoveredOption && openSelect === hoveredOption.tipo && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: hoveredOption.rect.top + hoveredOption.rect.height / 2,
              left: hoveredOption.rect.right + 12,
              transform: "translateY(-50%)",
              width: 240,
              zIndex: 9999,
            }}
            className="flex items-start gap-2 rounded-md bg-slate-950/90 px-3 py-2 text-slate-100 shadow-lg backdrop-blur-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="text-xs leading-snug">
              {tooltips[hoveredOption.tipo]?.[hoveredOption.value] ??
                "Seleção aplicada."}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {isMobile && (
        <Dialog open={isSpecsModalOpen} onOpenChange={setIsSpecsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Filtros (Specs)</DialogTitle>
              <DialogDescription>
                Refine sua busca selecionando os critérios desejados.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              {filterKeys.map((tipo) => renderSelect(tipo, "modal"))}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setIsSpecsModalOpen(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </motion.form>
  );
}
