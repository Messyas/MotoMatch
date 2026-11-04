// // *******************************************************************************
// // *                    Web Academy Moto Match - 2025
// // ******************************************************************************

import CadastroPage from "../../support/pages/CadastroPage";
import { generateFakeUser } from "../../support/utils/fakeUser";

describe("Cadastro de Usuário", () => {
  it("Deve cadastrar usuário com Sucesso!", () => {
    const user = generateFakeUser();

    CadastroPage.visit();
    CadastroPage.fillNome(user.nome);
    CadastroPage.fillNascimento(user.nascimento);
    CadastroPage.fillUsername(user.username);
    CadastroPage.fillEmail(user.email);
    CadastroPage.fillCelular(user.celular);
    CadastroPage.fillSenha(user.senha);
    CadastroPage.submit();
    CadastroPage.validateSuccessMessage();
  });
});
