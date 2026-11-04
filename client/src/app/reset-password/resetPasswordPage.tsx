"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { backApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AxiosError } from "axios";

interface FieldErrors {
  password?: string;
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);

    try {
      await backApi.post(`/auth/reset-password?token=${token}`, {
        password,
      });

      toast.success("Senha redefinida com sucesso!");
      router.push("/login");
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          const data = err.response.data as {
            fieldErrors?: FieldErrors;
            field?: string;
            message?: string;
          };

          if (data?.fieldErrors) {
            setFieldErrors(data.fieldErrors);
          } else if (data?.field && data?.message) {
            setFieldErrors({ [data.field]: data.message });
          }
          // Mensagem genérica
          else if (data?.message) {
            toast.error(data.message);
          } else {
            toast.error("Erro ao redefinir senha.");
          }
        } else {
          toast.error("Erro ao redefinir senha.");
        }
      } else {
        toast.error("Erro ao redefinir senha.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold">Redefinir senha</h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Senha */}
          <div className="flex flex-col">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
