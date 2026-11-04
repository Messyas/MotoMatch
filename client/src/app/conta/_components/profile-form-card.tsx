import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";

export function ProfileFormCard() {
  const {
    register,
    formState: { errors, isSubmitting },
  } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>
          Suas informações de perfil. Alguns dados não podem ser alterados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register("nome")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...register("username")} />
            {errors.username && (
              <p className="mt-1 text-sm text-red-500">{`${errors.username.message}`}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              {...register("celular")}
              placeholder="92912345678"
            />
            {errors.celular && (
              <p className="mt-1 text-sm text-red-500">{`${errors.celular.message}`}</p>
            )}
          </div>
        </div>
        <Input type="hidden" {...register("tipo")} />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </CardFooter>
    </Card>
  );
}
