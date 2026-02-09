"use client"; // Marca como Client Component.

import { useState, useEffect, useRef } from "react";
import { backApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AxiosError } from "axios";  // Importando o tipo do erro.

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export default function ResendEmail({
  isOpen,
  onClose,
  initialEmail = "",
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atualiza o e-mail inicial ao abrir o modal
  useEffect(() => {
    setEmail(initialEmail);
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialEmail, isOpen]);

  // Contador regressivo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleResend = async () => {
    if (!isEmailValid(email)) {
      toast.error("Digite um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      await backApi.post("/auth/resend-verification-email", { email });
      toast.success("E-mail de verificação enviado!");
      setCountdown(60); // Bloqueia o botão por 1 minuto
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Erro ao enviar e-mail.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">
          Reenviar e-mail de verificação
        </h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            ref={inputRef}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu e-mail"
          />
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleResend}
            disabled={
              loading || countdown > 0 || !email || !isEmailValid(email)
            }
          >
            {countdown > 0
              ? `Aguarde ${countdown}s`
              : loading
              ? "Enviando..."
              : "Reenviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
