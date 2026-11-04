// // *******************************************************************************
// // *                      Web Academy Moto Match - 2025
// // ******************************************************************************

import CadastroPage from "../../support/pages/CadastroPage";
import { generateFakeUser } from "../../support/utils/fakeUser";

describe("Cadastro de Usuário - Valida duplicidade", () => {
    it("Não deve permitir cadastro com username já existente", () => {
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

        const userDuplicado = generateFakeUser();
        CadastroPage.visit();
        CadastroPage.fillNome(userDuplicado.nome);
        CadastroPage.fillNascimento(userDuplicado.nascimento);
        CadastroPage.fillUsername(user.username);
        CadastroPage.fillEmail(userDuplicado.email);
        CadastroPage.fillCelular(userDuplicado.celular);
        CadastroPage.fillSenha(userDuplicado.senha);
        CadastroPage.submit();
        CadastroPage.validateErrorMessage("Username cadastrado");
    });

    it("Não deve permitir cadastro com email já existente", () => {
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

        const userDuplicado = generateFakeUser();
        CadastroPage.visit();
        CadastroPage.fillNome(userDuplicado.nome);
        CadastroPage.fillNascimento(userDuplicado.nascimento);
        CadastroPage.fillUsername(userDuplicado.username);
        CadastroPage.fillEmail(user.email);
        CadastroPage.fillCelular(userDuplicado.celular);
        CadastroPage.fillSenha(userDuplicado.senha);
        CadastroPage.submit();

        CadastroPage.validateErrorMessage("E-mail cadastrado");
    });

    it("Não deve permitir cadastro com senha fora do padrão", () => {
        const user = generateFakeUser();
        const senhasInvalidas = ["senhaErrada"];

        senhasInvalidas.forEach((senha) => {
            const uniqueUser = generateFakeUser();

            CadastroPage.visit();
            CadastroPage.fillNome(uniqueUser.nome);
            CadastroPage.fillNascimento(uniqueUser.nascimento);
            CadastroPage.fillUsername(uniqueUser.username);
            CadastroPage.fillEmail(uniqueUser.email);
            CadastroPage.fillCelular(uniqueUser.celular);
            CadastroPage.fillSenha(senha);
            CadastroPage.submit();
            CadastroPage.validateErrorMessage(
                "A senha deve ter pelo menos 8 caracteres, incluindo 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial"
            );
        });
    });

    it('Deve validar campos obrigatórios', () => {
        CadastroPage.visit();
        CadastroPage.submit();

        cy.get('#nome:invalid').should('exist');
        cy.get('#email:invalid').should('exist');
        cy.get('#password:invalid').should('exist');
    });

    it('Deve validar campo de data de nascimento', () => {
        const user = generateFakeUser();

        CadastroPage.visit();
        CadastroPage.fillNascimento(user.nascimento);
        cy.get('#nascimento').invoke('val').should('equal', user.nascimento);
    });
});
