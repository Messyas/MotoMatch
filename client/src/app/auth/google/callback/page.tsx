import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CallbackClient from "./CallbackClient";

// A simple loading fallback component
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );
}

export default function GoogleOAuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CallbackClient />
    </Suspense>
  );
}