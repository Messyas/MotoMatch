"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_MESSAGES = {
  success: "Login realizado com sucesso! Estamos finalizando seu acesso.",
  error:
    "Não foi possível concluir o login com o Google. Tente novamente em instantes.",
};

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const status = (searchParams.get("status") ?? "error").toLowerCase();
  const messageFromQuery = searchParams.get("message");
  const nextPath = searchParams.get("next") ?? "/";

  const [flowError, setFlowError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(status === "success");

  useEffect(() => {
    if (status !== "success") return;

    let active = true;

    const finalizeLogin = async () => {
      try {
        await refreshUser();
        if (!active) return;
        router.replace(nextPath);
      } catch (error) {
        console.error("[google-auth] Falha ao finalizar login:", error);
        if (!active) return;
        setFlowError(
          "Login realizado, mas não conseguimos confirmar sua sessão. Faça login novamente."
        );
      } finally {
        if (active) {
          setProcessing(false);
        }
      }
    };

    finalizeLogin();

    return () => {
      active = false;
    };
  }, [status, refreshUser, router, nextPath]);

  const effectiveStatus = useMemo(() => {
    if (status === "success" && !flowError) {
      return "success";
    }
    return "error";
  }, [status, flowError]);

  const displayMessage =
    flowError ??
    messageFromQuery ??
    DEFAULT_MESSAGES[effectiveStatus as "success" | "error"];

  const isSuccess = effectiveStatus === "success";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-md space-y-4">
        <div className="flex justify-center">
          {isSuccess ? (
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          ) : (
            <AlertCircle className="h-12 w-12 text-red-500" />
          )}
        </div>

        <h1 className="text-xl font-semibold text-gray-800">
          {isSuccess ? "Login com Google" : "Algo deu errado"}
        </h1>

        <p className="text-gray-600">{displayMessage}</p>

        {processing && (
          <div className="mt-4 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={() => router.replace(isSuccess ? nextPath : "/login")}
            disabled={processing && isSuccess}
          >
            {isSuccess ? "Ir para a aplicação" : "Voltar para o login"}
          </Button>

          {!isSuccess && (
            <Button variant="outline" onClick={() => router.replace("/")}>
              Ir para a página inicial
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}