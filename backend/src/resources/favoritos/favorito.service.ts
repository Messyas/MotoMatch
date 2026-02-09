import { prisma } from "../../database/prismaSingleton";

export async function adicionarFavorito(
  idUsuario: string,
  idDispositivo: string,
  idHistorico: string
) {
  return await prisma.favorito.create({
    data: { idUsuario, idDispositivo, idHistorico },
    include: {
      dispositivo: {
        include: {
          caracteristicas: {
            include: {
              caracteristica: true,
            },
          },
        },
      },
      historico: {
        select: {
          idHistorico: true,
          criterios: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function listarFavoritos(idUsuario: string) {
  return await prisma.favorito.findMany({
    where: { idUsuario },
    include: {
      dispositivo: {
        include: {
          caracteristicas: {
            include: {
              caracteristica: true,
            },
          },
        },
      },
      historico: {
        select: {
          idHistorico: true,
          criterios: true,
          createdAt: true,
        },
      },
    },
    orderBy: { idFavorito: "desc" },
  });
}

export async function removerFavorito(
  idUsuario: string,
  idDispositivo: string
) {
  return await prisma.favorito.delete({
    where: {
      idUsuario_idDispositivo: { idUsuario, idDispositivo },
    },
  });
}

export async function getFavoritosRanking(
  limit: number,
  order: "asc" | "desc"
) {
  const grouped = await prisma.favorito.groupBy({
    by: ["idDispositivo"],
    _count: {
      idFavorito: true,
    },
    orderBy: {
      _count: {
        idFavorito: order,
      },
    },
    take: limit,
  });

  if (!grouped.length) {
    return [];
  }

  const dispositivos = await prisma.dispositivo.findMany({
    where: {
      idDispositivo: {
        in: grouped.map((item) => item.idDispositivo),
      },
    },
    select: {
      idDispositivo: true,
      fabricante: true,
      modelo: true,
    },
  });

  const dispositivoMap = new Map(
    dispositivos.map((device) => [device.idDispositivo, device])
  );

  return grouped.map((item) => {
    const device = dispositivoMap.get(item.idDispositivo);
    const title = device
      ? `${device.fabricante} ${device.modelo}`.trim()
      : "Dispositivo desconhecido";
    return {
      dispositivoId: item.idDispositivo,
      title,
      favorites: item._count.idFavorito,
    };
  });
}
