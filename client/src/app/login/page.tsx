import { Suspense } from "react";
import LoginPage from "./_components/loginPage";
import { Loader2 } from "lucide-react";

// A simple loading component to show as a fallback
function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );
}

export default function LoginPageContainer() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginPage />
    </Suspense>
  );
}