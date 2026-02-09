"use client";

import ResendEmail from "./resendEmailPage";
import { useRouter } from "next/navigation"; 

export default function Page() {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return <ResendEmail isOpen={true} onClose={handleClose} />;
}