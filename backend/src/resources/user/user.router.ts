import { Router } from "express";
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  usuarioChangePWSchema,
} from "./user.schema";
import validate from "../../middlewares/validate";
import { canUpdateUser } from "../../middlewares/canUpdateUser";

import userController from "./user.controller";
import { isAuth } from "../../middlewares/isAuth";
import { hasRole } from "../../middlewares/hasRole";

const router = Router();

router.get("/", isAuth, hasRole(["0", "2"]), userController.index);
router.get(
  "/metrics/overview",
  isAuth,
  hasRole(["0"]),
  userController.metrics
);
router.post(
  "/",
  isAuth,
  hasRole(["0", "2"]),
  validate(usuarioCreateSchema),
  userController.create
);
router.get("/:id", isAuth, hasRole(["0", "2"]), userController.read);
router.put(
  "/:id",
  isAuth,
  canUpdateUser,
  validate(usuarioUpdateSchema),
  userController.update
);
router.patch(
  "/:id",
  isAuth,
  canUpdateUser,
  validate(usuarioChangePWSchema),
  userController.changePassword
);

// Rota para o próprio usuário deletar sua conta
router.delete("/me", isAuth, userController.selfRemove);
router.delete("/:id", hasRole(["0"]), userController.remove);

router.delete("/:id", isAuth, hasRole(["0"]), userController.remove);

export default router;
