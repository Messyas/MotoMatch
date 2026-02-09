import { backApi } from "./api";
import type { AdminOverviewMetrics } from "@/types/admin";

export async function getAdminOverview(): Promise<AdminOverviewMetrics> {
  const { data } = await backApi.get<AdminOverviewMetrics>(
    "/users/metrics/overview",
    {
      withCredentials: true,
    }
  );
  return data;
}

