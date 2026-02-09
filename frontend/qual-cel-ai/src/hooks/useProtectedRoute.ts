import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";

type AllowedTypes = "0" | "1" | "2";

export function useProtectedRoute(allowedTypes: AllowedTypes[]) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      // Se não houver usuário ou tipo não permitido
      if (!user || !allowedTypes.includes(user.tipo as AllowedTypes)) {
        router.replace("/"); // redireciona sem permitir voltar
      }
    }
  }, [user, authLoading, allowedTypes, router]);
}
