import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "../resetPasswordPage";
import { mockAxios } from "@/tests/mocks/axios";
import { toast } from "sonner";
import type { AxiosRequestConfig } from "axios";

const mockPush = jest.fn();
const mockSearchParamsGet = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockPush.mockReset();
    mockSearchParamsGet.mockReset();
    (toast.success as jest.Mock).mockReset();
    (toast.error as jest.Mock).mockReset();
  });

  it("Redefine senha com sucesso", async () => {
    mockSearchParamsGet.mockReturnValue("token-sucesso");
    mockAxios
      .onPost("/auth/reset-password?token=token-sucesso")
      .reply((config: AxiosRequestConfig) => {
        const data = JSON.parse(config.data);
        expect(data.password).toBe("novaSenha123");
        return [200, { message: "Senha redefinida com sucesso!" }];
      });

    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText(/nova senha/i);
    await user.type(passwordInput, "novaSenha123");

    const submitButton = screen.getByRole("button", {
      name: /redefinir senha/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Senha redefinida com sucesso!"
      );
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("Mostra erro de campo específico", async () => {
    mockSearchParamsGet.mockReturnValue("token-erro");
    mockAxios.onPost("/auth/reset-password?token=token-erro").reply(400, {
      fieldErrors: { password: "Senha muito curta" },
    });

    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText(/nova senha/i);
    await user.type(passwordInput, "123");

    const submitButton = screen.getByRole("button", {
      name: /redefinir senha/i,
    });
    await user.click(submitButton);

    expect(await screen.findByText("Senha muito curta")).toBeInTheDocument();
  });

  it("Mostra mensagem genérica de erro", async () => {
    mockSearchParamsGet.mockReturnValue("token-erro-geral");
    mockAxios.onPost("/auth/reset-password?token=token-erro-geral").reply(500);

    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText(/nova senha/i);
    await user.type(passwordInput, "senha123");

    const submitButton = screen.getByRole("button", {
      name: /redefinir senha/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro ao redefinir senha.");
    });
  });
});
