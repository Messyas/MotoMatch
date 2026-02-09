"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { backApi } from "@/services/api";
import { Button } from "@/components/ui/button";

type VerificationViewState =
  | "loading"
  | "success"
  | "already-verified"
  | "expired"
  | "invalid"
  | "error";

const transitions: Record<VerificationViewState, string> = {
  loading: "Validando seu e-mail...",
  success: "Seu e-mail foi confirmado. Agora você pode acessar o sistema.",
  "already-verified":
    "Seu e-mail já havia sido confirmado anteriormente. Faça login para continuar.",
  expired:
    "O link de verificação expirou. Solicite um novo e-mail para confirmar sua conta.",
  invalid: "Token de verificação inválido. Verifique o link recebido.",
  error:
    "Não foi possível verificar o e-mail neste momento. Tente novamente em instantes.",
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<VerificationViewState>("loading");
  const [message, setMessage] = useState<string>(transitions.loading);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setMessage(transitions.invalid);
      return;
    }

    let active = true;

    const verify = async () => {
      try {
        const response = await backApi.get("/auth/verify-email", {
          params: { token },
        });

        if (!active) return;

        const nextStatus =
          (response.data?.status as VerificationViewState) ?? "success";

        setStatus(nextStatus);
        setMessage(response.data?.message ?? transitions[nextStatus]);
      } catch (err) {
        if (!active) return;

        if (axios.isAxiosError(err) && err.response) {
          const nextStatus =
            (err.response.data?.status as VerificationViewState) ??
            (err.response.status === 410 ? "expired" : "error");
          setStatus(nextStatus);
          setMessage(err.response.data?.message ?? transitions[nextStatus]);
          return;
        }

        setStatus("error");
        setMessage(transitions.error);
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [token]);

  const showSuccessActions =
    status === "success" || status === "already-verified";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Verificação de E-mail
        </h1>
        <p className="text-gray-600">{message}</p>

        {status === "loading" && (
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-300 border-t-transparent" />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {showSuccessActions && (
            <Button onClick={() => router.push("/login")}>
              Ir para a tela de login
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push("/")}>
            Voltar para a página inicial
          </Button>
        </div>
      </div>
    </div>
  );
}
