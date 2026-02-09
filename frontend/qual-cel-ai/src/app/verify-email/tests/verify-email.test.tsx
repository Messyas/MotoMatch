import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerifyEmailPage from "../verifyEmailPage";
import { mockAxios } from "@/tests/mocks/axios";
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

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockPush.mockReset();
    mockSearchParamsGet.mockReset();
  });

  it("Deve exibir mensagem de token inválido quando não houver token na URL", async () => {
    mockSearchParamsGet.mockReturnValue(null);

    render(<VerifyEmailPage />);

    expect(
      await screen.findByText(/Token de verificação inválido/i)
    ).toBeInTheDocument();
  });

  it("Deve confirmar o e-mail quando o token é válido", async () => {
    mockSearchParamsGet.mockReturnValue("token-sucesso");

    mockAxios.onGet("/auth/verify-email").reply((config: AxiosRequestConfig) => {
      expect(config.params?.token).toBe("token-sucesso");
      return [
        200,
        {
          status: "success",
          message: "E-mail verificado com sucesso.",
        },
      ];
    });

    render(<VerifyEmailPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(
        screen.getByText(/E-mail verificado com sucesso\./i)
      ).toBeInTheDocument();
    });

    const loginButton = screen.getByRole("button", {
      name: /ir para a tela de login/i,
    });
    await user.click(loginButton);
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("Deve informar quando o token estiver expirado", async () => {
    mockSearchParamsGet.mockReturnValue("token-expirado");

    mockAxios.onGet("/auth/verify-email").reply(410, {
      status: "expired",
      message: "O link de verificação expirou. Solicite um novo e-mail.",
    });

    render(<VerifyEmailPage />);

    expect(
      await screen.findByText(
        /O link de verificação expirou. Solicite um novo e-mail./i
      )
    ).toBeInTheDocument();
  });
});
