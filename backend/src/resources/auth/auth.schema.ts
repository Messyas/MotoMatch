import Joi from "joi";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export const authSignUpSchema = Joi.object().keys({
  username: Joi.string()
    .trim()
    .lowercase()
    .min(4)
    .max(45)
    .pattern(/^[a-zA-Z0-9._]+$/)
    .required()
    .messages({
      "string.min": "Username no mínimo 4 caracteres",
      "string.max": "Username no máximo 45 caracteres",
      "string.empty": "Username é obrigatório",
      "string.pattern.base":
        "Username só pode conter letras, números, '.' ou '_', sem espaços.",
    }),
  nome: Joi.string().trim().min(3).max(100).required().messages({
    "string.min": "Nome no mínimo 3 caracteres",
    "string.max": "Nome no máximo 100 caracteres",
    "string.empty": "Nome é obrigatório",
  }),
  nascimento: Joi.date().required().messages({
    "date.base": "Data de nascimento inválida",
    "any.required": "Nascimento é obrigatório",
  }),
  email: Joi.string()
    .trim()
    .lowercase()
    .max(100)
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.max": "E-mail no máximo 100 caracteres",
      "string.email": "E-mail inválido",
      "string.empty": "E-mail é obrigatório",
    }),
  celular: Joi.string()
    .trim()
    .pattern(/^\d{11,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Celular deve ter entre 11 e 15 números",
      "string.empty": "Celular é obrigatório",
    }),
  password: Joi.string().trim().pattern(passwordRegex).required().messages({
    "string.pattern.base":
      "A senha deve ter pelo menos 8 caracteres, incluindo 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.",
    "string.empty": "Senha é obrigatória",
  }),
});

export const authLoginSchema = Joi.object().keys({
  username: Joi.string()
    .trim()
    .lowercase()
    .min(4)
    .max(45)
    .pattern(/^[a-zA-Z0-9._]+$/)
    .required()
    .messages({
      "string.min": "Username no mínimo 4 caracteres",
      "string.max": "Username no máximo 45 caracteres",
      "string.empty": "Username é obrigatório",
      "string.pattern.base":
        "Username só pode conter letras, números, '.' ou '_', sem espaços.",
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .max(100)
    .email({ tlds: { allow: false } })
    .messages({
      "string.max": "E-mail no máximo 100 caracteres",
      "string.email": "E-mail inválido",
      "string.empty": "E-mail é obrigatório",
    }),
  celular: Joi.string()
    .trim()
    // .pattern(/^\d{11,15}$/)
    .messages({
      "string.pattern.base": "Celular deve ter entre 11 e 15 números",
      "string.empty": "Celular é obrigatório",
    }),
  password: Joi.string().trim().required().messages({
    "string.empty": "Senha é obrigatória",
  }),
});

export const authResetPasswordSchema = Joi.object().keys({
  password: Joi.string().trim().pattern(passwordRegex).required().messages({
    "string.pattern.base":
      "A senha deve ter pelo menos 8 caracteres, incluindo 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.",
    "string.empty": "Senha é obrigatória",
    "any.required": "Senha é obrigatória",
  }),
});
