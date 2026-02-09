import MockAdapter from "axios-mock-adapter";
import { backApi } from "@/services/api";

export const mockAxios = new MockAdapter(backApi);
