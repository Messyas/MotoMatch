"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PhoneItem } from "@/types/phones";

type PageStatusWrapperProps = {
  isLoading: boolean;
  isError: boolean;
  dispositivo: PhoneItem | null | undefined;
  children: React.ReactNode;
};

export function PageStatusWrapper({
  isLoading,
  isError,
  dispositivo,
  children,
}: PageStatusWrapperProps) {
  // 1. Estado de Carregamento
  if (isLoading) {
    return (
      <main className="container py-16 flex flex-col items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-3 text-muted-foreground">Carregando dispositivo...</p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </main>
    );
  }

  // 2. Estado de Erro
  if (isError) {
    return (
      <main className="container py-16 flex justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Não foi possível carregar os detalhes do dispositivo.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  // 3. Estado "Não Encontrado"
  if (!dispositivo) {
    return (
      <main className="container py-16 flex justify-center">
        <Alert variant="default" className="max-w-lg">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Não encontrado</AlertTitle>
          <AlertDescription>
            O dispositivo solicitado não foi localizado.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  // 4. Sucesso: Renderiza o conteúdo da página
  return <>{children}</>;
}
