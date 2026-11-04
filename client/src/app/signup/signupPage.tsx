"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { formatCelular, unmaskCelular } from "@/utils/masks";
import { backApi } from "@/services/api";
import { UserCadastro } from "@/types/user";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Separator } from "@/components/ui/separator";

export default function SignUp() {
  const router = useRouter();

  const [formData, setFormData] = useState<UserCadastro>({
    nome: "",
    nascimento: "",
    username: "",
    email: "",
    celular: "",
    password: "",
  });

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof UserCadastro, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: id === "celular" ? value : value,
    }));

    // Limpar o erro do campo enquanto o usuário digita
    if (fieldErrors[id as keyof UserCadastro]) {
      setFieldErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const payload = { ...formData, celular: unmaskCelular(formData.celular) };

    const errors: Partial<Record<keyof UserCadastro, string>> = {};
    (Object.keys(payload) as (keyof UserCadastro)[]).forEach((key) => {
      if (!payload[key] || !payload[key].toString().trim()) {
        errors[key] = "Campo obrigatório";
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const res = await backApi.post("/auth/signup", payload);
      if (res.status === 201) router.push("/login?from=signup");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const data = err.response.data as {
          field?: keyof UserCadastro;
          message?: string;
          fieldErrors?: Partial<Record<keyof UserCadastro, string>>;
        };

        if (data?.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        } else if (data?.field && data?.message) {
          setFieldErrors({ [data.field]: data.message });
        } else if (typeof err.response.data === "string") {
          setError(err.response.data);
        } else {
          setError("Erro ao cadastrar. Verifique os dados.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <h2
          className="mb-6 text-center text-2xl font-bold
                     bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500
                     bg-clip-text text-transparent"
        >
          Cadastro
        </h2>

        {error && (
          <div
            role="alert"
            className="mb-4 w-full rounded-md bg-red-50 border border-red-300 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Nome */}
          <div className="flex flex-col">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={handleChange}
              type="text"
              required
            />
            {fieldErrors.nome && (
              <span className="text-sm text-red-500">{fieldErrors.nome}</span>
            )}
          </div>

          {/* Nascimento */}
          <div className="flex flex-col">
            <Label htmlFor="nascimento">Data de Nascimento</Label>
            <Input
              id="nascimento"
              value={formData.nascimento}
              onChange={handleChange}
              type="date"
              required
            />
            {fieldErrors.nascimento && (
              <span className="text-sm text-red-500">
                {fieldErrors.nascimento}
              </span>
            )}
          </div>

          {/* Username */}
          <div className="flex flex-col">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={handleChange}
              type="text"
              required
            />
            {fieldErrors.username && (
              <span className="text-sm text-red-500">
                {fieldErrors.username}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              required
            />
            {fieldErrors.email && (
              <span className="text-sm text-red-500">{fieldErrors.email}</span>
            )}
          </div>

          {/* Celular */}
          <div className="flex flex-col">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              value={formatCelular(formData.celular)}
              onChange={handleChange}
              type="tel"
              placeholder="(99) 99999-9999"
              required
            />
            {fieldErrors.celular && (
              <span className="text-sm text-red-500">
                {fieldErrors.celular}
              </span>
            )}
          </div>

          {/* Senha */}
          <div className="flex flex-col">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              value={formData.password}
              onChange={handleChange}
              type="password"
              required
            />
            {fieldErrors.password && (
              <span className="text-sm text-red-500">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <Button
            type="submit"
            className="mt-2 relative overflow-hidden rounded-lg text-white font-semibold
                       bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500
                       bg-[length:200%_200%] animate-gradient-move
                       transition-transform duration-200 hover:scale-105 active:scale-95"
            disabled={loading}
          >
            {loading ? "Cadastrando..." : "Confirmar cadastro"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-gray-500 text-sm">
          <Separator className="flex-1" />
          <span>ou</span>
          <Separator className="flex-1" />
        </div>

        <GoogleAuthButton
          label="Criar conta com Google"
          redirectTo="/"
          className="w-full"
        />

        <p className="mt-4 text-center text-gray-600">
          Já possui cadastro?{" "}
          <Link href="/login" className="text-blue-500 underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
