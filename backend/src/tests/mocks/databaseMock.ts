import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

import { prisma } from "../../database/prismaSingleton";

jest.mock("../../database/prismaSingleton", () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

// Cria o mock tipado
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

// Reseta o mock antes de cada teste
beforeEach(() => {
  mockReset(prismaMock);
});
