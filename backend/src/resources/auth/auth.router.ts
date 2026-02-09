import { Router } from "express";
import authController from "../auth/auth.controller";
import { isAuth } from "../../middlewares/isAuth";
import validate from "../../middlewares/validate";
import {
  authLoginSchema,
  authResetPasswordSchema,
  authSignUpSchema,
} from "./auth.schema";
import { resetPassword } from "../email/passwordReset.service";

const router = Router();

router.post("/signup", validate(authSignUpSchema), authController.signup);
router.post("/login", validate(authLoginSchema), authController.login);
router.post("/logout", isAuth, authController.logout);
router.get("/verify-email", authController.verifyEmail);
router.post(
  "/resend-verification-email",
  authController.resendVerificationEmail
);
router.get("/me", isAuth, authController.me);
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);
router.get("/dev/get-refresh-token", authController.devGetRefreshToken);
router.post("/forgot-password", authController.requestPasswordReset);
router.post(
  "/reset-password",
  validate(authResetPasswordSchema),
  authController.resetPassword
);

export default router;
