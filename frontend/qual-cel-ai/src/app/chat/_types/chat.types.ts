import type { CriterioPesquisa, PhoneItem, ConsoleSeletores } from "@/types/phones";

/**
 * Define as diferentes formas que uma mensagem pode ter na interface do chat.
 * Este é um "discriminated union", que permite ao TypeScript entender qual
 * formato de mensagem está sendo usado com base nas propriedades 'role' e 'type'.
 */
export type ChatMsg =
  | {
      id: string;
      role: "user";
      criterios: CriterioPesquisa[];
      consoleInput?: string | null;
      seletores?: Partial<ConsoleSeletores> | null;
      requestId?: string | null;
    }
  | {
      id: string;
      role: "assistant";
      type: "loading";
    }
  | {
      id: string;
      role: "assistant";
      type: "cards";
      items: PhoneItem[];
    }
  | {
      id: string;
      role: "assistant";
      type: "text";
      content: string;
    };
