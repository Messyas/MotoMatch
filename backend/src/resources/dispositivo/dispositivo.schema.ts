import Joi from "joi";

const caracteristicaSchema = Joi.object({
  tipo: Joi.string().min(1).max(50).required(),
  descricao: Joi.string().min(1).max(100).required(),
});

const schema = Joi.object({
  fabricante: Joi.string().min(2).max(100).required(),
  modelo: Joi.string().min(1).max(100).required(),
  preco: Joi.number().required(),
  photos: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().min(1).required(),
        src: Joi.string().uri().required(),
      })
    )
    .min(1)
    .required(),
  caracteristicas: Joi.array().items(caracteristicaSchema).required(),
});

// schema para batch (lista de dispositivos)
export const schemaBatch = Joi.array()
  .items(schema)
  .min(1)
  .max(100) // limite de segurança
  .required()
  .messages({
    "array.base": "O payload deve ser uma lista de dispositivos.",
    "array.min": "É necessário enviar pelo menos 1 dispositivo.",
    "array.max": "O limite máximo é de 100 dispositivos por requisição.",
  });

// --- INÍCIO DA MUDANÇA (Correção do Erro 400) ---

const chatMsgSchema = Joi.object({
  id: Joi.string().required(),
  role: Joi.string().valid("user", "assistant").required(),
  
  // O campo 'type' agora é condicional:
  type: Joi.when("role", {
    // Se role for 'assistant', 'type' é obrigatório
    is: "assistant",
    then: Joi.string()
      .valid("text", "loading", "cards") // Apenas os tipos do seu chat.types.ts
      .required(),
    // Se role for 'user', 'type' não é esperado (é opcional)
    otherwise: Joi.optional(), 
  }),

}).unknown(true); // Permite outros campos (como 'criterios', 'content', 'items')

export const pesquisaSchema = Joi.object({
  // O 'historicoConversa' agora é a entrada principal
  historicoConversa: Joi.array()
    .items(chatMsgSchema)
    .min(1) // Deve ter pelo menos a mensagem do usuário
    .required()
    .messages({
      "array.min": "O histórico da conversa não pode estar vazio.",
    }),

  filtrosSelecionados: Joi.object().unknown(true).allow({}).required(),
});

// --- FIM DA MUDANÇA ---

export default schema;