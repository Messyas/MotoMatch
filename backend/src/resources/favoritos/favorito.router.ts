import { Router } from "express";

import { isAuth } from "../../middlewares/isAuth"; 
import validate from "../../middlewares/validate"; 
import {
  adicionarFavoritoSchema,
  removerFavoritoSchema,
} from "./favorito.schema";
import {
  addFavorito,
  listarFavoritos,
  removerFavorito,
} from "./favorito.controller";
import { RemoverFavoritoParams } from "./favorito.types";

const router = Router();

router.post(
  "/",
  isAuth, 
  validate(adicionarFavoritoSchema, "body"), 
  addFavorito
);

router.get(
  "/",
  isAuth, 
  listarFavoritos
);

router.delete<RemoverFavoritoParams>(
  "/:idDispositivo",
  isAuth, 
  validate(removerFavoritoSchema, "params"),
  removerFavorito
);

export default router;
