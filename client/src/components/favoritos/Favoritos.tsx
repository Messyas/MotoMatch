"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { 
  Loader2, 
  Sparkles, 
  Check, 
  Plus, 
  X, 
  ArrowRightLeft, 
  Smartphone,
  Trash2,
  Cpu
} from "lucide-react";
import type { FavoriteItem } from "@/types/favoritos";
import type { PhoneItem } from "@/types/phones";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PhoneCard } from "@/app/chat/_components/Phone-card";
import { useFavoritePhones } from "@/app/chat/_hooks/useFavoritePhones";
import { Button } from "@/components/ui/button";

import { CompareModal } from "./CompareModal";

export default function FavoritosContent() {
  const { favoritos, isLoading, isError, removerFavorito, isMutating } =
    useFavoritePhones();

  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteItem | null>(
    null
  );

  // --- LÓGICA DE COMPARAÇÃO ---
  const [compareList, setCompareList] = useState<PhoneItem[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const handleSelectToCompare = (phone: PhoneItem) => {
    setCompareList((currentList) => {
      if (currentList.some((item) => item.id === phone.id)) {
        return currentList.filter((item) => item.id !== phone.id);
      }
      if (currentList.length >= 2) {
        return currentList;
      }
      return [...currentList, phone];
    });
  };

  const clearComparison = () => setCompareList([]);
  // ---------------------------

  const hasFavorites = favoritos.length > 0;

  const handleToggleFavorite = useCallback(
    (phone: PhoneItem) => {
      const favorite = favoritos.find((fav) => fav.dispositivo.id === phone.id);
      if (favorite) {
        setSelectedFavorite(favorite);
      }
    },
    [favoritos]
  );

  const handleConfirmRemoval = useCallback(async () => {
    if (!selectedFavorite) return;
    try {
      setCompareList((list) =>
        list.filter((item) => item.id !== selectedFavorite.dispositivo.id)
      );
      await removerFavorito(selectedFavorite.dispositivo.id);
    } finally {
      setSelectedFavorite(null);
    }
  }, [removerFavorito, selectedFavorite]);

  // --- EMPTY STATE (Com gradiente Moto AI) ---
  const emptyState = useMemo(
    () => (
      <div className="mt-8 flex flex-col items-center justify-center gap-6 rounded-[2rem] border border-slate-200 bg-white/50 p-12 text-center shadow-sm backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-blue-100 via-purple-100 to-pink-100 shadow-inner">
          <Sparkles className="h-10 w-10 text-purple-600" />
        </div>
        <div className="max-w-md space-y-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Sua coleção está vazia
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Converse com a Moto AI para descobrir o smartphone ideal. 
            Quando gostar de uma recomendação, marque como favorito e ela aparecerá aqui.
          </p>
        </div>
      </div>
    ),
    []
  );

  return (
    // AJUSTADO: Div simples, sem min-h-screen, overflow visível
    <div className="w-full relative pb-40 pt-6">
      
      {/* --- BACKGROUND DECORATIVO --- */}
      {/* Posicionado absolutamente dentro deste componente para não vazar */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
         {/* Gradientes sutis localizados */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-400/5 blur-[120px]" />
        <div className="absolute top-[20%] right-0 w-[400px] h-[400px] rounded-full bg-purple-400/5 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* --- HEADER --- */}
        <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-in slide-in-from-top-4 fade-in duration-700">
          <div className="space-y-3">
            {/* Tag Arco-íris suave */}
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-sm">
              <Cpu className="h-3 w-3 text-purple-600" />
              <span>Moto Match AI</span>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Seus Favoritos
            </h1>
            <p className="max-w-xl text-base text-slate-500">
              Gerencie suas escolhas e use a inteligência da Moto AI para comparar os melhores dispositivos.
            </p>
          </div>

          {/* Contador */}
          {hasFavorites && (
            <div className="hidden md:flex items-center gap-4">
              <div className="flex -space-x-3">
                  {favoritos.slice(0, 3).map((fav) => (
                    <div key={fav.idFavorito} className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm bg-white">
                      <Image src={fav.dispositivo.imageUrls[0]} alt="" fill className="object-cover" />
                    </div>
                  ))}
              </div>
              <div className="flex flex-col">
                 <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                   {favoritos.length}
                 </span>
                 <span className="text-xs font-medium text-slate-400 uppercase">Salvos</span>
              </div>
            </div>
          )}
        </header>

        {/* --- LOADING --- */}
        {isLoading && (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-4 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
            <span className="text-lg font-medium text-slate-500">
              Carregando coleção...
            </span>
          </div>
        )}

        {/* --- ERROR --- */}
        {isError && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-8 text-center">
            <h3 className="text-lg font-semibold text-rose-900">Ops!</h3>
            <p className="text-rose-600 mt-1">Não conseguimos carregar seus favoritos no momento.</p>
          </div>
        )}

        {!isLoading && !isError && !hasFavorites && emptyState}

        {/* --- GRID DE CARDS --- */}
        {hasFavorites && (
          // AJUSTADO: xl:grid-cols-4 para diminuir o tamanho individual dos cards
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-forwards">
            {favoritos.map((fav) => {
              const isSelected = compareList.some(
                (item) => item.id === fav.dispositivo.id
              );
              const isDisabled = compareList.length >= 2 && !isSelected;

              return (
                <div key={fav.idFavorito} className="h-full transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-[1.5rem]">
                  <PhoneCard
                    item={fav.dispositivo}
                    onToggleFavorite={handleToggleFavorite}
                    disableFavorite={isMutating}
                    // Botão de Seleção (Style Moto AI)
                    leftAction={
                      <button
                        type="button"
                        onClick={() => handleSelectToCompare(fav.dispositivo)}
                        disabled={isDisabled}
                        className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 overflow-hidden
                          ${
                            isSelected
                              ? "border-transparent text-white shadow-md"
                              : "border-slate-200 bg-white text-slate-400 hover:border-purple-300 hover:text-purple-600 hover:shadow-md"
                          }
                          ${
                            isDisabled
                              ? "opacity-40 cursor-not-allowed grayscale"
                              : ""
                          }
                        `}
                      >
                         {/* Fundo Gradiente Arco-íris quando ativo */}
                         {isSelected && (
                           <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
                         )}

                         <div className="relative z-10">
                            {isSelected ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                         </div>
                      </button>
                    }
                  />
                </div>
              );
            })}
          </section>
        )}
      </div>

      {/* --- DOCK FLUTUANTE --- */}
      {compareList.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-500 ease-out">
          <div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/90 p-2 pl-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/50 transition-all hover:scale-[1.01]">
            
            <div className="hidden sm:flex flex-col px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Comparar
              </span>
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                {compareList.length}/2 Selecionados
              </span>
            </div>

            <div className="flex -space-x-3">
              {compareList.map((item) => (
                <div
                  key={item.id}
                  className="relative h-12 w-12 overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm"
                >
                  <Image
                    src={item.imageUrls[0]}
                    alt={item.title}
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                  />
                </div>
              ))}
              
              {compareList.length === 1 && (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-dashed border-slate-300 bg-white/50 text-slate-300">
                  <Smartphone className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsCompareModalOpen(true)}
                disabled={compareList.length < 2}
                className={`rounded-full px-6 font-bold text-white shadow-lg transition-all h-10 border-0
                  ${compareList.length === 2 
                    ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:shadow-purple-500/30 hover:brightness-110" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"}
                `}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Comparar
              </Button>
              
              <Button
                onClick={clearComparison}
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:rotate-90 transition-all duration-300"
                title="Limpar seleção"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL --- */}
      {compareList.length === 2 && (
        <CompareModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          deviceA={compareList[0]}
          deviceB={compareList[1]}
        />
      )}

      {/* --- ALERT DE REMOÇÃO --- */}
      <AlertDialog
        open={Boolean(selectedFavorite)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFavorite(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 ring-4 ring-rose-50/50">
              <Trash2 className="h-6 w-6 text-rose-500" />
            </div>
            <AlertDialogTitle className="text-center text-xl text-slate-900">
              Remover Favorito?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-500">
              O dispositivo <span className="font-semibold text-slate-900">{selectedFavorite?.dispositivo.title}</span> será removido da sua lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
            <AlertDialogCancel disabled={isMutating} className="mt-0 rounded-full border-slate-200 sm:w-32 h-11">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-md shadow-rose-200 sm:w-32 h-11 border-0"
              onClick={handleConfirmRemoval}
              disabled={isMutating}
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}