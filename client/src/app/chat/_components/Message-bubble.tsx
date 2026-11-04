/**
 * @component MessageBubble
 * @description Um componente de UI reutilizável que renderiza um container estilizado como um "balão de mensagem",
 * ideal para interfaces de chat. O estilo e o alinhamento do balão são controlados via props para
 * diferenciar visualmente entre diferentes remetentes (ex: assistente e usuário).
 * @param {object} props - As propriedades do componente.
 * @param {'left' | 'right'} [props.align='left'] - Controla o alinhamento (esquerda/direita), a cor de fundo e a largura do balão.
 * @param {string} [props.title] - Um título opcional exibido no topo, dentro do balão.
 * @param {ReactNode} props.children - O conteúdo principal (texto, outros componentes, etc.) a ser renderizado dentro do balão.
 * @returns {JSX.Element} Um elemento div estilizado que representa o balão de mensagem.
 */

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  align?: "left" | "right";
  title?: string;
  children: ReactNode;
  contentClassName?: string;
};

export function MessageBubble({
  align = "left",
  title,
  children,
  contentClassName,
}: Readonly<Props>) {
  const isLeft = align === "left";

  return (
    // O container principal alinha os baloes a esquerda ou a direita
    <div
      className={cn(
        "w-full flex",
        isLeft ? "justify-center md:justify-start" : "justify-center md:justify-end"
      )}
    >
      <div
        className={cn(
          "rounded-2xl border shadow-sm p-4",
          isLeft
            ? // Estilo para o balao da esquerda (assistente)
              "w-full max-w-5xl bg-[#f5f3f1] border-gray-200"
            : // Estilo para o balao da direita (usuario)
              "max-w-xl min-w-[300px] bg-[#a8c8ff] border border-[#7ba6e8] text-[#f4f7ff] [text-shadow:0_0.5px_1px_#9bbbf5] rounded-2xl shadow-md",
          contentClassName
        )}
      >
        {title && (
          <div
            className={cn(
              "text-xs font-semibold mb-4",
              isLeft ? "text-[#001428]" : "text-[#001428]/80"
            )}
          >
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
