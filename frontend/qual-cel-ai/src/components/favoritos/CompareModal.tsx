"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle, // Importante para acessibilidade
  DialogDescription, // Importante para acessibilidade
} from "@/components/ui/dialog"; 
import Image from "next/image";
import { 
  Trophy, 
  Battery, 
  Cpu, 
  HardDrive, 
  Camera, 
  DollarSign, 
  Smartphone,
  X
} from "lucide-react";
import type { PhoneItem, PhoneSpecs } from "@/types/phones";


interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceA: PhoneItem; 
  deviceB: PhoneItem; 
}

// --- UTILITÁRIOS ---
function parseSpecValue(spec?: string): number {
  if (!spec) return 0;
  return parseFloat(spec.replace(/[^0-9.]/g, '')) || 0;
}

function formatCurrency(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return "N/A";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num);
}

export function CompareModal({
  isOpen,
  onClose,
  deviceA,
  deviceB, 
}: CompareModalProps) {
  
  if (!deviceA || !deviceB) return null;

  const specsConfig = [
    { key: "ram", label: "RAM", icon: Cpu, unit: "GB" },
    { key: "storage", label: "Armaz.", icon: HardDrive, unit: "GB" },
    { key: "battery", label: "Bateria", icon: Battery, unit: "mAh" },
    { key: "camera", label: "Câmera", icon: Camera, unit: "MP" },
  ];

  const priceA = parseSpecValue(deviceA.specs.preco);
  const priceB = parseSpecValue(deviceB.specs.preco);
  const diffPrice = Math.abs(priceA - priceB);

  const getWinnerClass = (valA: number, valB: number) => {
    if (valA === valB) return "text-slate-600";
    return valA > valB 
      ? "font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent" 
      : "text-slate-400";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* AQUI ESTÁ A CORREÇÃO:
         1. sm:max-w-3xl: Sobrescreve o max-w-lg padrão.
         2. p-0: Remove o padding de 24px (p-6) padrão.
         3. gap-0: Remove o espaçamento padrão.
         4. overflow-hidden: Garante que o header não saia das bordas arredondadas.
      */}
      <DialogContent className="sm:max-w-3xl w-[95vw] p-0 gap-0 overflow-hidden border-0 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Títulos ocultos para acessibilidade (obrigatório no Radix UI) */}
        <div className="sr-only">
            <DialogTitle>Comparação: {deviceA.title} vs {deviceB.title}</DialogTitle>
            <DialogDescription>Detalhes técnicos e preços lado a lado.</DialogDescription>
        </div>

        {/* --- HEADER FIXO --- */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white z-20 shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-purple-50">
                    <Smartphone className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">Comparação</span>
            </div>
            <button 
                onClick={onClose} 
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X className="h-5 w-5" />
            </button>
        </div>

        {/* --- CONTEÚDO COM SCROLL --- */}
        <div className="overflow-y-auto p-4 sm:p-6 pb-8 scrollbar-thin scrollbar-thumb-slate-200 bg-white h-full">
          
          {/* HEADER VISUAL (Imagens + VS) */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-end mb-6">
            
            {/* Device A */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative w-full aspect-[4/5] max-w-[120px]">
                <Image 
                  src={deviceA.imageUrls[0]} 
                  alt={deviceA.title} 
                  fill 
                  className="object-contain drop-shadow-lg"
                  sizes="(max-width: 640px) 100px, 150px"
                />
              </div>
              <h3 className="text-xs sm:text-lg font-bold text-slate-900 leading-tight">
                {deviceA.title}
              </h3>
            </div>

            {/* VS Badge */}
            <div className="flex flex-col items-center justify-center pb-6 z-10 w-8 sm:w-16">
              <span className="text-xl sm:text-3xl font-black text-slate-200 italic">VS</span>
            </div>

            {/* Device B */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative w-full aspect-[4/5] max-w-[120px]">
                <Image 
                  src={deviceB.imageUrls[0]} 
                  alt={deviceB.title} 
                  fill 
                  className="object-contain drop-shadow-lg"
                  sizes="(max-width: 640px) 100px, 150px"
                />
              </div>
              <h3 className="text-xs sm:text-lg font-bold text-slate-900 leading-tight">
                {deviceB.title}
              </h3>
            </div>
          </div>

          {/* TABELA DE SPECS */}
          <div className="flex flex-col gap-3">
            {specsConfig.map((spec) => {
              const valA = parseSpecValue(deviceA.specs[spec.key as keyof PhoneSpecs]);
              const valB = parseSpecValue(deviceB.specs[spec.key as keyof PhoneSpecs]);
              
              return (
                <div key={spec.key} className="grid grid-cols-[1fr_auto_1fr] items-center py-2 border-b border-slate-50 last:border-0">
                  <div className={`text-center pr-2 text-xs sm:text-base ${getWinnerClass(valA, valB)}`}>
                    {valA}<span className="text-[10px] sm:text-xs ml-0.5 opacity-70">{spec.unit}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center w-12 sm:w-20">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-0.5">
                        <spec.icon className="h-4 w-4" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight text-center leading-none">
                      {spec.label}
                    </span>
                  </div>

                  <div className={`text-center pl-2 text-xs sm:text-base ${getWinnerClass(valB, valA)}`}>
                    {valB}<span className="text-[10px] sm:text-xs ml-0.5 opacity-70">{spec.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CARD DE PREÇO */}
          <div className="mt-6 rounded-xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 p-4 shadow-sm">
             <div className="flex items-center justify-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Comparativo de Preço</span>
             </div>

             <div className="grid grid-cols-2 gap-4 items-center relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -ml-px"></div>

                <div className="text-center">
                    <div className={`text-sm sm:text-xl ${priceA < priceB ? "font-bold text-green-600" : "text-slate-400"}`}>
                        {formatCurrency(priceA)}
                    </div>
                    {priceA < priceB && (
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold">
                           <Trophy className="h-3 w-3" /> Campeão
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <div className={`text-sm sm:text-xl ${priceB < priceA ? "font-bold text-green-600" : "text-slate-400"}`}>
                        {formatCurrency(priceB)}
                    </div>
                    {priceB < priceA && (
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold">
                           <Trophy className="h-3 w-3" /> Campeão
                        </div>
                    )}
                </div>
             </div>
             
             {diffPrice > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500">
                    Economia de <span className="font-bold text-green-600">{formatCurrency(diffPrice)}</span> escolhendo o {priceA < priceB ? deviceA.title : deviceB.title}.
                  </p>
                </div>
             )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}