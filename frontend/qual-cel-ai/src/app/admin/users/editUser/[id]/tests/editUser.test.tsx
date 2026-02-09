import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditUserPage from "../page";
import { mockAxios } from "@/tests/mocks/axios";
import {
  mockUsersAdm,
  userMockAdmin,
  userMockSuport,
} from "@/tests/mocks/usuarios";
import { formatCelular } from "@/utils/masks";

// Mock do next/navigation
const mockPush = jest.fn();
let mockId = mockUsersAdm[0].idUsuario;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
  useParams: () => ({ id: mockId }),
}));

// Mock do useAuth
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

// Mock do useProtectedRoute
jest.mock("@/hooks/useProtectedRoute", () => ({
  useProtectedRoute: jest.fn(),
}));

describe("EditUserPage Component", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockPush.mockClear();
  });

  describe("Admin", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ user: userMockAdmin, loading: false });
      mockId = mockUsersAdm[0].idUsuario;
    });

    it("Deve renderizar todos os campos preenchidos com dados do usuário", async () => {
      mockAxios.onGet(`/users/${mockId}`).reply(200, mockUsersAdm[0]);

      render(<EditUserPage />);

      expect(await screen.findByDisplayValue(mockUsersAdm[0].nome)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUsersAdm[0].username)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUsersAdm[0].email)).toBeInTheDocument();
      expect(screen.getByDisplayValue(formatCelular(mockUsersAdm[0].celular))).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUsersAdm[0].nascimento)).toBeInTheDocument();
      expect(screen.getByLabelText(/Usuário/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Suporte/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Administrador/i)).toBeInTheDocument();
    });

    it("Deve permitir editar e salvar usuário com sucesso", async () => {
      mockAxios.onGet(`/users/${mockId}`).reply(200, mockUsersAdm[0]);
      mockAxios.onPut(`/users/${mockId}`).reply(200);

      render(<EditUserPage />);

      const nomeInput = await screen.findByDisplayValue(mockUsersAdm[0].nome);
      const submitButton = await screen.findByRole("button", { name: /Salvar alterações/i });

      await userEvent.clear(nomeInput);
      await userEvent.type(nomeInput, "Nome Alterado");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Usuário atualizado com sucesso!/i)).toBeInTheDocument();
      });
    });

    it("Deve redirecionar ao clicar no botão cancelar", async () => {
      mockAxios.onGet(`/users/${mockId}`).reply(200, mockUsersAdm[0]);

      render(<EditUserPage />);

      const cancelButton = await screen.findByRole("button", { name: /Cancelar/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/users");
      });
    });
  });

  describe("Usuário Suporte", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ user: userMockSuport, loading: false });
    });

    it("Usuário suporte não deve acessar usuários admin", async () => {
      mockAxios.onGet(`/users/${mockUsersAdm[0].idUsuario}`).reply(200, mockUsersAdm[0]);

      render(<EditUserPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/users");
      });
    });

    it("Deve exibir apenas opção de usuário comum", async () => {
      const mockUser = { ...mockUsersAdm[1], tipo: "1" };
      mockId = mockUsersAdm[1].idUsuario;
      mockAxios.onGet(`/users/${mockId}`).reply(200, mockUser);

      render(<EditUserPage />);

      const usuarioRadio = await screen.findByLabelText(/Usuário/i);
      expect(usuarioRadio).toBeInTheDocument();

      expect(screen.queryByLabelText(/Administrador/i)).toBeNull();
      expect(screen.queryByLabelText(/Suporte/i)).toBeNull();
    });
  });
});
