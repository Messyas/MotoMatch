import { Router } from "express";
import historicoController from "./historico.controller";
import { getHistoricoSchema } from "./historico.schema";
import validate from "../../middlewares/validate";
import { isAuth } from "../../middlewares/isAuth";

const router = Router();

router.get(
  "/",
  isAuth,
  validate(getHistoricoSchema, "query"),
  historicoController.getHistorico
);

export default router;
