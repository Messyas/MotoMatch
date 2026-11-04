"use client";

import { useCallback, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { backApi } from "@/services/api";

interface GoogleAuthButtonProps {
  label?: string;
  redirectTo?: string;
  className?: string;
}

const DEFAULT_REDIRECT = "/";
const DEFAULT_FAIL_PATH = "/auth/google/callback";

export function GoogleAuthButton({
  label = "Continuar com Google",
  redirectTo = DEFAULT_REDIRECT,
  className,
}: Readonly<GoogleAuthButtonProps>) {
  const [loading, setLoading] = useState(false);

  const getStateParam = useCallback(() => {
    try {
      const stateParams = new URLSearchParams();
      stateParams.set("next", redirectTo ?? DEFAULT_REDIRECT);
      stateParams.set("fail", DEFAULT_FAIL_PATH);
      return stateParams.toString();
    } catch {
      return `next=${encodeURIComponent(
        DEFAULT_REDIRECT
      )}&fail=${encodeURIComponent(DEFAULT_FAIL_PATH)}`;
    }
  }, [redirectTo]);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      const state = getStateParam();
      const response = await backApi.get<{ url?: string }>("/auth/google", {
        params: { state },
      });

      const authUrl = response.data?.url;
      if (!authUrl) {
        throw new Error("URL de autenticação inválida recebida.");
      }

      window.location.href = authUrl;
    } catch (error) {
      console.error("[google-auth] Falha ao iniciar OAuth:", error);
      toast.error(
        "Não foi possível iniciar o login com o Google. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }, [getStateParam]);

  return (
    <Button
      type="button"
      variant="outline"
      className={`flex items-center justify-center gap-2 ${className ?? ""}`}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FcGoogle className="h-5 w-5" />
      )}
      {loading ? "Redirecionando..." : label}
    </Button>
  );
}
