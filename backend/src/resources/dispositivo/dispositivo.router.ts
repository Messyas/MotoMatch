import { Router } from "express";
import dispositivoController from "./dispositivo.controller";
import schema, { pesquisaSchema, schemaBatch } from "./dispositivo.schema";
import validate from "../../middlewares/validate";

const router = Router();

// Essa rota fica antes das rotas com id para evitar conflitos de matching
router.post(
  "/pesquisar",
  validate(pesquisaSchema),
  dispositivoController.pesquisa
);

// Dispositivo controller
router.get("/", dispositivoController.index);
router.post("/", validate(schema), dispositivoController.create);
router.post("/batch", validate(schemaBatch), dispositivoController.createMany);
router.get("/:id/aspectos", dispositivoController.aspectos);
router.get("/:id/resumo", dispositivoController.resumo);
router.get("/:id/comentarios", dispositivoController.comentarios);
router.get("/:id", dispositivoController.read);
router.put("/:id", validate(schema), dispositivoController.update);
router.delete("/:id", dispositivoController.remove);

export default router;
