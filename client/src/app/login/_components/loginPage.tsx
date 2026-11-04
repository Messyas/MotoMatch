"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { backApi } from "@/services/api";
import { UserLogin } from "@/types/user";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { PasswordInput } from "@/components/layout/passwords-input";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Separator } from "@/components/ui/separator";
import ResendEmail from "../../resend-email/resendEmailPage";
import ForgotPasswordModal from "@/app/forgot-password/forgotPasswordPage";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // << 1. CORREÇÃO DO ERRO DE DIGITAÇÃO >>
  const { refreshUser } = useAuth();

  const [credentials, setCredentials] = useState<UserLogin>({
    username: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // 👉 Detectar se veio do signup
  useEffect(() => {
    if (searchParams.get("from") === "signup") {
      setInfoMessage(
        "Cadastro realizado! Verifique seu e-mail para ativar sua conta."
      );
      const timer = setTimeout(() => setInfoMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await backApi.post("/auth/login", credentials, {
        withCredentials: true,
      });

      if (res.status === 200) {
        // << 2. CORREÇÃO DO ERRO DE DIGITAÇÃO >>
        await refreshUser();
        // toast.success("Autenticação realizada com sucesso!");
        router.push("/");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setErrorMessage("Nome de usuário e/ou senha incorreta");
        } else if (err.response?.status === 403) {
          const msg =
            err.response.data?.message ??
            "E-mail não verificado. Verifique sua caixa de entrada.";
          setErrorMessage(msg);
          setShowResendModal(true);
        } else {
          console.error(err);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-white p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 bg-clip-text text-transparent">
          Login
        </h2>

        {/* ✅ Mensagem informativa (some sozinha após 5s) */}
        {infoMessage && (
          <div className="mb-4 w-full rounded-md bg-blue-50 border border-blue-300 p-3 text-sm text-blue-700">
            {infoMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 w-full rounded-md bg-red-50 border border-red-300 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <Label htmlFor="username">Nome de usuário</Label>
            <Input
              id="username"
              value={credentials.username}
              onChange={handleChange}
              type="text"
              required
            />
          </div>

          <div className="flex flex-col">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput
              id="password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>

          <Button
            type="submit"
            className="mt-2 relative overflow-hidden rounded-lg text-white font-semibold bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 bg-[length:200%_200%] animate-gradient-move transition-transform duration-200 hover:scale-105 active:scale-95"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-gray-500 text-sm">
          <Separator className="flex-1" />
          <span>ou</span>
          <Separator className="flex-1" />
        </div>

        <GoogleAuthButton
          label="Entrar com Google"
          redirectTo="/"
          className="w-full"
        />

        <p className="mt-4 text-center text-gray-600">
          Não tem uma conta?{" "}
          <Link href="/signup" className="text-blue-500 underline">
            Cadastre-se
          </Link>
        </p>

        <div className="text-right text-sm">
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-blue-500 hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>
      </div>

      <ResendEmail
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
      />

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </div>
  );
}
