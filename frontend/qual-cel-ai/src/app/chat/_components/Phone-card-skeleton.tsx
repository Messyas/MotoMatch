/**
 * @component PhoneCardSkeleton
 * @description Componente que renderiza uma versão de esqueleto (skeleton) do `PhoneCard`. É utilizado para indicar um estado de carregamento na interface, mantendo a consistência visual com o card de conteúdo real.
 * @returns {JSX.Element} Um card com elementos de placeholder que imitam a estrutura do `PhoneCard` durante o carregamento de dados.
 */
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PhoneCardSkeleton() {
  return (
    <Card className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm">
      <CardHeader className="space-y-2 p-4">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-48 rounded" />
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 p-4">
        <Skeleton className="h-36 w-40 rounded" />
        <div className="w-full space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="mt-2 h-10 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}
