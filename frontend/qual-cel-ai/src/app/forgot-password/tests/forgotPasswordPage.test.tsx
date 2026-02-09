import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordModal from "../forgotPasswordPage";
import { backApi } from "@/services/api";
import { toast } from "sonner";
import { AxiosError } from "axios";

jest.mock("@/services/api", () => ({
  backApi: { post: jest.fn() },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("ForgotPasswordModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Não renderiza se isOpen for false", () => {
    render(<ForgotPasswordModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByText(/Recuperar senha/i)).toBeNull();
  });

  it("Renderiza e foca no input quando aberto", async () => {
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);

    // espera pelo foco após setTimeout do useEffect
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("Botão está desabilitado para e-mail inválido", async () => {
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);
    const button = screen.getByRole("button", { name: /enviar/i });
    const user = userEvent.setup();

    await user.type(input, "email-invalido");

    expect(button).toBeDisabled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("Envia e-mail com sucesso e inicia countdown", async () => {
    (backApi.post as jest.Mock).mockResolvedValueOnce({
      data: { message: "E-mail enviado com sucesso" },
    });

    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);
    const button = screen.getByRole("button", { name: /enviar/i });
    const user = userEvent.setup();

    await user.type(input, "teste@dominio.com");
    await user.click(button);

    await waitFor(() => {
      expect(backApi.post).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "teste@dominio.com",
      });
      expect(toast.success).toHaveBeenCalledWith("E-mail enviado com sucesso");
      expect(button).toBeDisabled();
      expect(button.textContent).toMatch(/Aguarde 60s/);
    });
  });

  it("Mostra erro genérico ao falhar no envio", async () => {
    (backApi.post as jest.Mock).mockRejectedValueOnce(new Error("Falha"));

    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);
    const button = screen.getByRole("button", { name: /enviar/i });
    const user = userEvent.setup();

    await user.type(input, "teste@dominio.com");
    await user.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao solicitar redefinição de senha."
      );
    });
  });

  it("Mostra mensagem de erro específica do Axios", async () => {
    const axiosError = Object.setPrototypeOf(
      { response: { data: { message: "Erro específico" } } },
      AxiosError.prototype
    ) as AxiosError;

    (backApi.post as jest.Mock).mockRejectedValueOnce(axiosError);

    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);
    const button = screen.getByRole("button", { name: /enviar/i });
    const user = userEvent.setup();

    await user.type(input, "teste@dominio.com");
    await user.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro específico");
    });
  });

  it("Chama onClose quando clica em cancelar", async () => {
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);
    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    const user = userEvent.setup();

    await user.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });
});
