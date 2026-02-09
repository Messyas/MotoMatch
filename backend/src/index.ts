import express from "express";
import dotenv from "dotenv";
import router from "./router/index";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import { validateEnv } from "./utils/validateEnv";
import swaggerUi from "swagger-ui-express";
import swaggerFile from "./swagger-output.json";
import cors from "cors";
import crypto from "crypto";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { startWorker } from "./queues/worker";

declare module "express-session" {
  interface SessionData {
    uid: string;
    userTypeId: string;
  }
}

dotenv.config();
validateEnv();

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const isProd = process.env.NODE_ENV === "production";

const corsOrigin = isProd
  ? process.env.CORS_ORIGIN 
  : "http://localhost:3000";

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
  })
);


app.set("trust proxy", 1);


async function startServer() {

  
  //await executarProcessamentoCompleto();
  

  // 1. Opções base da sessão 
  const sessionOptions: session.SessionOptions = {
    genid: () => uuidv4(),
    secret: process.env.SESSION_SECRET ?? crypto.randomBytes(64).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 dias
      sameSite: isProd ? "none" : "lax", // 'none' para cross-site (prod), 'lax' para (dev)
      secure: isProd, // 'true' apenas em produção (HTTPS)
    },
  };

  // 2. Lógica condicional do Store (Redis ou Memória)
  // Usaremos Redis SE a URL estiver definida (em dev ou prod)
  if (process.env.REDIS_URL) {
    console.log(`Modo ${process.env.NODE_ENV}: REDIS_URL encontrada. Configurando RedisStore...`);
    
    // (O exemplo do Upstash estava correto, esta é a implementação)
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    // Adiciona um listener de erro
    redisClient.on("error", (err) => console.error("Erro no Cliente Redis:", err));

    // Conecta ao Redis ANTES de subir o servidor
    try {
      await redisClient.connect();
      console.log("Conectado ao Redis (Upstash) com sucesso.");

      // Inicializa o Store
      const redisStore = new RedisStore({
        client: redisClient,
        prefix: "session:", // Prefixo recomendado
      });

      // Atribui o store do Redis às opções da sessão
      sessionOptions.store = redisStore;

    } catch (err) {
      console.error("FALHA AO CONECTAR AO REDIS:", err);
      console.error("Verifique se a REDIS_URL está correta e se o serviço está acessível.");
      process.exit(1); // Falha ao iniciar
    }
  
  } else if (isProd) {
    // Alerta de segurança: Em produção SEM Redis
    console.error("ALERTA: Modo Produção (isProd=true) mas REDIS_URL não está definida!");
    console.warn("Usando MemoryStore. Isso NÃO é recomendado para produção (vaza memória).");
  
  } else {
    // Modo Dev sem REDIS_URL
    console.log("Modo dev: REDIS_URL não definida. Usando MemoryStore local (padrão).");
  }


  // 3. Registrar Middlewares (APÓS a configuração da sessão)
  app.use(session(sessionOptions));
  app.use(express.json());
  app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerFile));
  app.use(router);

  // 4. Iniciar o Servidor
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
    console.log(`CORS Origin: ${corsOrigin}`);
    console.log(`Secure Cookie: ${isProd}`);
    // Log final para confirmar qual store está em uso
    console.log(`Session Store: ${sessionOptions.store ? "RedisStore" : "MemoryStore"}`);

    const shouldStartWorker =
      String(process.env.ENABLE_COMMENT_QUEUES ?? "").toLowerCase() === "true";
    if (shouldStartWorker) {
      console.log("[Worker] ENABLE_COMMENT_QUEUES=true. Iniciando processamento automático.");
      startWorker();
    } else {
      console.log(
        "[Worker] ENABLE_COMMENT_QUEUES=false. Filas de comentários permanecerão desativadas."
      );
    }
  });
}


// Chama a função para iniciar o servidor
startServer().catch(err => {
  console.error("Falha ao iniciar o servidor:", err);
  process.exit(1);
});
