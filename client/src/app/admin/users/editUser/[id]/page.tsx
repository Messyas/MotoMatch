"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { backApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCelular, unmaskCelular } from "@/utils/masks";
import { useAuth } from "@/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { UserCadastroAdm } from "@/types/user";
import axios from "axios";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState<Omit<
    UserCadastroAdm,
    "password"
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useProtectedRoute(["0", "2"]); // apenas admin e suporte

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await backApi.get<UserCadastroAdm>(`/users/${params.id}`);
        const { password, ...userData } = res.data;
        void password;
        setFormData(userData);

        // Bloquear acesso
        if (
          user &&
          user.tipo === "2" &&
          (res.data.tipo === "0" ||
            (res.data.tipo === "2" && res.data.idUsuario !== user.idUsuario))
        ) {
          router.push("/admin/users");
        }
      } catch (err) {
        console.error(err);
        setGeneralError("Não foi possível carregar o usuário.");
      } finally {
        setCheckingAccess(false);
      }
    };

    // Só chama fetch se user permitido
    if (params?.id && user && ["0", "2"].includes(user.tipo)) {
      fetchUser();
    } else {
      setCheckingAccess(false); // evita ficar "Carregando..." indefinidamente
    }
  }, [params?.id, user, router]);

  if (authLoading || checkingAccess || !formData) {
    return <div className="text-center py-6">Carregando...</div>;
  }

  const handleChange = (
    field: keyof Omit<UserCadastroAdm, "password">,
    value: string
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData) return;

    setLoading(true);
    setErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    const payload = {
      ...formData,
      celular: unmaskCelular(formData.celular),
    };

    try {
      const res = await backApi.put(`/users/${params.id}`, payload);
      if (res.status === 200) {
        setSuccessMessage("Usuário atualizado com sucesso! ✅");
        setTimeout(() => router.push("/admin/users"), 2000);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | {
              fieldErrors?: Record<string, string>;
              field?: string;
              message?: string;
              error?: string;
            }
          | string
          | undefined;

        if (typeof data === "string") setGeneralError(data);
        else if (data?.fieldErrors) setErrors(data.fieldErrors);
        else if (data?.field && data?.message)
          setErrors({ [data.field]: data.message });
        else if (data?.error) setGeneralError(data.error);
        else setGeneralError("Erro ao atualizar usuário. Verifique os dados.");
      } else {
        setGeneralError("Erro ao atualizar usuário. Verifique os dados.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 bg-clip-text text-transparent">
        Editar Usuário
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
            value={formData.nome}
            onChange={(e) => handleChange("nome", e.target.value)}
            required
          />
          {errors.nome && (
            <span className="text-sm text-red-500">{errors.nome}</span>
          )}
        </div>

        {/* Data nascimento */}
        <div className="flex flex-col">
          <Label htmlFor="nascimento" className="mb-2">
            Data de Nascimento
          </Label>
          <Input
            id="nascimento"
            type="date"
            value={formData.nascimento}
            onChange={(e) => handleChange("nascimento", e.target.value)}
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
            value={formData.username}
            onChange={(e) => handleChange("username", e.target.value)}
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
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
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
            value={formatCelular(formData.celular)}
            onChange={(e) => handleChange("celular", e.target.value)}
            required
          />
          {errors.celular && (
            <span className="text-sm text-red-500">{errors.celular}</span>
          )}
        </div>

        {/* Tipo */}
        <div className="flex flex-col mb-4">
          <Label className="mb-2">Tipo</Label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                value="1"
                checked={formData.tipo === "1"}
                onChange={() => handleChange("tipo", "1")}
                className="accent-blue-500"
              />
              Usuário
            </label>
            {user?.tipo === "0" && (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tipo"
                    value="2"
                    checked={formData.tipo === "2"}
                    onChange={() => handleChange("tipo", "2")}
                    className="accent-blue-500"
                  />
                  Suporte
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tipo"
                    value="0"
                    checked={formData.tipo === "0"}
                    onChange={() => handleChange("tipo", "0")}
                    className="accent-blue-500"
                  />
                  Administrador
                </label>
              </>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="md:col-span-2 flex justify-center gap-4 mt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/users")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
