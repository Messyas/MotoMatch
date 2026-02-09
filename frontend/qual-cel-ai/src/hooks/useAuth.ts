"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { backApi } from "../services/api";
import { UserAuth } from "../types/user";
import axios from "axios";

export function useAuth() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserAuth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await backApi.get<UserAuth>("/auth/me", {
        headers: { "Cache-Control": "no-cache" },
        withCredentials: true,
      });

      setUser(res.data);
    } catch (err: unknown) {
      if (
        !(
          axios.isAxiosError(err) &&
          [401, 403].includes(err.response?.status ?? 0)
        )
      ) {
        console.error("Erro ao buscar usuário:", err);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // não faz fetch se estiver em login ou cadastro
    if (pathname !== "/login" && pathname !== "/cadastro") {
      fetchUser();
    } else {
      setLoading(false);
      setUser(null);
    }
  }, [fetchUser, pathname]);

  const logout = useCallback(async () => {
    try {
      await backApi.post("/auth/logout", {}, { withCredentials: true });
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const refreshUser = useCallback(() => fetchUser(), [fetchUser]);

  return { user, loading, logout, refreshUser };
}
