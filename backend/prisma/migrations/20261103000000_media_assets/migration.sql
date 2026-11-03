-- CreateTable
CREATE TABLE `mkm_media_assets` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(200) NOT NULL,
    `mimeType` VARCHAR(60) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `data` LONGBLOB NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mkm_media_assets_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
