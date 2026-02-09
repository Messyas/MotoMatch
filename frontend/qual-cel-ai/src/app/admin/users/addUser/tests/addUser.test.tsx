import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddUserPage from "../page";
import { mockAxios } from "@/tests/mocks/axios";
import {
  newUserMock,
  userMockAdmin,
  userMockSuport,
} from "@/tests/mocks/usuarios";

// Mock do next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock do useProtectedRoute
jest.mock("@/hooks/useProtectedRoute", () => ({
  useProtectedRoute: jest.fn(),
}));

// Mock do useAuth
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

describe("AddUserPage Component", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockPush.mockClear();
  });

  describe("Admin", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ user: userMockAdmin, loading: false });
      render(<AddUserPage />);
    });

    it("Deve renderizar todos os campos do formulário", () => {
      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/celular/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Usuário/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Administrador/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Suporte/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /confirmar cadastro/i })).toBeInTheDocument();
    });

    it("Usuário admin pode ver todas as opções", () => {
      expect(screen.getByLabelText(/Administrador/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Suporte/i)).toBeInTheDocument();
    });
  });

  describe("Usuário Suporte", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ user: userMockSuport, loading: false });
      render(<AddUserPage />);
    });

    it("Usuário suporte não deve ver opções admin/suporte", () => {
      expect(screen.getByLabelText(/Usuário/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Administrador/i)).toBeNull();
      expect(screen.queryByLabelText(/Suporte/i)).toBeNull();
    });
  });

  describe("Formulário e API", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ user: userMockAdmin, loading: false });
      render(<AddUserPage />);
    });

    it("Deve permitir digitar nos campos e selecionar tipo", async () => {
      await userEvent.type(screen.getByLabelText(/nome/i), newUserMock.nome);
      await userEvent.type(screen.getByLabelText(/username/i), newUserMock.username);
      await userEvent.type(screen.getByLabelText(/data de nascimento/i), "2000-01-01");
      await userEvent.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
      await userEvent.type(screen.getByLabelText(/celular/i), newUserMock.celular);
      await userEvent.type(screen.getByLabelText(/senha/i), newUserMock.password);

      fireEvent.click(screen.getByLabelText(/usuário/i));

      expect(screen.getByLabelText(/nome/i)).toHaveValue(newUserMock.nome);
      expect(screen.getByLabelText(/username/i)).toHaveValue(newUserMock.username);
      expect((screen.getByLabelText(/usuário/i) as HTMLInputElement).checked).toBe(true);
    });

    it("Deve mostrar erro de campo quando a API retorna 400 com field", async () => {
      mockAxios.onPost("/users/").reply(400, { field: "username", message: "Username já cadastrado" });

      await userEvent.type(screen.getByLabelText(/nome/i), newUserMock.nome);
      await userEvent.type(screen.getByLabelText(/username/i), newUserMock.username);
      await userEvent.type(screen.getByLabelText(/data de nascimento/i), "2000-01-01");
      await userEvent.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
      await userEvent.type(screen.getByLabelText(/celular/i), newUserMock.celular);
      await userEvent.type(screen.getByLabelText(/senha/i), newUserMock.password);

      fireEvent.click(screen.getByRole("button", { name: /confirmar cadastro/i }));

      await waitFor(() => {
        expect(screen.getByText(/Username já cadastrado/i)).toBeInTheDocument();
      });
    });

    it("Deve mostrar múltiplos erros de campo quando a API retorna fieldErrors", async () => {
      mockAxios.onPost("/users/").reply(400, {
        fieldErrors: { username: "Username inválido", password: "Senha fraca" },
      });

      await userEvent.type(screen.getByLabelText(/nome/i), newUserMock.nome);
      await userEvent.type(screen.getByLabelText(/username/i), newUserMock.username);
      await userEvent.type(screen.getByLabelText(/data de nascimento/i), "2000-01-01");
      await userEvent.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
      await userEvent.type(screen.getByLabelText(/celular/i), newUserMock.celular);
      await userEvent.type(screen.getByLabelText(/senha/i), newUserMock.password);

      fireEvent.click(screen.getByRole("button", { name: /confirmar cadastro/i }));

      await waitFor(() => {
        expect(screen.getByText(/Username inválido/i)).toBeInTheDocument();
        expect(screen.getByText(/Senha fraca/i)).toBeInTheDocument();
      });
    });

    it("Deve mostrar mensagem de sucesso após cadastro bem-sucedido e resetar formulário", async () => {
      mockAxios.onPost("/users/").reply(201, { idUsuario: "123" });

      await userEvent.type(screen.getByLabelText(/nome/i), newUserMock.nome);
      await userEvent.type(screen.getByLabelText(/username/i), newUserMock.username);
      await userEvent.type(screen.getByLabelText(/data de nascimento/i), "2000-01-01");
      await userEvent.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
      await userEvent.type(screen.getByLabelText(/celular/i), newUserMock.celular);
      await userEvent.type(screen.getByLabelText(/senha/i), newUserMock.password);

      fireEvent.click(screen.getByRole("button", { name: /confirmar cadastro/i }));

      await waitFor(() => {
        expect(screen.getByText(/usuário cadastrado com sucesso/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/nome/i)).toHaveValue("");
      });
    });

    it("Deve mostrar erro geral quando a API retorna uma string simples", async () => {
      mockAxios.onPost("/users/").reply(400, "Erro desconhecido");

      await userEvent.type(screen.getByLabelText(/nome/i), newUserMock.nome);
      await userEvent.type(screen.getByLabelText(/username/i), newUserMock.username);
      await userEvent.type(screen.getByLabelText(/data de nascimento/i), "2000-01-01");
      await userEvent.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
      await userEvent.type(screen.getByLabelText(/celular/i), newUserMock.celular);
      await userEvent.type(screen.getByLabelText(/senha/i), newUserMock.password);

      fireEvent.click(screen.getByRole("button", { name: /confirmar cadastro/i }));

      await waitFor(() => {
        expect(screen.getByText(/Erro desconhecido/i)).toBeInTheDocument();
      });
    });

    it("Deve desabilitar o botão ao enviar", async () => {
      mockAxios.onPost("/users/").reply(201, { idUsuario: "123" });

      const button = screen.getByRole("button", { name: /confirmar cadastro/i });

      await userEvent.type(screen.getByLabelText(/nome/i), newUserMock.nome);
      await userEvent.type(screen.getByLabelText(/username/i), newUserMock.username);
      await userEvent.type(screen.getByLabelText(/data de nascimento/i), "2000-01-01");
      await userEvent.type(screen.getByLabelText(/e-mail/i), newUserMock.email);
      await userEvent.type(screen.getByLabelText(/celular/i), newUserMock.celular);
      await userEvent.type(screen.getByLabelText(/senha/i), newUserMock.password);

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it("Deve redirecionar ao clicar no botão voltar", () => {
      fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
      expect(mockPush).toHaveBeenCalledWith("/admin/users");
    });
  });
});
