-- CreateTable
CREATE TABLE `dispositivo` (
    `id_dispositivo` CHAR(36) NOT NULL,
    `tx_fabricante` VARCHAR(40) NOT NULL,
    `tx_modelo` VARCHAR(100) NOT NULL,
    `photos` JSON NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dt_updated_at` DATETIME(3) NOT NULL,

    INDEX `dispositivo_tx_modelo_idx`(`tx_modelo`),
    UNIQUE INDEX `dispositivo_tx_fabricante_tx_modelo_key`(`tx_fabricante`, `tx_modelo`),
    PRIMARY KEY (`id_dispositivo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id_usuario` CHAR(36) NOT NULL,
    `tx_username` VARCHAR(30) NOT NULL,
    `tx_nome` VARCHAR(100) NOT NULL,
    `dt_nascimento` DATE NOT NULL,
    `tx_email` VARCHAR(100) NOT NULL,
    `fl_email_verificado` BOOLEAN NOT NULL DEFAULT false,
    `dt_email_verificado` DATETIME(3) NULL,
    `tx_celular` VARCHAR(15) NOT NULL,
    `tx_password` VARCHAR(255) NOT NULL,
    `tx_tipo` CHAR(1) NOT NULL DEFAULT '1',
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_tx_username_key`(`tx_username`),
    UNIQUE INDEX `usuario_tx_email_key`(`tx_email`),
    UNIQUE INDEX `usuario_tx_celular_key`(`tx_celular`),
    INDEX `usuario_tx_username_idx`(`tx_username`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conta_oauth` (
    `id_conta` CHAR(36) NOT NULL,
    `tx_provedor` VARCHAR(40) NOT NULL,
    `tx_provedor_id` VARCHAR(100) NOT NULL,
    `tx_email_provedor` VARCHAR(100) NULL,
    `tx_foto_perfil` VARCHAR(255) NULL,
    `tx_access_token` TEXT NULL,
    `tx_refresh_token` TEXT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conta_oauth_id_usuario_idx`(`id_usuario`),
    UNIQUE INDEX `conta_oauth_tx_provedor_tx_provedor_id_key`(`tx_provedor`, `tx_provedor_id`),
    PRIMARY KEY (`id_conta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verification_token` (
    `id_token` CHAR(36) NOT NULL,
    `tx_token` CHAR(64) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `tx_tipo` CHAR(1) NOT NULL DEFAULT '0',
    `dt_expires_at` DATETIME(3) NOT NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_verification_token_tx_token_key`(`tx_token`),
    INDEX `email_verification_token_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caracteristica` (
    `id_caracteristica` CHAR(36) NOT NULL,
    `tx_tipo` VARCHAR(45) NOT NULL,
    `tx_descricao` VARCHAR(45) NOT NULL,

    UNIQUE INDEX `caracteristica_tx_tipo_tx_descricao_key`(`tx_tipo`, `tx_descricao`),
    PRIMARY KEY (`id_caracteristica`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caracteristica_dispositivo` (
    `id_dispositivo` CHAR(36) NOT NULL,
    `id_caracteristica` CHAR(36) NOT NULL,

    PRIMARY KEY (`id_dispositivo`, `id_caracteristica`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorito` (
    `id_favorito` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `id_dispositivo` CHAR(36) NOT NULL,
    `id_historico` CHAR(36) NOT NULL,

    UNIQUE INDEX `favorito_id_usuario_id_dispositivo_key`(`id_usuario`, `id_dispositivo`),
    PRIMARY KEY (`id_favorito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historico_pesquisa` (
    `id_historico` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `id_evento` CHAR(36) NULL,
    `js_criterios` JSON NOT NULL,
    `tx_console_input` VARCHAR(400) NULL,
    `js_seletores` JSON NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `historico_pesquisa_id_evento_idx`(`id_evento`),
    PRIMARY KEY (`id_historico`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resultado_pesquisa` (
    `id_resultado` CHAR(36) NOT NULL,
    `id_historico` CHAR(36) NOT NULL,
    `id_dispositivo` CHAR(36) NOT NULL,
    `nb_match_score` DOUBLE NOT NULL,
    `js_criterios_batidos` JSON NULL,

    PRIMARY KEY (`id_resultado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pesquisa_evento` (
    `id_evento` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NULL,
    `id_sessao` CHAR(36) NULL,
    `tx_texto_livre` TEXT NULL,
    `js_selecionados_ui` JSON NULL,
    `js_criterios_gemini` JSON NULL,
    `js_criterios_usados` JSON NULL,
    `js_descartados` JSON NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pesquisa_evento_id_sessao_idx`(`id_sessao`),
    INDEX `pesquisa_evento_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_evento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `selecao_pesquisa` (
    `id_selecao` CHAR(36) NOT NULL,
    `id_evento` CHAR(36) NOT NULL,
    `tx_tipo` VARCHAR(45) NOT NULL,
    `tx_descricao` VARCHAR(255) NOT NULL,
    `tx_origem` ENUM('ui', 'gemini') NOT NULL,
    `tx_status` ENUM('usado', 'descartado') NOT NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `selecao_pesquisa_dt_created_at_idx`(`dt_created_at`),
    INDEX `selecao_pesquisa_id_evento_idx`(`id_evento`),
    INDEX `selecao_pesquisa_tx_origem_tx_status_idx`(`tx_origem`, `tx_status`),
    INDEX `selecao_pesquisa_tx_tipo_idx`(`tx_tipo`),
    INDEX `selecao_pesquisa_tx_tipo_tx_descricao_idx`(`tx_tipo`, `tx_descricao`),
    PRIMARY KEY (`id_selecao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessao_anonima` (
    `id_sessao` CHAR(36) NOT NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_sessao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comentario_dispositivo` (
    `id_comentario` CHAR(36) NOT NULL,
    `id_dispositivo` CHAR(36) NOT NULL,
    `tx_plataforma` VARCHAR(40) NOT NULL,
    `tx_referencia_externa` VARCHAR(80) NOT NULL,
    `tx_autor` VARCHAR(100) NULL,
    `nb_nota` INTEGER NULL,
    `tx_conteudo` TEXT NOT NULL,
    `dt_publicado_em` DATETIME(3) NOT NULL,
    `dt_analisado_em` DATETIME(3) NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dt_updated_at` DATETIME(3) NOT NULL,

    INDEX `comentario_dispositivo_id_dispositivo_idx`(`id_dispositivo`),
    UNIQUE INDEX `comentario_dispositivo_id_dispositivo_tx_plataforma_tx_refer_key`(`id_dispositivo`, `tx_plataforma`, `tx_referencia_externa`),
    PRIMARY KEY (`id_comentario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comentario_analise` (
    `id_analise` CHAR(36) NOT NULL,
    `id_comentario` CHAR(36) NOT NULL,
    `tx_status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `tx_resumo` VARCHAR(255) NULL,
    `js_prompt_gemini` JSON NULL,
    `js_resposta_gemini` JSON NULL,
    `tx_erro` VARCHAR(255) NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dt_updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `comentario_analise_id_comentario_key`(`id_comentario`),
    PRIMARY KEY (`id_analise`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comentario_aspecto` (
    `id_aspecto` CHAR(36) NOT NULL,
    `id_analise` CHAR(36) NOT NULL,
    `tx_aspecto` VARCHAR(100) NOT NULL,
    `tx_sentimento` VARCHAR(20) NOT NULL,
    `nb_score` INTEGER NULL,
    `tx_justificativa` VARCHAR(255) NULL,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `comentario_aspecto_id_analise_idx`(`id_analise`),
    PRIMARY KEY (`id_aspecto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispositivo_aspecto_score` (
    `id_score` CHAR(36) NOT NULL,
    `id_dispositivo` CHAR(36) NOT NULL,
    `tx_aspecto` VARCHAR(100) NOT NULL,
    `nb_media_score` DOUBLE NULL,
    `nb_total_opinioes` INTEGER NOT NULL DEFAULT 0,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dt_updated_at` DATETIME(3) NOT NULL,

    INDEX `dispositivo_aspecto_score_id_dispositivo_idx`(`id_dispositivo`),
    UNIQUE INDEX `dispositivo_aspecto_score_id_dispositivo_tx_aspecto_key`(`id_dispositivo`, `tx_aspecto`),
    PRIMARY KEY (`id_score`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conta_oauth` ADD CONSTRAINT `conta_oauth_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verification_token` ADD CONSTRAINT `email_verification_token_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caracteristica_dispositivo` ADD CONSTRAINT `caracteristica_dispositivo_id_caracteristica_fkey` FOREIGN KEY (`id_caracteristica`) REFERENCES `caracteristica`(`id_caracteristica`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caracteristica_dispositivo` ADD CONSTRAINT `caracteristica_dispositivo_id_dispositivo_fkey` FOREIGN KEY (`id_dispositivo`) REFERENCES `dispositivo`(`id_dispositivo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_id_dispositivo_fkey` FOREIGN KEY (`id_dispositivo`) REFERENCES `dispositivo`(`id_dispositivo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_id_historico_fkey` FOREIGN KEY (`id_historico`) REFERENCES `historico_pesquisa`(`id_historico`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_pesquisa` ADD CONSTRAINT `historico_pesquisa_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_pesquisa` ADD CONSTRAINT `historico_pesquisa_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `pesquisa_evento`(`id_evento`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultado_pesquisa` ADD CONSTRAINT `resultado_pesquisa_id_historico_fkey` FOREIGN KEY (`id_historico`) REFERENCES `historico_pesquisa`(`id_historico`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultado_pesquisa` ADD CONSTRAINT `resultado_pesquisa_id_dispositivo_fkey` FOREIGN KEY (`id_dispositivo`) REFERENCES `dispositivo`(`id_dispositivo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pesquisa_evento` ADD CONSTRAINT `pesquisa_evento_id_sessao_fkey` FOREIGN KEY (`id_sessao`) REFERENCES `sessao_anonima`(`id_sessao`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pesquisa_evento` ADD CONSTRAINT `pesquisa_evento_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selecao_pesquisa` ADD CONSTRAINT `selecao_pesquisa_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `pesquisa_evento`(`id_evento`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentario_dispositivo` ADD CONSTRAINT `comentario_dispositivo_id_dispositivo_fkey` FOREIGN KEY (`id_dispositivo`) REFERENCES `dispositivo`(`id_dispositivo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentario_analise` ADD CONSTRAINT `comentario_analise_id_comentario_fkey` FOREIGN KEY (`id_comentario`) REFERENCES `comentario_dispositivo`(`id_comentario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentario_aspecto` ADD CONSTRAINT `comentario_aspecto_id_analise_fkey` FOREIGN KEY (`id_analise`) REFERENCES `comentario_analise`(`id_analise`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispositivo_aspecto_score` ADD CONSTRAINT `dispositivo_aspecto_score_id_dispositivo_fkey` FOREIGN KEY (`id_dispositivo`) REFERENCES `dispositivo`(`id_dispositivo`) ON DELETE CASCADE ON UPDATE CASCADE;
