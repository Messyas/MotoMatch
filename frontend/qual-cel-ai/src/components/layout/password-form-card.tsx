import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { PasswordInput } from "./passwords-input";

export function PasswordFormCard() {
  const {
    register,
    formState: { errors, isSubmitting },
  } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar Senha</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="oldPassword">Senha Atual</Label>
          <PasswordInput id="oldPassword" {...register("oldPassword")} />
          {errors.oldPassword && (
            <p className="mt-1 text-sm text-red-500">{`${errors.oldPassword.message}`}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nova Senha</Label>
          <PasswordInput id="newPassword" {...register("newPassword")} />
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-500">{`${errors.newPassword.message}`}</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Redefinir Senha
        </Button>
      </CardFooter>
    </Card>
  );
}
