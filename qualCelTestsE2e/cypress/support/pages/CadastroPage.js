// *******************************************************************************
// *                      Web Academy Moto Match - 2025
// ******************************************************************************

class CadastroPage {
  visit() {
    cy.visit("/signup");
  }

  fillNome(nome) {
    cy.get("#nome").clear().type(nome);
  }

  fillNascimento(data) {
    cy.get("#nascimento").clear().type(data); // formato YYYY-MM-DD
  }

  fillUsername(username) {
    cy.get("#username").clear().type(username);
  }

  fillEmail(email) {
    cy.get("#email").clear().type(email);
  }

  fillCelular(celular) {
    cy.get("#celular").clear().type(celular);
  }

  fillSenha(senha) {
    cy.get("#password").clear().type(senha);
  }

  submit() {
    cy.get('button[type="submit"]').click();
  }

  validateSuccessMessage() {
    cy.contains("Moto Match!").should("be.visible");
  }

  validateErrorMessage(msg) {
    cy.contains(msg).should("be.visible");
  }
}

export default new CadastroPage();
