"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarDispositivos,
  criarDispositivo,
  atualizarDispositivo,
  excluirDispositivo,
} from "@/services/phone.service";
import { getDispositivoById } from "@/services/dispositivoDetalhes.service";
import { mapDispositivoToPhoneItem } from "@/services/mappers/phone.mapper";
import type {
  PhoneItem,
  CriterioPesquisa,
  PesquisaConsolePayload,
  ConsoleSeletores,
} from "@/types/phones";

type DispositivosContextType = {
  dispositivos: PhoneItem[];
  isLoading: boolean;
  isLoadingDetalhe: boolean;
  isError: boolean;
  isErrorDetalhe: boolean;
  criterios: CriterioPesquisa[];
  pesquisaConsole: PesquisaConsolePayload;
  dispositivoDetalhado: PhoneItem | null;
  isHydrated: boolean;
  setCriterios: (payload: PesquisaConsolePayload) => void;
  refetchLista: () => void;
  criar: (payload: Omit<PhoneItem, "id">) => Promise<PhoneItem>;
  atualizar: (id: string, payload: Omit<PhoneItem, "id">) => Promise<PhoneItem>;
  excluir: (id: string) => Promise<void>;
  obterDispositivoDetalhado: (id: string) => Promise<PhoneItem | null>;
};

export const DISPOSITIVOS_STORAGE_KEY = "criteriosDispositivos";
const STORAGE_KEY = DISPOSITIVOS_STORAGE_KEY;
const DispositivosContext = createContext<DispositivosContextType>(
  {} as DispositivosContextType
);

const SELECTOR_KEYS: (keyof ConsoleSeletores)[] = [
  "ram",
  "rom",
  "battery",
  "main_camera",
  "camera",
  "benchmark",
  "price_range",
];

const DEFAULT_PESQUISA_CONSOLE: PesquisaConsolePayload = {
  criterios: [],
  consoleInput: "",
  seletores: {},
  requestId: "",
};

export function DispositivosProvider({ children }: { children: ReactNode }) {
  // Inicia SEMPRE com o estado padrão (vazio).
  const [pesquisaConsole, setPesquisaConsole] =
    useState<PesquisaConsolePayload>(DEFAULT_PESQUISA_CONSOLE);
  const [dispositivoDetalhado, setDispositivoDetalhado] =
    useState<PhoneItem | null>(null);
  const [isLoadingDetalhe, setIsLoadingDetalhe] = useState(false);
  const [isErrorDetalhe, setIsErrorDetalhe] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const queryClient = useQueryClient();

  const lastRequestedIdRef = useRef<string | null>(null);

  // Remove dados sensíveis do sessionStorage ao sair/fechar a aba
  useEffect(() => {
    const clearLocalData = () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.error("Falha ao limpar critérios do sessionStorage:", err);
      }
    };

    window.addEventListener("beforeunload", clearLocalData);
    window.addEventListener("pagehide", clearLocalData);

    return () => {
      clearLocalData();
      window.removeEventListener("beforeunload", clearLocalData);
      window.removeEventListener("pagehide", clearLocalData);
    };
  }, []);

  // Efeito de Hidratação (Roda apenas uma vez ao montar o componente)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setIsHydrated(true);
        return;
      }
      const parsed = JSON.parse(saved);

      // --- CORREÇÃO FINAL DE NAVEGAÇÃO ---
      // Independentemente do que está salvo, nós NUNCA restauramos
      // 'criterios' ou 'requestId' na inicialização.
      // Isso impede que o useChatManager dispare a busca ao entrar na página.
      
      const consoleInputSalvo =
        typeof parsed?.consoleInput === "string" ? parsed.consoleInput : "";

      const seletoresSalvos: ConsoleSeletores = {};
      if (
        parsed?.seletores &&
        typeof parsed.seletores === "object" &&
        !Array.isArray(parsed.seletores)
      ) {
        for (const key of SELECTOR_KEYS) {
          const valor = parsed.seletores[key];
          if (typeof valor === "string" && valor.trim() !== "") {
            seletoresSalvos[key] = valor;
          }
        }
      }

      // Definimos o estado inicial APENAS com os dados visuais.
      setPesquisaConsole({
        criterios: [], // Força vazio para não buscar
        consoleInput: consoleInputSalvo,
        seletores: seletoresSalvos,
        requestId: "", // Força vazio para não buscar
      });
    } catch (err) {
      console.error("Falha ao recuperar critérios do sessionStorage:", err);
      setPesquisaConsole(DEFAULT_PESQUISA_CONSOLE);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Efeito de Persistência
  useEffect(() => {
    // Só salvamos se já estiver hidratado, para evitar sobrescrever o storage com o valor default antes de ler
    if (isHydrated) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pesquisaConsole));
      } catch (err) {
        console.error("Falha ao persistir critérios no sessionStorage:", err);
      }
    }
  }, [pesquisaConsole, isHydrated]);

  const {
    data: dispositivos = [],
    isLoading,
    isError,
    refetch: refetchLista,
  } = useQuery({
    queryKey: ["dispositivos"],
    queryFn: listarDispositivos,
  });

  const obterDispositivoDetalhado = useCallback(async (id: string) => {
    lastRequestedIdRef.current = id;
    setDispositivoDetalhado(null);
    setIsLoadingDetalhe(true);
    setIsErrorDetalhe(false);

    try {
      const backendDispositivo = await getDispositivoById(id);
      const dispositivo = mapDispositivoToPhoneItem(backendDispositivo);

      if (lastRequestedIdRef.current === id) {
        setDispositivoDetalhado(dispositivo);
        return dispositivo;
      }
      return null;
    } catch (err) {
      if (lastRequestedIdRef.current === id) {
        setDispositivoDetalhado(null);
        setIsErrorDetalhe(true);
      }
      throw err;
    } finally {
      if (lastRequestedIdRef.current === id) {
        setIsLoadingDetalhe(false);
      }
    }
  }, []);

  const criar = useCallback(
    async (payload: Omit<PhoneItem, "id">) => {
      const novo = await criarDispositivo(payload);
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
      return novo;
    },
    [queryClient]
  );

  const atualizar = useCallback(
    async (id: string, payload: Omit<PhoneItem, "id">) => {
      const atualizado = await atualizarDispositivo(id, payload);
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
      setDispositivoDetalhado((current) =>
        current?.id === id ? atualizado : current
      );
      return atualizado;
    },
    [queryClient]
  );

  const excluir = useCallback(
    async (id: string) => {
      await excluirDispositivo(id);
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
      setDispositivoDetalhado((current) =>
        current?.id === id ? null : current
      );
    },
    [queryClient]
  );

  const handleSetCriterios = useCallback((payload: PesquisaConsolePayload) => {
    const generateRequestId = () => {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        return crypto.randomUUID();
      }
      return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    };

    const criteriosNormalizados = (payload.criterios ?? []).map((criterio) => ({
      tipo: criterio.tipo,
      descricao: criterio.descricao,
    }));
    const consoleInputNormalizado =
      typeof payload.consoleInput === "string" ? payload.consoleInput : "";
    const seletoresNormalizados: ConsoleSeletores = {};
    for (const key of SELECTOR_KEYS) {
      const valor = payload.seletores?.[key];
      if (typeof valor === "string" && valor.trim() !== "") {
        seletoresNormalizados[key] = valor;
      }
    }

    setPesquisaConsole({
      criterios: criteriosNormalizados,
      consoleInput: consoleInputNormalizado,
      seletores: seletoresNormalizados,
      requestId: generateRequestId(),
    });
    // Não precisamos setar isHydrated aqui pois já estará true
  }, []);

  return (
    <DispositivosContext.Provider
      value={{
        dispositivos,
        isLoading,
        isLoadingDetalhe,
        isError,
        isErrorDetalhe,
        criterios: pesquisaConsole.criterios,
        pesquisaConsole,
        dispositivoDetalhado,
        isHydrated,
        setCriterios: handleSetCriterios,
        refetchLista,
        criar,
        atualizar,
        excluir,
        obterDispositivoDetalhado,
      }}
    >
      {children}
    </DispositivosContext.Provider>
  );
}

export function useDispositivosContext() {
  return useContext(DispositivosContext);
}
