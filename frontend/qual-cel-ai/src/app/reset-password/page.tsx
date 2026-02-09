import { Suspense } from "react";
import ResetPasswordPage from "./resetPasswordPage";

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Carregando...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
