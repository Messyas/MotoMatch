import Joi from "joi";

export const adicionarFavoritoSchema = Joi.object({
  idDispositivo: Joi.string().uuid({ version: "uuidv4" }).required().messages({
    "string.base": "O idDispositivo deve ser um texto.",
    "string.guid": "O idDispositivo deve ser um UUID válido.",
    "any.required": "O idDispositivo é um campo obrigatório.",
  }),
  idHistorico: Joi.string().uuid({ version: "uuidv4" }).required().messages({
    "string.base": "O idHistorico deve ser um texto.",
    "string.guid": "O idHistorico deve ser um UUID válido.",
    "any.required": "O idHistorico é um campo obrigatório.",
  }),
});

export const removerFavoritoSchema = Joi.object({
  idDispositivo: Joi.string().uuid({ version: "uuidv4" }).required().messages({
    "string.base": "O parâmetro idDispositivo deve ser um texto.",
    "string.guid": "O parâmetro idDispositivo deve ser um UUID válido.",
    "any.required": "O parâmetro idDispositivo é obrigatório na URL.",
  }),
});
