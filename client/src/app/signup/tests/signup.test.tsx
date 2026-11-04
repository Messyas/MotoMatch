// src/app/signup/tests/signup.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignUp from "../signupPage";
import { mockAxios } from "../../../tests/mocks/axios";
import { newUserMock } from "../../../tests/mocks/usuarios";
import type { AxiosRequestConfig } from "axios";

// Mock do next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("SignUp Component", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockPush.mockClear();
  });

  it("Deve renderizar todos os campos do formulário", () => {
    render(<SignUp />);

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/celular/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirmar cadastro/i })
    ).toBeInTheDocument();
  });

  it("Deve permitir digitar nos campos", async () => {
    render(<SignUp />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nome/i), "Novo Usuário");
    await user.type(screen.getByLabelText(/username/i), "novoUser");
    await user.type(
      screen.getByLabelText(/data de nascimento/i),
      "2000-01-01"
    );
    await user.type(screen.getByLabelText(/e-mail/i), "novo@teste.com");
    await user.type(screen.getByLabelText(/celular/i), "5592929999999");
    await user.type(screen.getByLabelText(/senha/i), "12345Ab@");

    expect(screen.getByLabelText(/nome/i)).toHaveValue("Novo Usuário");
    expect(screen.getByLabelText(/username/i)).toHaveValue("novoUser");
  });

  it("Deve mostrar erro específico de campo quando API retorna 400", async () => {
    mockAxios.onPost("/auth/signup").reply(400, {
      field: "username",
      message: "Username cadastrado",
    });

    render(<SignUp />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nome/i), newUserMock.nome);
    await user.type(screen.getByLabelText(/username/i), newUserMock.username);
    await user.type(
      screen.getByLabelText(/data de nascimento/i),
      "2000-01-01"
    );
    await user.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
    await user.type(screen.getByLabelText(/celular/i), newUserMock.celular);
    await user.type(screen.getByLabelText(/senha/i), newUserMock.password);

    await user.click(
      screen.getByRole("button", { name: /confirmar cadastro/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/username cadastrado/i)).toBeInTheDocument();
    });
  });

  it("Deve redirecionar após cadastro bem-sucedido", async () => {
    mockAxios.onPost("/auth/signup").reply((config: AxiosRequestConfig) => {
      const data = JSON.parse(config.data as string);
      expect(data.username).toBe(newUserMock.username);
      return [201, { idUsuario: "123" }];
    });

    render(<SignUp />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nome/i), newUserMock.nome);
    await user.type(screen.getByLabelText(/username/i), newUserMock.username);
    await user.type(
      screen.getByLabelText(/data de nascimento/i),
      "2000-01-01"
    );
    await user.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
    await user.type(screen.getByLabelText(/celular/i), newUserMock.celular);
    await user.type(screen.getByLabelText(/senha/i), newUserMock.password);

    await user.click(
      screen.getByRole("button", { name: /confirmar cadastro/i })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?from=signup");
    });
  });

  it("Deve mostrar múltiplos erros de campo retornados pela API", async () => {
    mockAxios.onPost("/auth/signup").reply(400, {
      fieldErrors: {
        username: "Username inválido",
        password: "Senha fraca",
      },
    });

    render(<SignUp />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nome/i), newUserMock.nome);
    await user.type(screen.getByLabelText(/username/i), newUserMock.username);
    await user.type(
      screen.getByLabelText(/data de nascimento/i),
      "2000-01-01"
    );
    await user.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
    await user.type(screen.getByLabelText(/celular/i), newUserMock.celular);
    await user.type(screen.getByLabelText(/senha/i), newUserMock.password);

    await user.click(
      screen.getByRole("button", { name: /confirmar cadastro/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Username inválido/i)).toBeInTheDocument();
      expect(screen.getByText(/Senha fraca/i)).toBeInTheDocument();
    });
  });

  it("Deve mostrar erro geral quando API retorna string simples", async () => {
    mockAxios.onPost("/auth/signup").reply((config: AxiosRequestConfig) => {
      expect(JSON.parse(config.data as string)).toHaveProperty("username");
      return [400, "Erro desconhecido"];
    });

    render(<SignUp />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nome/i), newUserMock.nome);
    await user.type(screen.getByLabelText(/username/i), newUserMock.username);
    await user.type(
      screen.getByLabelText(/data de nascimento/i),
      "2000-01-01"
    );
    await user.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
    await user.type(screen.getByLabelText(/celular/i), newUserMock.celular);
    await user.type(screen.getByLabelText(/senha/i), newUserMock.password);

    await user.click(
      screen.getByRole("button", { name: /confirmar cadastro/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Erro desconhecido/i)).toBeInTheDocument();
    });
  });
});
