import { Dispositivo } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export type DispositivoComCaracteristicas = Dispositivo & {
  caracteristicas?: {
    caracteristica: {
      tipo: string;
      descricao: string;
    };
  }[];
};

export const mockDispositivos: DispositivoComCaracteristicas[] = [
  {
    idDispositivo: "a1b2c3",
    fabricante: "Motorola",
    modelo: "Moto G84",
    preco: new Decimal(1399.00), // Campo adicionado
    photos: null,
    createdAt: new Date("2023-09-01T10:00:00.000Z"),
    updatedAt: new Date("2023-09-01T10:00:00.000Z"),
    caracteristicas: [
      { caracteristica: { tipo: "ram", descricao: "8" } },
      { caracteristica: { tipo: "battery", descricao: "5000" } },
    ],
  },
  {
    idDispositivo: "d4e5f6",
    fabricante: "Motorola",
    modelo: "Edge 40 Neo",
    preco: new Decimal(2199.90), // Campo adicionado
    photos: null,
    createdAt: new Date("2023-09-15T10:00:00.000Z"),
    updatedAt: new Date("2023-09-15T10:00:00.000Z"),
    caracteristicas: [
      { caracteristica: { tipo: "ram", descricao: "8" } },
      { caracteristica: { tipo: "battery", descricao: "5000" } },
    ],
  },
];

export const newDispositivoMock: Omit<
  Dispositivo,
  "idDispositivo" | "createdAt" | "updatedAt"
> & {
  caracteristicas: { tipo: string; descricao: string }[];
} = {
  fabricante: "Motorola",
  modelo: "Razr 40 Ultra",
  preco: new Decimal(4999.00), // Campo adicionado
  photos: null,
  caracteristicas: [
    { tipo: "ram", descricao: "12" },
    { tipo: "battery", descricao: "3800" },
  ],
};