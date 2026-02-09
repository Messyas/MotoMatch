import axios from "axios";

export const backApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

backApi.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      // Apenas rejeita o erro, o front já vai tratar
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);
