import { Prisma, Usuario } from "@prisma/client";
import { getFavoritosRanking } from "../favoritos/favorito.service";
import { CreateUsuarioDTO, UpdateUsuarioDTO } from "./user.types";
import { compare, genSalt, hash } from "bcryptjs";
import { SignUpDTO } from "../auth/auth.types";
import { prisma } from "../../database/prismaSingleton";

export const getUsuarioByUserName = async (
  username: string
): Promise<Usuario | null> => {
  return await prisma.usuario.findFirst({ where: { username } });
};

export const getUsuarioByEmail = async (
  email: string
): Promise<Usuario | null> => {
  return await prisma.usuario.findFirst({ where: { email } });
};

export const getUsuarioByCelular = async (
  celular: string
): Promise<Usuario | null> => {
  return await prisma.usuario.findFirst({ where: { celular } });
};

export const getUsuarioById = async (
  idUsuario: string
): Promise<Usuario | null> => {
  return await prisma.usuario.findFirst({ where: { idUsuario } });
};

export const getUsuarios = async (): Promise<Usuario[]> => {
  return await prisma.usuario.findMany();
};

export const createUsuario = async (
  user: CreateUsuarioDTO
): Promise<Usuario> => {
  const salt = await genSalt(parseInt(process.env.ROUNDS_BCRYPT!));
  const password = await hash(user.password, salt);
  return await prisma.usuario.create({
    data: { ...user, password, nascimento: new Date(user.nascimento) },
  });
};

export const getUsuario = async (
  idUsuario: string
): Promise<Usuario | null> => {
  return await prisma.usuario.findUnique({ where: { idUsuario } });
};

export const updateUsuario = async (
  idUsuario: string,
  user: UpdateUsuarioDTO
): Promise<Usuario | null> => {
  const dataToUpdate: any = { ...user };

  // garante que password nunca seja atualizado
  delete dataToUpdate.password;

  return await prisma.usuario.update({
    where: { idUsuario },
    data: dataToUpdate,
  });
};

export const deleteUsuario = async (idUsuario: string): Promise<boolean> => {
  const exists = await prisma.usuario.findUnique({ where: { idUsuario } });
  if (!exists) return false;
  await prisma.usuario.delete({ where: { idUsuario } });
  return true;
};

export const changePasswordUsuario = async (
  idUsuario: string,
  oldPwd: string,
  newPwd: string
): Promise<boolean> => {
  const user = await prisma.usuario.findFirst({ where: { idUsuario } });
  if (user) {
    const ok = await compare(oldPwd, user.password);
    if (ok) {
      const salt = await genSalt(parseInt(process.env.ROUNDS_BCRYPT!));
      const password = await hash(newPwd, salt);
      await prisma.usuario.update({
        where: { idUsuario },
        data: { password },
      });
      return true;
    }
  }
  return false;
};

export const getUsuariosMetrics = async () => {
  const [totalUsuarios, totalDispositivos, totalAdmins, totalSuporte] =
    await prisma.$transaction([
      prisma.usuario.count(),
      prisma.dispositivo.count(),
      prisma.usuario.count({
        where: { tipo: "0" },
      }),
      prisma.usuario.count({
        where: { tipo: "2" },
      }),
    ]);

  // Preços dos dispositivos
  const [precosAggregate, dispositivoMaisBarato, dispositivoMaisCaro] =
    await Promise.all([
      prisma.dispositivo.aggregate({
        _avg: { preco: true },
        _min: { preco: true },
        _max: { preco: true },
      }),
      prisma.dispositivo.findFirst({
        orderBy: { preco: "asc" },
        select: { modelo: true },
      }),
      prisma.dispositivo.findFirst({
        orderBy: { preco: "desc" },
        select: { modelo: true },
      }),
    ]);

  // Média dos preços dos dispositivos favoritados
  const favoritosComPreco = await prisma.favorito.findMany({
    include: {
      dispositivo: {
        select: { preco: true },
      },
    },
  });

  const precoMedioFavoritados =
    favoritosComPreco.length > 0
      ? favoritosComPreco.reduce(
          (acc, f) => acc + Number(f.dispositivo.preco),
          0
        ) / favoritosComPreco.length
      : 0;

  let timeline: { month: string; total: number }[] = [];

  try {
    const usuariosCriados = await prisma.usuario.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const monthlyMap = new Map<string, number>();

    usuariosCriados.forEach(({ createdAt }) => {
      if (!createdAt) return;
      const monthKey = createdAt.toISOString().slice(0, 7); // YYYY-MM
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + 1);
    });

    const sortedMonths = Array.from(monthlyMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    let cumulative = 0;
    timeline = sortedMonths.map(([month, count]) => {
      cumulative += count;
      return { month, total: cumulative };
    });
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientValidationError ||
        error instanceof Prisma.PrismaClientKnownRequestError
      )
    ) {
      throw error;
    }
    timeline = [];
  }

  const [topFavorites, bottomFavorites] = await Promise.all([
    getFavoritosRanking(10, "desc"),
    getFavoritosRanking(10, "asc"),
  ]);

  const historicosPesquisa = await prisma.historicoPesquisa.findMany({
    select: {
      idEvento: true,
      criterios: true,
      consoleInput: true,
      seletores: true,
      createdAt: true,
    },
  });

  const eventosPesquisa = await prisma.pesquisaEvento.findMany({
    select: {
      idEvento: true,
      idUsuario: true,
      textoLivre: true,
      selecionadosUi: true,
      criteriosGemini: true,
      criteriosUsados: true,
      createdAt: true,
    },
  });

  const normalizeCriterios = (value: Prisma.JsonValue | null | undefined) => {
    if (!Array.isArray(value)) return [];
    return (value as Prisma.JsonArray)
      .map((item) =>
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : null
      )
      .filter(Boolean) as { tipo?: unknown; descricao?: unknown }[];
  };

  const normalizeSeletores = (value: Prisma.JsonValue | null | undefined) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  };

  type RegistroPesquisa = {
    createdAt: Date | null;
    criterios: { tipo?: unknown; descricao?: unknown }[];
    seletores: Record<string, unknown>;
    consoleInput: string;
  };

  const historicoEventIds = new Set(
    historicosPesquisa
      .map((hist) => hist.idEvento)
      .filter((value): value is string => Boolean(value))
  );

  const registrosPesquisa: RegistroPesquisa[] = [
    ...historicosPesquisa.map((historico) => ({
      createdAt: historico.createdAt,
      criterios: normalizeCriterios(historico.criterios),
      seletores: normalizeSeletores(historico.seletores),
      consoleInput:
        typeof historico.consoleInput === "string"
          ? historico.consoleInput
          : "",
    })),
    ...eventosPesquisa
      .filter((evento) => !historicoEventIds.has(evento.idEvento ?? ""))
      .map((evento) => {
        const criteriosUsados = normalizeCriterios(evento.criteriosUsados);
        const criteriosFallback = normalizeCriterios(evento.criteriosGemini);
        return {
          createdAt: evento.createdAt,
          criterios: criteriosUsados.length ? criteriosUsados : criteriosFallback,
          seletores: normalizeSeletores(evento.selecionadosUi),
          consoleInput:
            typeof evento.textoLivre === "string" ? evento.textoLivre : "",
        };
      }),
  ];

  const selectorKeyMapping = {
    ram: "ram",
    rom: "rom",
    battery: "battery",
    main_camera: "camera",
    benchmark: "benchmark",
    price_range: "price_range",
  } as const;

  const selectorAliases: Record<keyof typeof selectorKeyMapping, string[]> = {
    ram: [],
    rom: [],
    battery: [],
    main_camera: ["camera"],
    benchmark: ["bench", "benchmark_score"],
    price_range: ["preco_intervalo", "preco", "price", "price_range"],
  };

  type SelectorInternalKey = keyof typeof selectorKeyMapping;
  type SelectorExternalKey = (typeof selectorKeyMapping)[SelectorInternalKey];

  const selectorKeys = Object.keys(selectorKeyMapping) as SelectorInternalKey[];

  const selectorCounts: Record<
    SelectorInternalKey,
    Map<string, number>
  > = selectorKeys.reduce((acc, key) => {
    acc[key] = new Map<string, number>();
    return acc;
  }, {} as Record<SelectorInternalKey, Map<string, number>>);

  const selectorTimelineMap: Record<
    SelectorInternalKey,
    Map<string, Map<string, number>>
  > = selectorKeys.reduce((acc, key) => {
    acc[key] = new Map<string, Map<string, number>>();
    return acc;
  }, {} as Record<SelectorInternalKey, Map<string, Map<string, number>>>);

  const priceRangeCounts = new Map<string, number>();

  const getSelectorValue = (
    key: SelectorInternalKey,
    seletoresJson: Record<string, unknown>,
    criteriosNormalizados: { tipo?: unknown; descricao?: unknown }[]
  ): string | null => {
    const aliases = selectorAliases[key] ?? [];
    const rawCandidate = [seletoresJson[key], ...aliases.map((alias) => seletoresJson[alias])].find(
      (value) => value !== undefined && value !== null
    );

    if (typeof rawCandidate === "string" && rawCandidate.trim() !== "") {
      return rawCandidate.trim();
    }
    if (typeof rawCandidate === "number") {
      return String(rawCandidate);
    }

    const criterioCorrespondente = criteriosNormalizados.find((criterio) => {
      if (typeof criterio?.tipo !== "string") return false;
      const tipoLower = criterio.tipo.toLowerCase();
      return (
        tipoLower === key ||
        aliases.some((alias) => alias.toLowerCase() === tipoLower) ||
        (key === "main_camera" && tipoLower === "camera")
      );
    });

    if (!criterioCorrespondente) return null;

    if (
      typeof criterioCorrespondente.descricao === "string" &&
      criterioCorrespondente.descricao.trim() !== ""
    ) {
      return criterioCorrespondente.descricao.trim();
    }
    if (typeof criterioCorrespondente.descricao === "number") {
      return String(criterioCorrespondente.descricao);
    }

    return null;
  };

  let textOnly = 0;
  let selectorsOnly = 0;
  let textAndSelectors = 0;

  for (const registro of registrosPesquisa) {
    const criteriosNormalizados = registro.criterios;

    const seletoresJson = registro.seletores;

    let hasSelector = false;

    const monthKey =
      registro.createdAt instanceof Date
        ? registro.createdAt.toISOString().slice(0, 7)
        : new Date().toISOString().slice(0, 7);

    for (const key of selectorKeys) {
      const valor = getSelectorValue(key, seletoresJson, criteriosNormalizados);

      if (!valor) continue;

      hasSelector = true;
      const current = selectorCounts[key].get(valor) ?? 0;
      selectorCounts[key].set(valor, current + 1);

      if (key === "price_range") {
        const currentRangeCount = priceRangeCounts.get(valor) ?? 0;
        priceRangeCounts.set(valor, currentRangeCount + 1);
      }

      const monthMap =
        selectorTimelineMap[key].get(monthKey) ?? new Map<string, number>();
      monthMap.set(valor, (monthMap.get(valor) ?? 0) + 1);
      selectorTimelineMap[key].set(monthKey, monthMap);
    }

    const textoLivre =
      typeof registro.consoleInput === "string" &&
      registro.consoleInput.trim().length
        ? registro.consoleInput.trim()
        : (() => {
            const criterioTexto = criteriosNormalizados.find(
              (criterio) =>
                typeof criterio?.tipo === "string" &&
                criterio.tipo === "texto_livre"
            );
            if (!criterioTexto) return "";
            const descricao = criterioTexto.descricao;
            if (typeof descricao === "string") {
              return descricao.trim();
            }
            if (typeof descricao === "number") {
              return String(descricao);
            }
            return "";
          })();

    const hasText = Boolean(textoLivre && textoLivre.length > 0);

    if (hasText && hasSelector) {
      textAndSelectors += 1;
    } else if (hasText) {
      textOnly += 1;
    } else if (hasSelector) {
      selectorsOnly += 1;
    }
  }

  const totalSearches = registrosPesquisa.length;
  const withText = textOnly + textAndSelectors;
  const withoutText = totalSearches - withText;

  const selectorStats = selectorKeys.reduce((acc, key) => {
    const entries = Array.from(selectorCounts[key].entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
    const externalKey = selectorKeyMapping[key];
    acc[externalKey] = entries;
    return acc;
  }, {} as Record<SelectorExternalKey, { value: string; count: number }[]>);

  const priceRangeStats = Array.from(priceRangeCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const selectorTimeline = selectorKeys.reduce((acc, key) => {
    const monthEntries = Array.from(selectorTimelineMap[key].entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, valueMap]) => ({
        month,
        counts: Array.from(valueMap.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
      }));
    const externalKey = selectorKeyMapping[key];
    acc[externalKey] = monthEntries;
    return acc;
  }, {} as Record<SelectorExternalKey, { month: string; counts: { value: string; count: number }[] }[]>);

  return {
    totals: {
      usuarios: totalUsuarios,
      dispositivos: totalDispositivos,
      admins: totalAdmins,
      suporte: totalSuporte,
    },
    precos: {
      medio: precosAggregate._avg.preco ?? 0,
      minimo: precosAggregate._min.preco ?? 0,
      maximo: precosAggregate._max.preco ?? 0,
      dispositivoMaisBarato: dispositivoMaisBarato?.modelo ?? null,
      dispositivoMaisCaro: dispositivoMaisCaro?.modelo ?? null,
    },
    precosFavoritos: {
      medio: precoMedioFavoritados,
    },

    timeline,
    favorites: {
      top: topFavorites,
      bottom: bottomFavorites,
    },
    searches: {
      total: totalSearches,
      withText,
      withoutText,
      textOnly,
      selectorsOnly,
      textAndSelectors,
    },
    selectorStats,
    selectorTimeline,
    priceRangeStats,
  };
};
