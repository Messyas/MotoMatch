import { Suspense } from "react";
import VerifyEmailPage from "./verifyEmailPage"; 
import { Loader2 } from "lucide-react"; 

// Um componente simples para mostrar enquanto o principal carrega
function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );
}

// Este é o novo conteúdo da sua página
export default function VerifyEmailContainer() {
  return (
    <Suspense fallback={<Loading />}>
      <VerifyEmailPage />
    </Suspense>
  );
}