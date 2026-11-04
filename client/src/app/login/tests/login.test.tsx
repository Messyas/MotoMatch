import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "../_components/loginPage";
import { mockAxios } from "@/tests/mocks/axios";
import { mockUsers } from "@/tests/mocks/usuarios";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
  },
}));

describe("Login Component", () => {
  const mockRefreshUser = jest.fn();

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      refreshUser: mockRefreshUser,
    });
    jest.clearAllMocks();
    mockAxios.reset();
    (toast.success as jest.Mock).mockClear();
  });

  it("Deve renderizar todos os campos e botão", () => {
    render(<Login />);

    const usernameInput = screen.getByLabelText(/nome de usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i, {
      selector: "input",
    });
    const submitButton = screen.getByRole("button", { name: /^entrar$/i });
    const signupText = screen.getByText(/não tem uma conta\?/i);

    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
    expect(signupText).toBeInTheDocument();
  });

  it("Deve permitir digitar nos campos usando mockUsers", async () => {
    render(<Login />);
    const user = userEvent.setup();

    const usernameInput = screen.getByLabelText(/nome de usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i, {
      selector: "input",
    });

    const mockUser = mockUsers[0];
    await user.type(usernameInput, mockUser.username);
    await user.type(passwordInput, mockUser.password);

    expect(usernameInput).toHaveValue(mockUser.username);
    expect(passwordInput).toHaveValue(mockUser.password);
  });

  it("Deve exibir erro quando credenciais são inválidas", async () => {
    mockAxios.onPost("/auth/login").reply(401, { message: "Unauthorized" });

    render(<Login />);
    const user = userEvent.setup();

    const usernameInput = screen.getByLabelText(/nome de usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i, {
      selector: "input",
    });
    const submitButton = screen.getByRole("button", { name: /^entrar$/i });

    await user.type(usernameInput, "usuarioErrado");
    await user.type(passwordInput, "senhaErrada");
    await user.click(submitButton);

    await waitFor(() => {
      const errorMsg = screen.getByText(
        /nome de usuário e\/ou senha incorreta/i
      );
      expect(errorMsg).toBeInTheDocument();
    });
  });

  it("Deve redirecionar e chamar refreshUser em login bem-sucedido", async () => {
    mockAxios.onPost("/auth/login").reply(200, { user: mockUsers[0] });

    render(<Login />);
    const user = userEvent.setup();

    const usernameInput = screen.getByLabelText(/nome de usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i, {
      selector: "input",
    });
    const submitButton = screen.getByRole("button", { name: /^entrar$/i });

    await user.type(usernameInput, mockUsers[0].username);
    await user.type(passwordInput, mockUsers[0].password);
    await user.click(submitButton);

    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalled(); // ✅ verifica redirecionamento
  });

  it("Deve mostrar estado de loading durante submit", async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    mockAxios.onPost("/auth/login").reply(() => {
      return promise.then(() => [200, { user: mockUsers[0] }]);
    });

    render(<Login />);
    const user = userEvent.setup();

    const usernameInput = screen.getByLabelText(/nome de usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i, {
      selector: "input",
    });
    const submitButton = screen.getByRole("button", { name: /^entrar$/i });

    await user.type(usernameInput, mockUsers[0].username);
    await user.type(passwordInput, mockUsers[0].password);

    await user.click(submitButton);
    expect(submitButton).toHaveTextContent(/entrando.../i);

    resolvePromise!();
    await waitFor(() => expect(submitButton).toHaveTextContent(/entrar/i));
  });

  it("Deve informar quando o e-mail não estiver verificado", async () => {
    mockAxios.onPost("/auth/login").reply(403, {
      message: "E-mail não verificado. Verifique sua caixa de entrada.",
    });

    render(<Login />);
    const user = userEvent.setup();

    const usernameInput = screen.getByLabelText(/nome de usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i, {
      selector: "input",
    });
    const submitButton = screen.getByRole("button", { name: /^entrar$/i });

    await user.type(usernameInput, mockUsers[0].username);
    await user.type(passwordInput, mockUsers[0].password);
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /E-mail não verificado. Verifique sua caixa de entrada./i
        )
      ).toBeInTheDocument();
    });
  });
});
