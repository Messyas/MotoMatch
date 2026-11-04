import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryClientProvider } from "../components/ReactQueryClient/ReactQueryClient";
import { DispositivosProvider } from "@/components/dispositivosProvider/dispositivosProvider";
import { Sidebar } from "@/components/layout/Sidebar"; // Lembre-se de corrigir o caminho se necessário
import { Toaster } from "sonner";

export const metadata: Metadata = { title: "Moto Match", description: "Sistema com IA para recomendação de celulares motorola" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className="antialiased">
        <ReactQueryClientProvider>
          {/* A estrutura de GRID foi removida */}
          <Sidebar />
          {/* Adicionamos uma margem à esquerda (ml) no desktop */}
          <main className="p-4 sm:p-6 md:ml-[80px]">
            <DispositivosProvider>{children}</DispositivosProvider>
          </main>
          <Toaster richColors position="top-right" />
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
