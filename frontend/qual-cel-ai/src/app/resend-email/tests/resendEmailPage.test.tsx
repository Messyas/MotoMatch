import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResendEmail from "../resendEmailPage";
import { backApi } from "@/services/api";
import { toast } from "sonner";
import { AxiosError } from "axios";

jest.mock("@/services/api", () => ({
  backApi: { post: jest.fn() },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("ResendEmail", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Não renderiza se isOpen for false", () => {
    render(<ResendEmail isOpen={false} onClose={onClose} />);
    expect(screen.queryByText(/Reenviar e-mail de verificação/i)).toBeNull();
  });

  it("Renderiza e foca no input quando aberto", async () => {
    render(<ResendEmail isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);

    // Espera pelo foco após o setTimeout interno
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("Botão está desabilitado para e-mail inválido", async () => {
    render(<ResendEmail isOpen={true} onClose={onClose} />);
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);
    const button = screen.getByRole("button", { name: /reenviar/i });

    await user.type(input, "email-invalido");

    expect(button).toBeDisabled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("Envia e-mail com sucesso e inicia countdown", async () => {
    (backApi.post as jest.Mock).mockResolvedValueOnce({});
    render(<ResendEmail isOpen={true} onClose={onClose} />);
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);
    const button = screen.getByRole("button", { name: /reenviar/i });

    await user.type(input, "teste@dominio.com");
    await user.click(button);

    await waitFor(() => {
      expect(backApi.post).toHaveBeenCalledWith(
        "/auth/resend-verification-email",
        { email: "teste@dominio.com" }
      );
      expect(toast.success).toHaveBeenCalledWith(
        "E-mail de verificação enviado!"
      );
      expect(button).toBeDisabled();
      expect(button.textContent).toMatch(/Aguarde 60s/);
    });
  });

  it("Mostra erro genérico ao falhar no envio", async () => {
    (backApi.post as jest.Mock).mockRejectedValueOnce(new Error("Falha"));
    render(<ResendEmail isOpen={true} onClose={onClose} />);
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);
    const button = screen.getByRole("button", { name: /reenviar/i });

    await user.type(input, "teste@dominio.com");
    await user.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro ao enviar e-mail.");
    });
  });

  it("Mostra mensagem de erro específica do Axios", async () => {
    const axiosError = Object.setPrototypeOf(
      { response: { data: { message: "Erro específico" } } },
      AxiosError.prototype
    ) as AxiosError;

    (backApi.post as jest.Mock).mockRejectedValueOnce(axiosError);
    render(<ResendEmail isOpen={true} onClose={onClose} />);
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Digite seu e-mail/i);
    const button = screen.getByRole("button", { name: /reenviar/i });

    await user.type(input, "teste@dominio.com");
    await user.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro específico");
    });
  });

  it("Chama onClose quando clica em cancelar", async () => {
    render(<ResendEmail isOpen={true} onClose={onClose} />);
    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    const user = userEvent.setup();

    await user.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });
});
