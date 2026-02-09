import { Router } from "express";
import dispositivoRouter from "../resources/dispositivo/dispositivo.router";
import usuarioRouter from "../resources/user/user.router";
import authRouter from "../resources/auth/auth.router";
import historicoRouter from "../resources/historico/historico.router";
import favoritoRouter from "../resources/favoritos/favorito.router";

const router = Router();

router.use(
  "/dispositivos",
  // #swagger.tags = ['dispositivo']
  dispositivoRouter
);
router.use(
  "/users",
  // #swagger.tags = ['usuario']
  usuarioRouter
);

router.use('/historico',
  // #swagger.tags = ['historico']
  historicoRouter
);

router.use(
  "/favoritos",
  // #swagger.tags = ['favorito']
  favoritoRouter
);

router.use(
  "/auth",
  // #swagger.tags = ['auth']
  authRouter
);

export default router;
