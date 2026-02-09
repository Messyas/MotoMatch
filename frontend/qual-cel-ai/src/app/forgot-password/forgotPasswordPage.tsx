"use client";

import { useState, useEffect, useRef } from "react";
import { backApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AxiosError } from "axios";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Atualiza o e-mail inicial e foca o campo ao abrir o modal
  useEffect(() => {
    setEmail(initialEmail);
    if (isOpen) {
      // usar window.setTimeout para retornar number no navegador
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialEmail, isOpen]);

  // Cronômetro regressivo: decrementa o countdown a cada segundo
  useEffect(() => {
    if (countdown <= 0) {
      // limpa timer caso exista
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // start interval se ainda não existe
    if (!timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            // quando chegar a zero, limpa o interval
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }

    return () => {
      // cleanup ao desmontar
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [countdown]);

  // Validação simples de formato de e-mail
  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async () => {
    if (!isEmailValid(email)) {
      toast.error("Digite um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      // chama o endpoint de forgot-password
      const response = await backApi.post("/auth/forgot-password", { email });

      toast.success(
        response.data?.message ??
          "Se o e-mail existir, enviaremos um link para redefinir sua senha."
      );

      setCountdown(60);
      // opcional: fecha o modal logo após enviar
      // onClose();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Erro ao solicitar redefinição de senha.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Recuperar senha</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="fp-email">E-mail</Label>
          <Input
            id="fp-email"
            type="email"
            ref={inputRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu e-mail"
            autoComplete="email"
          />
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || countdown > 0 || !isEmailValid(email)}
          >
            {countdown > 0
              ? `Aguarde ${countdown}s`
              : loading
              ? "Enviando..."
              : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
