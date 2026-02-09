"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { backApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCelular, unmaskCelular } from "@/utils/masks";
import { useAuth } from "@/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function AddUserPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState<"0" | "1" | "2">("1");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Regras de acesso
  useProtectedRoute(["0", "2"]); // usuários "1" não podem acessar

  useEffect(() => {
    if (!authLoading) {
      // Bloquear acesso
      if (!user || !["0", "2"].includes(user.tipo)) {
        setCheckingAccess(false);
        return;
      }

      // se for suporte, força tipo inicial = 1 e remove opções admin/suporte
      if (user.tipo === "2") {
        setTipo("1");
      }

      setCheckingAccess(false); // usuário permitido
    }
  }, [user, authLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    const payload = {
      nome,
      nascimento,
      username,
      email,
      celular: unmaskCelular(celular),
      password,
      tipo,
    };

    try {
      const res = await backApi.post("/users/", payload);

      if (res.status === 201) {
        setSuccessMessage("Usuário cadastrado com sucesso! ✅");
        setTimeout(() => setSuccessMessage(null), 4000);

        // Reset form
        setNome("");
        setNascimento("");
        setUsername("");
        setEmail("");
        setCelular("");
        setPassword("");
        setTipo(user?.tipo === "2" ? "1" : "1"); // suporte só cria tipo 1
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const data = err.response?.data;

      if (typeof data === "string") {
        setGeneralError(data);
      } else if (data?.fieldErrors) {
        setErrors(data.fieldErrors);
      } else if (data?.field) {
        setErrors({ [data.field]: data.message });
      } else {
        setGeneralError("Erro ao cadastrar usuário. Verifique os dados.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingAccess) {
    return <div className="text-center py-6">Carregando...</div>;
  }

  //Se o usuário não é permitido, não renderiza o conteúdo
  if (!user || !["0", "2"].includes(user.tipo)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 bg-clip-text text-transparent">
        Cadastro de Usuário
      </h1>

      {generalError && (
        <div className="mb-4 w-full rounded-md bg-red-50 border border-red-300 p-3 text-sm text-red-700">
          {generalError}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 w-full rounded-md bg-green-50 border border-green-300 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        onSubmit={handleSubmit}
      >
        {/* Nome */}
        <div className="flex flex-col">
          <Label htmlFor="nome" className="mb-2">
            Nome
          </Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          {errors.nome && (
            <span className="text-sm text-red-500">{errors.nome}</span>
          )}
        </div>

        {/* Nascimento */}
        <div className="flex flex-col">
          <Label htmlFor="nascimento" className="mb-2">
            Data de Nascimento
          </Label>
          <Input
            id="nascimento"
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            required
          />
          {errors.nascimento && (
            <span className="text-sm text-red-500">{errors.nascimento}</span>
          )}
        </div>

        {/* Username */}
        <div className="flex flex-col">
          <Label htmlFor="username" className="mb-2">
            Username
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {errors.username && (
            <span className="text-sm text-red-500">{errors.username}</span>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <Label htmlFor="email" className="mb-2">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {errors.email && (
            <span className="text-sm text-red-500">{errors.email}</span>
          )}
        </div>

        {/* Celular */}
        <div className="flex flex-col">
          <Label htmlFor="celular" className="mb-2">
            Celular
          </Label>
          <Input
            id="celular"
            type="tel"
            value={formatCelular(celular)}
            onChange={(e) => setCelular(e.target.value)}
            required
          />
          {errors.celular && (
            <span className="text-sm text-red-500">{errors.celular}</span>
          )}
        </div>

        {/* Senha */}
        <div className="flex flex-col">
          <Label htmlFor="password" className="mb-2">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && (
            <span className="text-sm text-red-500">{errors.password}</span>
          )}
        </div>

        {/* Tipo */}
        <div className="flex flex-col mb-4">
          <Label className="mb-2">Tipo</Label>
          <div className="flex gap-6">
            {/* Usuário sempre aparece */}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                value="1"
                checked={tipo === "1"}
                onChange={() => setTipo("1")}
                className="accent-blue-500"
              />
              Usuário
            </label>

            {/* Suporte só aparece para admin */}
            {user?.tipo === "0" && (
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tipo"
                  value="2"
                  checked={tipo === "2"}
                  onChange={() => setTipo("2")}
                  className="accent-blue-500"
                />
                Suporte
              </label>
            )}

            {/* Admin só aparece para admin */}
            {user?.tipo === "0" && (
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tipo"
                  value="0"
                  checked={tipo === "0"}
                  onChange={() => setTipo("0")}
                  className="accent-blue-500"
                />
                Administrador
              </label>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="md:col-span-2 flex justify-center gap-4 mt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Cadastrando..." : "Confirmar Cadastro"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/users")}
          >
            Voltar
          </Button>
        </div>
      </form>
    </div>
  );
}
