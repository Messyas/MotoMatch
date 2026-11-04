import { backApi } from "./api";
import type { BackendDispositivo } from "@/types/phones"; 

export async function getDispositivoById(id: string): Promise<BackendDispositivo> {
  try {
    const response = await backApi.get<BackendDispositivo>(`/dispositivos/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar dispositivo com ID ${id}:`, error);
    throw new Error("Dispositivo não encontrado na API.");
  }
}