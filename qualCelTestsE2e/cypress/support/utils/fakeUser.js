// *******************************************************************************
// *                      Web Academy Moto Match - 2025
// ******************************************************************************

import { faker } from '@faker-js/faker';
faker.locale = 'pt_BR';

export const generateFakeUser = () => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
   const randomDigits = () => faker.number.int({ min: 0, max: 9 });
  const celular = `(92) 9${randomDigits()}${randomDigits()}${randomDigits()}${randomDigits()}-${randomDigits()}${randomDigits()}${randomDigits()}${randomDigits()}`;

  
  return {
    nome: `${firstName} ${lastName}`,
    nascimento: faker.date
      .birthdate({ min: 1980, max: 2005, mode: 'year' })
      .toISOString()
      .split('T')[0],  
    username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${faker.number.int({ min: 1, max: 9999 })}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@cypress.com`,
    celular,
    senha: 'Cypress@123'
  };
};
