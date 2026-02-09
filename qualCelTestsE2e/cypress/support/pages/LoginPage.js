// // *******************************************************************************
// // *                    Web Academy Moto Match - 2025
// // ******************************************************************************

class LoginPage {
  visit() {
    cy.visit("/login");
  }

  fillEmail(user) {
    cy.get("#username").clear().type(user);
  }

  fillPassword(password) {
    cy.get("#password").clear().type(password);
  }

  submit() {
    cy.contains('button', 'Entrar').click();
  }

  validateSuccessLogin() {
    cy.contains("Bem-vindo ao").should("be.visible");
  }

  validateErrorLogin() {
    cy.contains("Nome de usuário e/ou senha incorreta").should("be.visible");
  }
}

export default new LoginPage();
                                                                                  
