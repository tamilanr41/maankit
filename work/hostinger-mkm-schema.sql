-- CreateTable
CREATE TABLE `mkm_roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,

    UNIQUE INDEX `mkm_admin_users_email_key`(`email`),
    INDEX `mkm_admin_users_roleId_active_idx`(`roleId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `imageUrl` VARCHAR(500) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_categories_slug_key`(`slug`),
    INDEX `mkm_categories_active_sortOrder_idx`(`active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `slug` VARCHAR(200) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,
    `shortDescription` VARCHAR(300) NULL,
    `mrpPaise` INTEGER NULL,
    `sellingPricePaise` INTEGER NULL,
    `minimumOrderQuantity` INTEGER NOT NULL DEFAULT 3,
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `lowStockThreshold` INTEGER NOT NULL DEFAULT 5,
    `shippingEligible` BOOLEAN NOT NULL DEFAULT true,
    `minimumQuantity` INTEGER NULL,
    `freeShippingQuantity` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `seasonal` BOOLEAN NOT NULL DEFAULT false,
    `ingredients` TEXT NULL,
    `usageInstructions` TEXT NULL,
    `fragrance` VARCHAR(180) NULL,
    `seoTitle` VARCHAR(180) NULL,
    `seoDescription` VARCHAR(300) NULL,
    `categoryId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `archivedAt` DATETIME(3) NULL,

    UNIQUE INDEX `mkm_products_slug_key`(`slug`),
    UNIQUE INDEX `mkm_products_sku_key`(`sku`),
    INDEX `mkm_products_categoryId_active_idx`(`categoryId`, `active`),
    INDEX `mkm_products_active_featured_createdAt_idx`(`active`, `featured`, `createdAt`),
    INDEX `mkm_products_stockQuantity_active_idx`(`stockQuantity`, `active`),
    FULLTEXT INDEX `mkm_products_name_shortDescription_description_idx`(`name`, `shortDescription`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_product_images` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `publicId` VARCHAR(255) NULL,
    `altText` VARCHAR(200) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mkm_product_images_productId_sortOrder_idx`(`productId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_product_variants` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `mrpPaise` INTEGER NULL,
    `sellingPricePaise` INTEGER NULL,
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_product_variants_sku_key`(`sku`),
    INDEX `mkm_product_variants_productId_active_idx`(`productId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_customers` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `phone` VARCHAR(24) NOT NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_customers_phone_key`(`phone`),
    INDEX `mkm_customers_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_addresses` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `pinCode` VARCHAR(10) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mkm_addresses_customerId_isDefault_idx`(`customerId`, `isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(40) NOT NULL,
    `publicToken` VARCHAR(64) NOT NULL,
    `idempotencyKey` VARCHAR(120) NULL,
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(160) NOT NULL,
    `customerPhone` VARCHAR(24) NOT NULL,
    `customerEmail` VARCHAR(191) NULL,
    `addressSnapshot` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `pinCode` VARCHAR(10) NOT NULL,
    `deliveryInstructions` TEXT NULL,
    `subtotalPaise` INTEGER NOT NULL,
    `shippingPaise` INTEGER NOT NULL,
    `discountPaise` INTEGER NOT NULL DEFAULT 0,
    `totalPaise` INTEGER NOT NULL,
    `orderStatus` ENUM('ENQUIRY', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'ENQUIRY',
    `paymentStatus` ENUM('UNPAID', 'PENDING', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `internalNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_orders_orderNumber_key`(`orderNumber`),
    UNIQUE INDEX `mkm_orders_publicToken_key`(`publicToken`),
    UNIQUE INDEX `mkm_orders_idempotencyKey_key`(`idempotencyKey`),
    INDEX `mkm_orders_orderStatus_createdAt_idx`(`orderStatus`, `createdAt`),
    INDEX `mkm_orders_customerPhone_createdAt_idx`(`customerPhone`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_order_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(180) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `variantName` VARCHAR(120) NULL,
    `mrpPaise` INTEGER NULL,
    `sellingPricePaise` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lineTotalPaise` INTEGER NOT NULL,

    INDEX `mkm_order_items_orderId_idx`(`orderId`),
    INDEX `mkm_order_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_order_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('ENQUIRY', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NULL,
    `toStatus` ENUM('ENQUIRY', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL,
    `note` VARCHAR(500) NULL,
    `changedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mkm_order_status_history_orderId_createdAt_idx`(`orderId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_payments` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(60) NOT NULL,
    `providerPaymentId` VARCHAR(160) NULL,
    `amountPaise` INTEGER NOT NULL,
    `status` ENUM('UNPAID', 'PENDING', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mkm_payments_orderId_status_idx`(`orderId`, `status`),
    UNIQUE INDEX `mkm_payments_provider_providerPaymentId_key`(`provider`, `providerPaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_inventory_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `change` INTEGER NOT NULL,
    `reason` VARCHAR(180) NOT NULL,
    `reference` VARCHAR(80) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mkm_inventory_transactions_productId_createdAt_idx`(`productId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_offers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `promoText` VARCHAR(300) NULL,
    `discountType` VARCHAR(30) NOT NULL,
    `discountValue` INTEGER NOT NULL,
    `minimumOrderPaise` INTEGER NULL,
    `freeShippingThreshold` INTEGER NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mkm_offers_active_startsAt_endsAt_idx`(`active`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_coupons` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(60) NOT NULL,
    `discountType` VARCHAR(30) NOT NULL,
    `discountValue` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `usageLimit` INTEGER NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_coupons_code_key`(`code`),
    INDEX `mkm_coupons_active_startsAt_endsAt_idx`(`active`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_banners` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `subtitle` VARCHAR(300) NULL,
    `imageUrl` VARCHAR(500) NOT NULL,
    `publicId` VARCHAR(255) NULL,
    `linkUrl` VARCHAR(500) NULL,
    `placement` VARCHAR(60) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mkm_banners_placement_active_sortOrder_idx`(`placement`, `active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_site_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `value` JSON NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_site_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_pages` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `seoTitle` VARCHAR(180) NULL,
    `seoDescription` VARCHAR(300) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_pages_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_faqs` (
    `id` VARCHAR(191) NOT NULL,
    `question` VARCHAR(500) NOT NULL,
    `answer` TEXT NOT NULL,
    `category` VARCHAR(100) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mkm_faqs_active_sortOrder_idx`(`active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `rating` INTEGER NOT NULL,
    `title` VARCHAR(180) NULL,
    `body` TEXT NOT NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `hidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mkm_reviews_productId_approved_hidden_idx`(`productId`, `approved`, `hidden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_enquiries` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(24) NULL,
    `subject` VARCHAR(180) NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mkm_enquiries_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `mkm_enquiries_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_newsletter_subscribers` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `unsubscribeToken` VARCHAR(64) NOT NULL,
    `consent` BOOLEAN NOT NULL DEFAULT false,
    `consentAt` DATETIME(3) NULL,
    `unsubscribedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mkm_newsletter_subscribers_email_key`(`email`),
    UNIQUE INDEX `mkm_newsletter_subscribers_unsubscribeToken_key`(`unsubscribeToken`),
    INDEX `mkm_newsletter_subscribers_unsubscribedAt_createdAt_idx`(`unsubscribedAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_chatbot_faqs` (
    `id` VARCHAR(191) NOT NULL,
    `question` VARCHAR(300) NOT NULL,
    `answer` TEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mkm_chatbot_faqs_active_sortOrder_idx`(`active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_chat_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(120) NOT NULL,
    `messages` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mkm_chat_sessions_sessionId_key`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mkm_admin_activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `adminEmail` VARCHAR(191) NOT NULL,
    `action` VARCHAR(120) NOT NULL,
    `entity` VARCHAR(120) NULL,
    `entityId` VARCHAR(120) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mkm_admin_activity_logs_adminEmail_createdAt_idx`(`adminEmail`, `createdAt`),
    INDEX `mkm_admin_activity_logs_entity_entityId_idx`(`entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mkm_admin_users` ADD CONSTRAINT `mkm_admin_users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `mkm_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_products` ADD CONSTRAINT `mkm_products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `mkm_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_product_images` ADD CONSTRAINT `mkm_product_images_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `mkm_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_product_variants` ADD CONSTRAINT `mkm_product_variants_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `mkm_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_addresses` ADD CONSTRAINT `mkm_addresses_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `mkm_customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_orders` ADD CONSTRAINT `mkm_orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `mkm_customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_order_items` ADD CONSTRAINT `mkm_order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `mkm_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_order_items` ADD CONSTRAINT `mkm_order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `mkm_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_order_status_history` ADD CONSTRAINT `mkm_order_status_history_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `mkm_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_payments` ADD CONSTRAINT `mkm_payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `mkm_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_inventory_transactions` ADD CONSTRAINT `mkm_inventory_transactions_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `mkm_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_reviews` ADD CONSTRAINT `mkm_reviews_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `mkm_customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mkm_reviews` ADD CONSTRAINT `mkm_reviews_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `mkm_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
