-- CreateTable
CREATE TABLE `dispositivo_resumo_comentario` (
    `id_resumo` CHAR(36) NOT NULL,
    `id_dispositivo` CHAR(36) NOT NULL,
    `tx_resumo` VARCHAR(1000) NULL,
    `nb_total_analises_consideradas` INTEGER NOT NULL DEFAULT 0,
    `nb_total_analises_disponiveis` INTEGER NOT NULL DEFAULT 0,
    `dt_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dt_updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dispositivo_resumo_comentario_id_dispositivo_key`(`id_dispositivo`),
    PRIMARY KEY (`id_resumo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dispositivo_resumo_comentario` ADD CONSTRAINT `dispositivo_resumo_comentario_id_dispositivo_fkey` FOREIGN KEY (`id_dispositivo`) REFERENCES `dispositivo`(`id_dispositivo`) ON DELETE CASCADE ON UPDATE CASCADE;
