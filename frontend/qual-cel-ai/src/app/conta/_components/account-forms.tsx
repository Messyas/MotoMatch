"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { backApi } from "@/services/api";
import axios from "axios";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ProfileFormCard } from "./profile-form-card";
import { PasswordFormCard } from "../../../components/layout/password-form-card";
import { DangerZoneCard } from "./danger-zone-card";
import { useRouter } from "next/navigation";
import {
  PasswordFormData,
  passwordFormSchema,
  ProfileFormData,
  profileFormSchema,
} from "@/lib/schemas/conta-schemas";

export function AccountForms() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();

  const profileMethods = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      nome: "",
      email: "",
      celular: "",
      tipo: "1",
      username: "",
    },
  });

  const passwordMethods = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
  });

  useEffect(() => {
    if (user) {
      profileMethods.reset(user);
    }
  }, [user, profileMethods]);

  const onUpdateProfile = async (data: ProfileFormData) => {
    try {
      await backApi.put(`/users/${user!.idUsuario}`, data);
      await refreshUser();
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const responseData = error.response.data;
        if (responseData.fieldErrors) {
          Object.keys(responseData.fieldErrors).forEach((field) => {
            profileMethods.setError(field as keyof ProfileFormData, {
              type: "server",
              message: responseData.fieldErrors[field],
            });
          });
          toast.error("Por favor, corrija os erros indicados no formulário.");
        } else if (responseData.error) {
          toast.error(responseData.error);
        } else {
          toast.error("Não foi possível atualizar o perfil. Tente novamente.");
        }
      }
    }
  };

  const onUpdatePassword = async (data: PasswordFormData) => {
    try {
      await backApi.patch(`/users/${user!.idUsuario}`, {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      passwordMethods.reset();
      toast.success("Senha alterada com sucesso!");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const responseData = error.response.data;
        if (responseData.fieldErrors) {
          Object.keys(responseData.fieldErrors).forEach((field) => {
            passwordMethods.setError(field as keyof PasswordFormData, {
              type: "server",
              message: responseData.fieldErrors[field],
            });
          });
          toast.error("Por favor, corrija os erros indicados no formulário.");
        } else if (responseData.error) {
          toast.error(responseData.error);
        } else {
          toast.error("Erro ao alterar a senha. Tente novamente.");
        }
      }
    }
  };

  const onDeleteAccount = async () => {
    try {
      await backApi.delete("/users/me");
      await logout();
      router.push("/");
      toast.success("Sua conta foi apagada.");
    } catch {
      toast.error("Não foi possível apagar sua conta no momento.");
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-center sm:text-left">
        Minha Conta
      </h1>
      <FormProvider {...profileMethods}>
        <form onSubmit={profileMethods.handleSubmit(onUpdateProfile)}>
          <ProfileFormCard />
        </form>
      </FormProvider>
      <FormProvider {...passwordMethods}>
        <form onSubmit={passwordMethods.handleSubmit(onUpdatePassword)}>
          <PasswordFormCard />
        </form>
      </FormProvider>
      <DangerZoneCard onDelete={onDeleteAccount} />
    </div>
  );
}
