"use client";

import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountForms } from "./_components/account-forms";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="container flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-white p-4 md:p-6">
      <AccountForms />
    </main>
  );
}
