import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prismaSingleton";
import axios, { AxiosError, AxiosResponse } from "axios";

import {
  CreateDispositivoDTO,
  PesquisaDispositivoDTO,
  CriterioPesquisa,
  GenerateContentResponse,
  PesquisaConsoleMetadata,
  ChatMsg,
  SeletoresPesquisa
} from "../dispositivo/dispositivo.types";
import { salvarHistorico } from "../historico/historico.service";
import { getMatchingFacade } from "./services/matching.facade";
import { conversationalFacade } from "./services/conversational.facade";

const allowedTypes = [
  "ram",
  "rom",
  "battery",
  "benchmark",
  "screen_size",
  "main_camera",
  "secondary_camera",
  "tertiary_camera",
  "front_camera",
  "refresh_rate",
  "processor",
  "preco_intervalo",
];


/**
 * Retorna todos os dispositivos cadastrados,
 * já trazendo as características relacionadas.
 */

export async function getAllDispositivos() {
  return await prisma.dispositivo.findMany({
    include: {
      caracteristicas: {
        include: {
          caracteristica: true,
        },
      },
    },
  });
}

export async function createDispositivo(dispositivo: CreateDispositivoDTO) {
  // 1. Checa se dispositivo já existe
  const existente = await prisma.dispositivo.findFirst({
    where: {
      fabricante: dispositivo.fabricante,
      modelo: dispositivo.modelo,
      preco: dispositivo.preco,
    },
  });
  if (existente) {
    throw new Error("Dispositivo já existe.");
  }

  // 2. Resolve todas as características (cria se não existir)
  const caracteristicas = [];
  for (const c of dispositivo.caracteristicas ?? []) {
    const caracteristica = await prisma.caracteristica.upsert({
      where: {
        tipo_descricao: {
          tipo: c.tipo,
          descricao: c.descricao,
        },
      },
      update: {},
      create: {
        tipo: c.tipo,
        descricao: c.descricao,
      },
    });
    caracteristicas.push({ idCaracteristica: caracteristica.idCaracteristica });
  }

  // 3. Cria o dispositivo com as relações
  return await prisma.dispositivo.create({
    data: {
      fabricante: dispositivo.fabricante,
      modelo: dispositivo.modelo,
      photos: dispositivo.photos as Prisma.InputJsonValue,
      preco: dispositivo.preco,
      caracteristicas: {
        create: caracteristicas,
      },
    },
    include: {
      caracteristicas: {
        include: {
          caracteristica: true,
        },
      },
    },
  });
}

/**
 * Busca um dispositivo específico pelo ID,
 * incluindo suas características.
 */

export async function getDispositivoById(id: string) {
  return await prisma.dispositivo.findUnique({
    where: { idDispositivo: id },
    include: {
      caracteristicas: {
        include: {
          caracteristica: true,
        },
      },
    },
  });
}

/**
 * Atualiza os dados de um dispositivo existente.
 * Se vierem novas características → apaga todas as antigas e recria.
 */

export async function updateDispositivo(
  id: string,
  data: Partial<CreateDispositivoDTO>
) {
  return await prisma.dispositivo
    .update({
      where: { idDispositivo: id },
      data: {
        fabricante: data.fabricante,
        modelo: data.modelo,
        photos: data.photos as Prisma.InputJsonValue,
        preco: data.preco,
        caracteristicas: data.caracteristicas
          ? {
              deleteMany: {},
              create: await Promise.all(
                data.caracteristicas.map(async (c) => {
                  const caracteristica = await prisma.caracteristica.upsert({
                    where: {
                      tipo_descricao: {
                        tipo: c.tipo,
                        descricao: c.descricao,
                      },
                    },
                    update: {},
                    create: {
                      tipo: c.tipo,
                      descricao: c.descricao,
                    },
                  });
                  return { idCaracteristica: caracteristica.idCaracteristica };
                })
              ),
            }
          : undefined,
      },
      include: {
        caracteristicas: {
          include: {
            caracteristica: true,
          },
        },
      },
    })
    .catch(() => null);
}

/**
 * Remove um dispositivo pelo ID.
 * Retorna true se removeu, false se não encontrou.
 */

export async function deleteDispositivo(id: string): Promise<boolean> {
  try {
    await prisma.dispositivo.delete({
      where: { idDispositivo: id },
    });
    return true;
  } catch (err) {
    console.error("Erro ao deletar dispositivo:", err);
    return false;
  }
}

async function runWithLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit = 10
): Promise<T[]> {
  const results: T[] = [];
  const running: Promise<void>[] = [];
  let i = 0;

  async function runNext(): Promise<void> {
    if (i >= tasks.length) return;
    const index = i++;
    const task = tasks[index];
    try {
      const res = await task();
      results[index] = res;
    } finally {
      await runNext();
    }
  }

  for (let j = 0; j < Math.min(limit, tasks.length); j++) {
    running.push(runNext());
  }

  await Promise.all(running);
  return results.filter((value) => value !== undefined && value !== null);
}

export async function createManyDispositivos(
  dispositivos: CreateDispositivoDTO[]
) {
  if (!dispositivos?.length) return [];

  // --- 0. Deduplicar payload
  const seen = new Set<string>();
  for (const d of dispositivos) {
    const key = `${d.fabricante.trim()}||${d.modelo.trim()}`;
    if (seen.has(key)) {
      throw new Error(`Payload contém duplicado: ${d.fabricante} ${d.modelo}`);
    }
    seen.add(key);
  }

  // --- 1. Buscar dispositivos existentes (1 query)
  const existentes = await prisma.dispositivo.findMany({
    where: {
      OR: dispositivos.map((d) => ({
        fabricante: d.fabricante,
        modelo: d.modelo,
      })),
    },
    select: { fabricante: true, modelo: true },
  });

  const existentesSet = new Set(
    existentes.map((e) => `${e.fabricante}||${e.modelo}`)
  );

  const novos = dispositivos.filter(
    (d) => !existentesSet.has(`${d.fabricante}||${d.modelo}`)
  );
  if (!novos.length) return [];

  // --- 2. Resolver características únicas
  const allCaracteristicas = novos.flatMap((d) => d.caracteristicas ?? []);
  const uniqueCaracts = [
    ...new Map(
      allCaracteristicas.map((c) => [`${c.tipo}||${c.descricao}`, c])
    ).values(),
  ];

  // Buscar existentes
  const existentesCaracts = await prisma.caracteristica.findMany({
    where: {
      OR: uniqueCaracts.map((c) => ({
        tipo: c.tipo,
        descricao: c.descricao,
      })),
    },
    select: { idCaracteristica: true, tipo: true, descricao: true },
  });

  const mapCaracts = new Map(
    existentesCaracts.map((c) => [
      `${c.tipo}||${c.descricao}`,
      c.idCaracteristica,
    ])
  );

  // --- 2.1 Criar os que faltam (sem p-limit)
  const toCreate = uniqueCaracts.filter(
    (c) => !mapCaracts.has(`${c.tipo}||${c.descricao}`)
  );

  const novasCaracts = await runWithLimit(
    toCreate.map(
      (c) => async () =>
        prisma.caracteristica.create({
          data: { tipo: c.tipo, descricao: c.descricao },
        })
    ),
    10 // limite de concorrência
  );

  for (const c of novasCaracts) {
    mapCaracts.set(`${c.tipo}||${c.descricao}`, c.idCaracteristica);
  }

  // --- 3. Inserir dispositivos (em lote)
  await prisma.dispositivo.createMany({
    data: novos.map((d) => ({
      fabricante: d.fabricante,
      modelo: d.modelo,
      photos: d.photos as Prisma.InputJsonValue,
      preco: d.preco,
    })),
    skipDuplicates: true,
  });

  // --- 4. Re-buscar dispositivos criados pra vincular características
  const criados = await prisma.dispositivo.findMany({
    where: {
      OR: novos.map((d) => ({
        fabricante: d.fabricante,
        modelo: d.modelo,
      })),
    },
    select: { idDispositivo: true, fabricante: true, modelo: true },
  });

  const mapDisps = new Map(
    criados.map((d) => [`${d.fabricante}||${d.modelo}`, d.idDispositivo])
  );

  // --- 5. Vincular características (createMany)
  const vinculos = novos.flatMap((d) =>
    (d.caracteristicas ?? []).map((c) => ({
      idDispositivo: mapDisps.get(`${d.fabricante}||${d.modelo}`)!,
      idCaracteristica: mapCaracts.get(`${c.tipo}||${c.descricao}`)!,
    }))
  );

  await prisma.caracteristicaDispositivo.createMany({
    data: vinculos,
    skipDuplicates: true,
  });

  // --- 6. Retornar com include opcional
  return prisma.dispositivo.findMany({
    where: {
      idDispositivo: { in: Array.from(mapDisps.values()) },
    },
    include: {
      caracteristicas: {
        include: {
          caracteristica: true,
        },
      },
    },
  });
}

export async function findMatchingDispositivos(
  criterios: PesquisaDispositivoDTO["caracteristicas"],
  idUsuario?: string,
  metadata?: PesquisaConsoleMetadata
) {
  if (!criterios || criterios.length === 0) {
    console.warn(
      "[findMatchingDispositivos] Nenhum critério estruturado disponível; retornando lista vazia."
    );
    return [];
  }

  return getMatchingFacade().findMatchingDispositivos(
    criterios,
    idUsuario,
    metadata
  );
}


export async function orquestrarPesquisaConversacional(
  historicoConversa: ChatMsg[],
  filtrosSelecionados: SeletoresPesquisa,
  idUsuario: string | undefined
) {
  return conversationalFacade.orquestrarPesquisaConversacional(
    historicoConversa,
    filtrosSelecionados,
    idUsuario
  );
}
