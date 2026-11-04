"use client";

import { useEffect, useState } from "react";
import { backApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Pencil, Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { UserAuth, UserCadastroAdm } from "@/types/user";
import { Input } from "@/components/ui/input";
import { formatCelular } from "@/utils/masks";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

type SortOrder = "asc" | "desc";

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserCadastroAdm[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] =
    useState<keyof UserCadastroAdm>("username");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const usersPerPage = 20;

  useProtectedRoute(["0", "2"]); // apenas admin e suporte

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await backApi.get<UserCadastroAdm[]>("/users/");
      setUsers(res.data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      // Se não houver user ou tipo não permitido, bloqueia acesso
      if (!user || !["0", "2"].includes(user.tipo)) {
        setCheckingAccess(false);
        return;
      }

      // Usuário permitido, pode buscar os usuários
      fetchUsers().finally(() => setCheckingAccess(false));
    }
  }, [user, authLoading]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    try {
      await backApi.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.idUsuario !== id));
      setSuccessMessage("Usuário excluído com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const filteredUsers = users.filter((u) =>
    [u.username, u.nome, u.email].some((field) =>
      field.toLowerCase().includes(search.toLowerCase())
    )
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const valA = a[sortColumn];
    const valB = b[sortColumn];

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return 0;
  });

  const paginatedUsers = sortedUsers.slice(
    (page - 1) * usersPerPage,
    page * usersPerPage
  );
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  const toggleSort = (column: keyof UserCadastroAdm) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const canEdit = (currentUser: UserAuth | null, target: UserCadastroAdm) => {
    if (!currentUser) return false;
    if (currentUser.tipo === "0") return true; // Admin
    if (currentUser.tipo === "2" && target.tipo === "1") return true; // Suporte
    return false;
  };

  const canDelete = (currentUser: UserAuth | null) => {
    if (!currentUser) return false;
    return currentUser.tipo === "0"; // Só admin
  };

  if (authLoading || checkingAccess) {
    return <div className="text-center py-6">Carregando...</div>;
  }

  //Se o usuário não é permitido, não renderiza o conteúdo
  if (!user || !["0", "2"].includes(user.tipo)) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Usuários</h1>

      <Input
        placeholder="Pesquisar por username, nome ou email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
        data-testid="search-input"
      />

      {successMessage && (
        <div
          className="mb-4 w-full rounded-md bg-green-50 border border-green-300 p-3 text-sm text-green-700"
          data-testid="success-message"
        >
          {successMessage}
        </div>
      )}

      <div className="flex justify-end items-center mb-4">
        <Button
          onClick={() => router.push("/admin/users/addUser")}
          data-testid="add-user-button"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      <hr className="border-t border-gray-200 mb-4" />

      {loading ? (
        <p>Carregando usuários...</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block">
            <Table data-testid="users-table">
              <TableHeader>
                <TableRow>
                  {["username", "nome", "email", "celular", "tipo"].map(
                    (col) => (
                      <TableHead
                        key={col}
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort(col as keyof UserCadastroAdm)}
                      >
                        <div className="flex items-center gap-1">
                          {col === "username"
                            ? "Username"
                            : col === "nome"
                            ? "Nome"
                            : col === "email"
                            ? "Email"
                            : col === "celular"
                            ? "Celular"
                            : "Tipo"}
                          {sortColumn === col &&
                            (sortOrder === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            ))}
                        </div>
                      </TableHead>
                    )
                  )}
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((item) => (
                  <TableRow key={item.idUsuario} data-testid="user-row">
                    <TableCell
                      data-testid={`username-${item.idUsuario}-desktop`}
                    >
                      {item.username}
                    </TableCell>
                    <TableCell data-testid={`nome-${item.idUsuario}-desktop`}>
                      {item.nome}
                    </TableCell>
                    <TableCell data-testid={`email-${item.idUsuario}-desktop`}>
                      {item.email}
                    </TableCell>
                    <TableCell
                      data-testid={`celular-${item.idUsuario}-desktop`}
                    >
                      {formatCelular(item.celular)}
                    </TableCell>
                    <TableCell data-testid={`tipo-${item.idUsuario}-desktop`}>
                      {item.tipo === "0"
                        ? "Administrador"
                        : item.tipo === "1"
                        ? "Usuário"
                        : "Suporte"}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      {canEdit(user, item) && (
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Editar ${item.username} desktop`}
                          onClick={() =>
                            router.push(
                              `/admin/users/editUser/${item.idUsuario}`
                            )
                          }
                          data-testid={`edit-${item.idUsuario}-desktop`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete(user) && (
                        <Button
                          variant="destructive"
                          size="icon"
                          aria-label={`Excluir ${item.username} desktop`}
                          onClick={() => handleDelete(item.idUsuario)}
                          data-testid={`delete-${item.idUsuario}-desktop`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="grid gap-4 lg:hidden">
            {paginatedUsers.map((item) => (
              <Card
                key={item.idUsuario}
                className="p-4"
                data-testid="user-card"
              >
                <p
                  className="font-bold"
                  data-testid={`username-${item.idUsuario}-mobile`}
                >
                  {item.username}
                </p>
                <p data-testid={`nome-${item.idUsuario}-mobile`}>{item.nome}</p>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid={`email-${item.idUsuario}-mobile`}
                >
                  {item.email}
                </p>
                <p data-testid={`celular-${item.idUsuario}-mobile`}>
                  {formatCelular(item.celular)}
                </p>
                <span
                  className="text-xs"
                  data-testid={`tipo-${item.idUsuario}-mobile`}
                >
                  {item.tipo === "0"
                    ? "Administrador"
                    : item.tipo === "1"
                    ? "Usuário"
                    : "Suporte"}
                </span>
                <div className="flex gap-2 mt-2">
                  {canEdit(user, item) && (
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Editar ${item.username} mobile`}
                      onClick={() =>
                        router.push(`/admin/users/editUser/${item.idUsuario}`)
                      }
                      data-testid={`edit-${item.idUsuario}-mobile`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete(user) && (
                    <Button
                      variant="destructive"
                      size="icon"
                      aria-label={`Excluir ${item.username} mobile`}
                      onClick={() => handleDelete(item.idUsuario)}
                      data-testid={`delete-${item.idUsuario}-mobile`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                />
              </PaginationItem>
              <span className="px-4">
                Página {page} de {totalPages}
              </span>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}
    </div>
  );
}
