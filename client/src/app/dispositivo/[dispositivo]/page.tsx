"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { PageStatusWrapper } from "@/components/dispositivo/pageStatus/PageStatusWrapper";
import { DispositivoDetalhesView } from "./_components/DispositivoDetalhesView";
import { useDevice } from "@/hooks/useDevice";

export default function DispositivoDetalhes() {
  const params = useParams<{ dispositivo: string }>();
  const id = Array.isArray(params?.dispositivo)
    ? params.dispositivo[0]
    : params?.dispositivo;

  const { loading, errorDetalhe, getById, fetchDetail, dispositivoDetalhado } =
    useDevice();

  const item = (id ? getById(id) : null) || dispositivoDetalhado;

  useEffect(() => {
    // MUDANÇA CRÍTICA:
    // A condição agora é: "Se temos um ID E (não temos um item OU o item que temos é do ID errado)"
    if (id && (!item || item.id !== id)) {
      // E também garantimos que não estamos no meio de outro carregamento
      if (!loading) {
        fetchDetail(id).catch(() => {});
      }
    }
  }, [id, item, loading, fetchDetail]); // As dependências continuam as mesmas

  // A lógica de 'aindaCarregando' está correta e ajuda a evitar piscar a tela com dados antigos
  const aindaCarregando = loading && (!item || item.id !== id);

  return (
    <PageStatusWrapper
      isLoading={aindaCarregando}
      isError={errorDetalhe}
      dispositivo={item} // Passar o 'item' diretamente é mais seguro
    >
      {/* Renderiza a view apenas se o item existir E não estivermos carregando a nova versão */}
      {item && !aindaCarregando ? (
        <DispositivoDetalhesView dispositivo={item} />
      ) : null}
    </PageStatusWrapper>
  );
}
