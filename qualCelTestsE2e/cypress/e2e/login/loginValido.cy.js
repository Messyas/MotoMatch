// // *******************************************************************************
// // *                    Web Academy Moto Match - 2025
// // ******************************************************************************

import LoginPage from '../../support/pages/LoginPage';
import { generateFakeUser } from '../../support/utils/fakeUser';
import CadastroPage from '../../support/pages/CadastroPage';

describe('Login de Usuário', () => {

  it('Deve logar com usuário válido cadastrado', () => {
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
    LoginPage.visit();
    LoginPage.fillEmail(user.username);
    LoginPage.fillPassword(user.senha);
    LoginPage.submit();
    LoginPage.validateSuccessLogin();
  });

  it('Deve realizar login com credenciais inválida', () => {
    const user = generateFakeUser();

    LoginPage.visit();
    LoginPage.fillEmail(user.username);
    LoginPage.fillPassword('SenhaErrada123!');
    LoginPage.submit();

    LoginPage.validateErrorLogin('Nome de usuário e/ou senha incorreta');
  });
});
