"use client";

import { useRouter } from "next/navigation";
import ForgotPasswordModal from "./forgotPasswordPage";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <ForgotPasswordModal
      isOpen
      onClose={() => router.push("/login")}
    />
  );
}
