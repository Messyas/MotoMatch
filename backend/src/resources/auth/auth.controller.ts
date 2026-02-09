import { Request, Response } from "express";
import { google } from "googleapis";
import { SignUpDTO, LoginDTO, GoogleProfile } from "./auth.types";
import {
  getUsuarioByUserName,
  getUsuario,
  getUsuarioByEmail,
  getUsuarioByCelular,
  createUsuario,
} from "../user/user.service";
import { StatusCodes } from "http-status-codes";
import { DefaultError } from "../error/errors";
import { CheckCredentials, upsertUsuarioFromGoogle } from "./auth.service";
import {
  issueEmailVerificationToken,
  verifyEmailToken,
} from "./emailVerification.service";
import { Usuario } from "@prisma/client";
import {
  getOAuthClient,
  isGoogleClientConfigured,
} from "../../utils/gmailClient";
import { prisma } from "../../database/prismaSingleton";
import {
  issuePasswordResetToken,
  verifyPasswordResetToken,
} from "../email/passwordReset.service";
import bcrypt from "bcryptjs";

const sanitizeUser = (user: Usuario) => ({
  idUsuario: user.idUsuario,
  username: user.username,
  nome: user.nome,
  nascimento: user.nascimento,
  email: user.email,
  celular: user.celular,
  // tipo: user.tipo, //não exibir o tipo, pra não aparecer para o usuário final
  emailVerificado: user.emailVerificado,
  verificadoEm: user.verificadoEm,
  createdAt: user.createdAt,
});

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.send",
] as const;

const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
  "http://localhost:3001/api/auth/google/callback";

const FRONTEND_BASE_URL =
  process.env.APP_BASE_URL?.trim() || "http://localhost:3000";

const FRONTEND_BASE = FRONTEND_BASE_URL.replace(/\/$/, "");
const FRONTEND_CALLBACK_PATH = "/auth/google/callback";

let FRONTEND_ORIGIN = FRONTEND_BASE_URL;
try {
  FRONTEND_ORIGIN = new URL(FRONTEND_BASE_URL).origin;
} catch {
  FRONTEND_ORIGIN = FRONTEND_BASE_URL;
}

const FRONTEND_SUCCESS_FALLBACK = FRONTEND_BASE;
const FRONTEND_ERROR_FALLBACK = `${FRONTEND_BASE}${FRONTEND_CALLBACK_PATH}`;

const wantsJsonResponse = (req: Request) =>
  !!req.xhr || (req.headers.accept ?? "").includes("application/json");

const buildGoogleAuthUrl = (state?: string) => {
  const client = getOAuthClient(GOOGLE_REDIRECT_URI);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_SCOPES],
    include_granted_scopes: true,
    state,
  });
};

interface ParsedState {
  next?: string;
  fail?: string;
  raw?: string;
}

const parseStatePayload = (state?: string): ParsedState => {
  if (!state) return {};

  try {
    const params = new URLSearchParams(state);
    const next = params.get("next") ?? undefined;
    const fail = params.get("fail") ?? undefined;
    if (next || fail) {
      return { next, fail };
    }
  } catch {
    // not a query-string payload; fall through to raw handling
  }

  return { raw: state };
};

const buildFrontendUrl = (value?: string): string | null => {
  if (!value) return null;

  try {
    if (value.startsWith("http")) {
      const url = new URL(value);
      return url.origin === FRONTEND_ORIGIN ? url.toString() : null;
    }
  } catch {
    return null;
  }

  if (value.startsWith("/")) {
    return `${FRONTEND_BASE}${value}`;
  }

  return null;
};

const resolveFrontendRedirect = (
  state: string | undefined,
  status: "success" | "error",
  message?: string
) => {
  const parsedState = parseStatePayload(state);

  if (status === "success") {
    const candidate = parsedState.next ?? parsedState.raw;
    const target = buildFrontendUrl(candidate) ?? FRONTEND_SUCCESS_FALLBACK;
    return target;
  }

  const candidate = parsedState.fail ?? parsedState.raw;
  const target = buildFrontendUrl(candidate) ?? FRONTEND_ERROR_FALLBACK;

  const redirectUrl = new URL(target);
  redirectUrl.searchParams.set("status", status);
  if (message) {
    redirectUrl.searchParams.set("message", message);
  }

  if (parsedState.next && !redirectUrl.searchParams.has("next")) {
    redirectUrl.searchParams.set("next", parsedState.next);
  }

  return redirectUrl.toString();
};

/* Cadastro */
const signup = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Cadastrar um novo usuário no sistema.'
  #swagger.description = `
    Realiza validações de username, e-mail e celular.
    Após criar o usuário, envia um e-mail de verificação.
    Caso um token de verificação tenha sido enviado nos últimos 60s,
    o endpoint retorna erro 429 para evitar spam.
  `
  #swagger.tags = ['Autenticação']

  #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/definitions/SignUpDTO' },
        description: 'Dados necessários para criação de um novo usuário.'
      }
    }
  }

  #swagger.responses[201] = {
    description: 'Usuário criado com sucesso.',
    schema: {
      message: 'Cadastro realizado com sucesso. Verifique seu e-mail para ativar a conta.'
    }
  }

  #swagger.responses[400] = {
    description: 'Algum campo já está cadastrado no sistema.',
    schema: {
      field: 'username | email | celular',
      message: 'Username cadastrado | E-mail cadastrado | Celular cadastrado'
    }
  }

  #swagger.responses[429] = {
    description: 'Muitos pedidos de envio de e-mail de verificação.',
    schema: {
      message: 'Um e-mail de verificação já foi enviado. Aguarde Xs para reenviar.'
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao tentar cadastrar usuário.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const data = req.body as SignUpDTO;

  try {
    if (await getUsuarioByUserName(data.username)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "username",
        message: "Username cadastrado",
      });
    }

    if (await getUsuarioByEmail(data.email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "email",
        message: "E-mail cadastrado",
      });
    }

    if (await getUsuarioByCelular(data.celular)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "celular",
        message: "Celular cadastrado",
      });
    }

    // Criar o usuário depois das validações
    const user = await createUsuario({ ...data, tipo: "1" });

    // Verifica se já existe token recente (1 minuto)
    const existingTokens = await prisma.emailVerificationToken.findMany({
      where: { userId: user.idUsuario },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    const now = new Date();
    if (existingTokens.length > 0) {
      const lastToken = existingTokens[0];
      const diff = (now.getTime() - lastToken.createdAt.getTime()) / 1000;
      if (diff < 60) {
        return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          message: `Um e-mail de verificação já foi enviado. Aguarde ${Math.ceil(
            60 - diff
          )}s para reenviar.`,
        });
      }
    }

    // Gera token e envia e-mail via serviço
    const verification = await issueEmailVerificationToken({
      idUsuario: user.idUsuario,
      email: user.email,
      nome: user.nome,
    });

    return res.status(StatusCodes.CREATED).json({
      message:
        "Cadastro realizado com sucesso. Verifique seu e-mail para ativar a conta.",
      // user: sanitizeUser(user),
      // verification:
      //   process.env.NODE_ENV !== "production" ? verification : undefined,
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Login */
const login = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Realizar o login do usuário no sistema.'
  #swagger.description = `
    Valida as credenciais do usuário e inicia uma sessão autenticada.
    O login só é permitido se o e-mail estiver verificado.
    Após autenticação, o ID do usuário é armazenado na sessão.
  `
  #swagger.tags = ['Autenticação']

  #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/definitions/LoginDTO' },
        description: 'Credenciais de login do usuário.'
      }
    }
  }

  #swagger.responses[200] = {
    description: 'Login realizado com sucesso.',
    schema: {
      message: 'Login realizado com sucesso'
    }
  }

  #swagger.responses[401] = {
    description: 'Credenciais inválidas.',
    schema: {
      message: 'Credenciais inválidas'
    }
  }

  #swagger.responses[403] = {
    description: 'E-mail ainda não verificado.',
    schema: {
      message: 'E-mail não verificado. Verifique sua caixa de entrada ou solicite um novo link.'
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao tentar realizar login.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const data = req.body as LoginDTO;

  try {
    const user = await CheckCredentials(data);

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Credenciais inválidas",
      });
    }

    if (!user.emailVerificado) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message:
          "E-mail não verificado. Verifique sua caixa de entrada ou solicite um novo link.",
      });
    }

    req.session.uid = user.idUsuario;
    req.session.userTypeId = user.tipo;

    return res.status(StatusCodes.OK).json({
      message: "Login realizado com sucesso",
      // user: sanitizeUser(user),
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

const googleAuth = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Iniciar o fluxo de autenticação via Google OAuth 2.0.'
  #swagger.description = `
    Gera a URL de autorização do Google e inicia o fluxo OAuth.

    • Se o cliente solicitar JSON (ex.: via fetch ou header Accept: application/json), o endpoint retorna { url }  
    • Caso contrário, o navegador é redirecionado automaticamente para a página de login do Google  

    Aceita um parâmetro opcional "state", útil para redirecionar usuários após o login.
  `
  #swagger.tags = ['Autenticação']

  #swagger.parameters['state'] = {
    in: 'query',
    required: false,
    type: 'string',
    description: 'Valor opcional usado para validar ou rastrear o fluxo após o login.'
  }

  #swagger.responses[200] = {
    description: 'URL de autenticação Google gerada com sucesso (modo JSON).',
    schema: {
      url: "https://accounts.google.com/o/oauth2/v2/auth?..."
    }
  }

  #swagger.responses[302] = {
    description: 'Redireciona o usuário para o Google OAuth (modo navegador).'
  }

  #swagger.responses[400] = {
    description: 'Credenciais Google não configuradas.',
    schema: {
      message: 'Credenciais Google não configuradas. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.'
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao gerar URL de autenticação.',
    schema: {
      message: 'Erro interno no servidor.'
    }
  }
*/

  try {
    if (!isGoogleClientConfigured()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message:
          "Credenciais Google não configuradas. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.",
      });
    }

    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;
    const authUrl = buildGoogleAuthUrl(state);

    if (wantsJsonResponse(req)) {
      return res.status(StatusCodes.OK).json({ url: authUrl });
    }

    return res.redirect(authUrl);
  } catch (err) {
    DefaultError(res, err);
  }
};

const googleCallback = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Callback do OAuth Google.'
  #swagger.description = `
    Processa o código de autorização recebido do Google OAuth 2.0,
    autentica o usuário, cria/atualiza cadastro no sistema e inicia uma sessão.

    • Aceita tanto resposta JSON quanto redirecionamento (dependendo de wantsJsonResponse())  
    • Pode retornar refresh_token quando disponível  
    • Pode criar ou atualizar o usuário automaticamente via Google Profile  
  `
  #swagger.tags = ['Autenticação']

  #swagger.parameters['code'] = {
    in: 'query',
    required: true,
    type: 'string',
    description: 'Código de autorização enviado pelo Google OAuth 2.0.'
  }

  #swagger.parameters['state'] = {
    in: 'query',
    required: false,
    type: 'string',
    description: 'Valor opcional enviado na etapa inicial do OAuth para validação.'
  }

  #swagger.responses[200] = {
    description: 'Login via Google realizado com sucesso (resposta JSON).',
    schema: {
      message: 'Login via Google realizado com sucesso.',
      user: {
        idUsuario: 1,
        nome: 'João da Silva',
        email: 'joao@example.com'
      },
      refreshToken: '1//0gAExemploRefresh123' 
    }
  }

  #swagger.responses[400] = {
    description: 'Código de autorização ausente ou inválido.',
    schema: {
      message: 'Código de autorização ausente.'
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao finalizar o login via Google.',
    schema: {
      message: 'Falha ao completar login via Google.'
    }
  }
*/

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state =
    typeof req.query.state === "string" ? req.query.state : undefined;

  if (!code) {
    const redirectUrl = resolveFrontendRedirect(
      state,
      "error",
      "Código de autorização ausente."
    );

    if (wantsJsonResponse(req)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Código de autorização ausente.",
      });
    }

    return res.redirect(redirectUrl);
  }

  try {
    const oauth2Client = getOAuthClient(GOOGLE_REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (tokens.refresh_token) {
      console.log("=== GOOGLE OAUTH REFRESH TOKEN INÍCIO ===");
      console.log(
        "[google-oauth] Cole o valor abaixo em GOOGLE_REFRESH_TOKEN e reinicie o backend:"
      );
      console.log(tokens.refresh_token);
      console.log("=== GOOGLE OAUTH REFRESH TOKEN FIM ===");
    } else {
      console.warn(
        "[google-oauth] Nenhum refresh_token recebido. Confirme que acessou a URL gerada com access_type=offline e prompt=consent, e remova o acesso anterior nas Configurações de Conta Google se necessário."
      );
    }

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const profile = userInfo.data as GoogleProfile;

    const user = await upsertUsuarioFromGoogle({
      profile,
      tokens: {
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? null,
        idToken: tokens.id_token ?? null,
        scope: tokens.scope ?? null,
        tokenType: tokens.token_type ?? null,
        expiryDate: tokens.expiry_date ?? null,
      },
    });

    req.session.uid = user.idUsuario;
    req.session.userTypeId = user.tipo;

    const sanitized = sanitizeUser(user);

    if (wantsJsonResponse(req)) {
      return res.status(StatusCodes.OK).json({
        message: "Login via Google realizado com sucesso.",
        user: sanitized,
        refreshToken: tokens.refresh_token ?? null,
      });
    }

    const redirectUrl = resolveFrontendRedirect(state, "success");
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("[auth] Erro no callback do Google OAuth:", err);

    if (wantsJsonResponse(req)) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Falha ao completar login via Google.",
      });
    }

    const redirectUrl = resolveFrontendRedirect(
      state,
      "error",
      "Falha ao completar login via Google."
    );
    return res.redirect(redirectUrl);
  }
};

const devGetRefreshToken = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Gerar a URL de autorização do Google para obter um refresh_token (somente ambiente de desenvolvimento).'
  #swagger.description = 'Retorna a URL de autenticação do Google com os escopos apropriados e instruções para obter manualmente um refresh_token. Só funciona em ambiente de desenvolvimento (NODE_ENV !== production).'
  #swagger.tags = ['Desenvolvimento']

  #swagger.parameters['state'] = {
    in: 'query',
    required: false,
    type: 'string',
    description: 'Valor opcional enviado ao Google para validação posterior.'
  }

  #swagger.responses[200] = {
    description: 'URL gerada com sucesso para autenticação Google.',
    schema: {
      url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
      scopes: ['https://www.googleapis.com/auth/calendar'],
      instructions: 'Abra a URL em um navegador, finalize o consentimento e copie o refresh_token exibido nos logs do backend.'
    }
  }

  #swagger.responses[400] = {
    description: 'Credenciais Google não configuradas.',
    schema: {
      message: 'Credenciais Google não configuradas. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.'
    }
  }

  #swagger.responses[403] = {
    description: 'Endpoint bloqueado em ambiente de produção.',
    schema: {
      message: 'Endpoint disponível apenas em ambiente de desenvolvimento.'
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao gerar a URL de autenticação.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  if (process.env.NODE_ENV === "production") {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: "Endpoint disponível apenas em ambiente de desenvolvimento.",
    });
  }

  try {
    if (!isGoogleClientConfigured()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message:
          "Credenciais Google não configuradas. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.",
      });
    }

    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;
    const authUrl = buildGoogleAuthUrl(state);

    return res.status(StatusCodes.OK).json({
      url: authUrl,
      scopes: GOOGLE_SCOPES,
      instructions:
        "Abra a URL em um navegador, finalize o consentimento e copie o refresh_token exibido nos logs do backend.",
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Logout */
const logout = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Realizar o logout do usuário.'
  #swagger.description = 'Encerra a sessão do usuário autenticado, destrói o cookie de sessão e finaliza a autenticação.'
  #swagger.tags = ['Autenticação']

  #swagger.responses[200] = {
    description: 'Logout realizado com sucesso.',
    schema: { message: 'Logout realizado com sucesso' }
  }

  #swagger.responses[401] = {
    description: 'Usuário não está logado ou sessão inexistente.',
    schema: { message: 'Usuário não logado' }
  }

  #swagger.responses[500] = {
    description: 'Erro ao tentar destruir a sessão.',
    schema: { message: 'Erro ao encerrar sessão' }
  }
*/

  try {
    if (!req.session || !req.session.uid) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Usuário não logado" });
    }

    req.session.destroy((err) => {
      if (err) {
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Erro ao encerrar sessão" });
      }

      res.clearCookie("connect.sid");
      return res
        .status(StatusCodes.OK)
        .json({ message: "Logout realizado com sucesso" });
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Obter dados do usuário autenticado */
const me = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Obtém os dados do usuário autenticado.'
  #swagger.description = 'Retorna as informações do usuário atualmente logado no sistema. A autenticação é feita via sessão (cookies).'
  #swagger.tags = ['Autenticação']

  #swagger.responses[200] = {
    description: 'Dados do usuário retornados com sucesso.',
    schema: {
      idUsuario: 1,
      nome: "João da Silva",
      email: "joao@example.com",
      // demais campos retornados por getUsuario()
    }
  }

  #swagger.responses[401] = {
    description: 'Usuário não está autenticado (sessão ausente ou inválida).',
    schema: { message: 'Não autenticado' }
  }

  #swagger.responses[404] = {
    description: 'Usuário não encontrado no banco de dados.',
    schema: { message: 'Usuário não encontrado' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao tentar obter os dados do usuário.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  try {
    if (!req.session || !req.session.uid) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Não autenticado" });
    }
    const user = await getUsuario(req.session.uid);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Usuário não encontrado" });
    }
    return res.status(StatusCodes.OK).json(user);
  } catch (err) {
    DefaultError(res, err);
  }
};

const verifyEmail = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Verificar o e-mail de um usuário a partir de um token.'
  #swagger.description = 'Valida o token enviado por e-mail e ativa a conta caso o token seja válido. Também identifica tokens expirados, inválidos ou contas já verificadas.'
  #swagger.tags = ['Autenticação']

  #swagger.parameters['token'] = {
    in: 'query',
    required: true,
    type: 'string',
    description: 'Token de verificação recebido por e-mail.'
  }

  #swagger.responses[200] = {
    description: 'Token válido ou e-mail já verificado anteriormente.',
    schema: {
      message: 'E-mail verificado com sucesso.',
      status: 'success'
    },
    examples: {
      verified: {
        value: {
          message: 'E-mail verificado com sucesso.',
          status: 'success'
        }
      },
      alreadyVerified: {
        value: {
          message: 'E-mail já verificado anteriormente.',
          status: 'already-verified'
        }
      }
    }
  }

  #swagger.responses[400] = {
    description: 'Token inválido ou já utilizado.',
    schema: {
      message: 'Token de verificação inválido ou já utilizado.',
      status: 'invalid'
    }
  }

  #swagger.responses[410] = {
    description: 'Token expirado.',
    schema: {
      message: 'O link de verificação expirou. Solicite um novo e-mail.',
      status: 'expired'
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao validar o token.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Token de verificação inválido.",
      status: "invalid",
    });
  }

  try {
    const result = await verifyEmailToken(token);

    if (result.status === "invalid") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Token de verificação inválido ou já utilizado.",
        status: result.status,
      });
    }

    if (result.status === "expired") {
      return res.status(StatusCodes.GONE).json({
        message: "O link de verificação expirou. Solicite um novo e-mail.",
        status: result.status,
      });
    }

    if (result.status === "already-verified") {
      return res.status(StatusCodes.OK).json({
        message: "E-mail já verificado anteriormente.",
        status: result.status,
      });
    }

    return res.status(StatusCodes.OK).json({
      message: "E-mail verificado com sucesso.",
      status: result.status,
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Reenviar o e-mail de verificação da conta.'
  #swagger.description = 'Gera um novo token de verificação e envia novamente o e-mail de confirmação para o usuário.'
  #swagger.tags = ['Autenticação']

  #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@exemplo.com'
            }
          }
        },
        description: 'E-mail do usuário que irá receber o novo link de verificação.'
      }
    }
  }

  #swagger.responses[200] = {
    description: 'E-mail de verificação reenviado com sucesso.',
    schema: { message: 'E-mail de verificação reenviado com sucesso.' }
  }

  #swagger.responses[400] = {
    description: 'E-mail inválido ou a conta já foi verificada.',
    schema: { message: 'E-mail inválido ou já verificado.' }
  }

  #swagger.responses[404] = {
    description: 'Usuário não encontrado.',
    schema: { message: 'Usuário não encontrado.' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao tentar reenviar o e-mail.',
    schema: { message: 'Erro interno no servidor.' }
  }
  */

  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "E-mail inválido." });
  }

  try {
    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Usuário não encontrado." });
    }

    if (user.emailVerificado) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Este e-mail já foi verificado." });
    }

    // Gera novo token e envia e-mail
    await issueEmailVerificationToken({
      idUsuario: user.idUsuario,
      email: user.email,
      nome: user.nome,
    });

    return res.status(StatusCodes.OK).json({
      message: "E-mail de verificação reenviado com sucesso.",
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Solicitar reset de senha */
const requestPasswordReset = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Solicitar redefinição de senha.'
  #swagger.description = 'Envia um e-mail contendo um link de redefinição de senha, caso o e-mail informado exista no sistema.'
  #swagger.tags = ['Autenticação']

  #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@exemplo.com'
            }
          }
        },
        description: 'E-mail do usuário que deseja redefinir a senha.'
      }
    }
  }

  #swagger.responses[200] = {
    description: 'E-mail de redefinição enviado com sucesso.',
    schema: { message: 'E-mail de redefinição enviado.' }
  }

  #swagger.responses[400] = {
    description: 'E-mail não foi enviado no corpo da requisição.',
    schema: { message: 'E-mail é obrigatório.' }
  }

  #swagger.responses[404] = {
    description: 'O e-mail informado não está cadastrado no sistema.',
    schema: { message: 'Este e-mail não está cadastrado.' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao tentar solicitar nova senha.',
    schema: { message: 'Erro interno no servidor.' }
  }
  */

  const { email } = req.body;
  if (!email) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "E-mail é obrigatório." });
  }

  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: "Este e-mail não está cadastrado.",
    });
  }

  await issuePasswordResetToken({
    idUsuario: user.idUsuario,
    email: user.email,
    nome: user.nome,
  });
  return res
    .status(StatusCodes.OK)
    .json({ message: "E-mail de redefinição enviado." });
};

/* Redefinir senha */
const resetPassword = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Redefinir a senha do usuário.'
  #swagger.description = 'Usa um token válido enviado por e-mail para definir uma nova senha.'
  #swagger.tags = ['Autenticação']

  #swagger.parameters['token'] = {
    in: 'query',
    required: true,
    description: 'Token de redefinição recebido por e-mail',
    type: 'string'
  }

  #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['password'],
          properties: {
            password: {
              type: 'string',
              example: 'NovaSenha123'
            }
          }
        }
      }
    }
  }

  #swagger.responses[200] = {
    description: 'Senha redefinida com sucesso.',
    schema: { message: 'Senha redefinida com sucesso.' }
  }

  #swagger.responses[400] = {
    description: 'Token inválido, expirado ou campo ausente.',
    schema: { message: 'Token inválido, expirado ou campo ausente.' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao redefinir senha.',
    schema: { message: 'Erro interno no servidor.' }
  }
  */
  const { token } = req.query;
  const { password } = req.body as { password: string };

  if (!token || typeof token !== "string") {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Token inválido." });
  }

  const tokenCheck = await verifyPasswordResetToken(token);
  if (!tokenCheck.valid) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Token inválido ou expirado." });
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
  if (isNaN(saltRounds) || saltRounds < 4) {
    throw new Error("BCRYPT_SALT_ROUNDS inválido");
  }
  const hashed = await bcrypt.hash(password, saltRounds);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { idUsuario: tokenCheck.userId },
      data: { password: hashed },
    }),
    prisma.emailVerificationToken.delete({ where: { token } }),
  ]);

  return res
    .status(StatusCodes.OK)
    .json({ message: "Senha redefinida com sucesso." });
};

export default {
  signup,
  login,
  logout,
  me,
  verifyEmail,
  googleAuth,
  googleCallback,
  devGetRefreshToken,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
};
