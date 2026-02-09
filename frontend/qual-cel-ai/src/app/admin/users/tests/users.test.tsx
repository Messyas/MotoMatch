import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersPage from "../page";
import { backApi } from "@/services/api";
import {
  userMockSuport,
  userMockAdmin,
  userMockSimple,
  mockUsersAdm,
} from "@/tests/mocks/usuarios";

// Mock do next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock do useAuth
jest.mock("@/hooks/useAuth.ts", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

// Mock do useProtectedRoute
jest.mock("@/hooks/useProtectedRoute.ts", () => ({
  useProtectedRoute: jest.fn(),
}));

// Mock do backApi
jest.mock("@/services/api.ts", () => ({
  backApi: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("UsersPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Admin", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: userMockAdmin,
        loading: false,
      });
    });

    it("Deve renderizar a lista de usuários na tabela", async () => {
      (backApi.get as jest.Mock).mockResolvedValue({ data: mockUsersAdm });

      await act(async () => {
        render(<UsersPage />);
      });

      for (const user of mockUsersAdm) {
        await waitFor(() => {
          expect(
            screen.getByTestId(`username-${user.idUsuario}-desktop`)
          ).toHaveTextContent(user.username);
          expect(
            screen.getByTestId(`nome-${user.idUsuario}-desktop`)
          ).toHaveTextContent(user.nome);
          expect(
            screen.getByTestId(`email-${user.idUsuario}-desktop`)
          ).toHaveTextContent(user.email);
        });
      }
    });

    it("Deve filtrar usuários pelo input de busca", async () => {
      (backApi.get as jest.Mock).mockResolvedValue({ data: mockUsersAdm });

      await act(async () => {
        render(<UsersPage />);
      });

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "maria");

      await waitFor(() => {
        expect(
          screen.getByTestId(`username-${mockUsersAdm[2].idUsuario}-desktop`)
        ).toBeInTheDocument();
        expect(
          screen.queryByTestId(`username-${mockUsersAdm[0].idUsuario}-desktop`)
        ).toBeNull();
      });
    });

    it("Deve permitir excluir usuário (somente admin)", async () => {
      (backApi.get as jest.Mock).mockResolvedValue({ data: [userMockSimple] });
      (backApi.delete as jest.Mock).mockResolvedValue({});

      await act(async () => {
        render(<UsersPage />);
      });

      window.confirm = jest.fn().mockReturnValue(true);

      const deleteButton = await screen.findByTestId(
        `delete-${userMockSimple.idUsuario}-desktop`
      );
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(backApi.delete).toHaveBeenCalledWith(
          `/users/${userMockSimple.idUsuario}`
        );
        expect(screen.getByTestId("success-message")).toHaveTextContent(
          "Usuário excluído com sucesso!"
        );
      });
    });

    it("Deve mostrar botões de edição e exclusão conforme permissões", async () => {
      (backApi.get as jest.Mock).mockResolvedValue({
        data: [userMockSimple, userMockSuport],
      });

      await act(async () => {
        render(<UsersPage />);
      });

      expect(
        await screen.findByTestId(`edit-${userMockSimple.idUsuario}-desktop`)
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId(`delete-${userMockSimple.idUsuario}-desktop`)
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId(`edit-${userMockSuport.idUsuario}-desktop`)
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId(`delete-${userMockSuport.idUsuario}-desktop`)
      ).toBeInTheDocument();
    });

    it("Deve navegar para addUser ao clicar no botão", async () => {
      (backApi.get as jest.Mock).mockResolvedValue({ data: [] });

      await act(async () => {
        render(<UsersPage />);
      });

      const addButton = screen.getByTestId("add-user-button");
      fireEvent.click(addButton);

      expect(mockPush).toHaveBeenCalledWith("/admin/users/addUser");
    });

    it("Deve ordenar usuários por coluna Username", async () => {
      (backApi.get as jest.Mock).mockResolvedValue({ data: mockUsersAdm });

      render(<UsersPage />);

      await waitFor(() =>
        expect(screen.getAllByTestId("user-row").length).toBe(
          mockUsersAdm.length
        )
      );

      const usernameHeader = screen.getByRole("columnheader", {
        name: /username/i,
      });

      await act(async () => {
        userEvent.click(usernameHeader);
      });

      await waitFor(() => {
        const rows = screen.getAllByTestId(/username-.*-desktop/);
        const usernames = rows.map((row) => row.textContent?.trim() ?? "");
        const sortedUsernames = [...mockUsersAdm]
          .map((u) => u.username)
          .sort((a, b) => a.localeCompare(b));
        expect(usernames).toEqual(sortedUsernames);
      });
    });
  });
});
