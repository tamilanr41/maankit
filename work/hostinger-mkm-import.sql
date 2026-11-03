-- Mann Ki Mannat isolated schema import for u806671157_Aruvixlabs

-- Creates only mkm_* application tables; existing products/orders/customers/banners are untouched.

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

CREATE TABLE `_prisma_migrations` (
  `id` VARCHAR(36) NOT NULL,
  `checksum` VARCHAR(64) NOT NULL,
  `finished_at` DATETIME(3) NULL,
  `migration_name` VARCHAR(255) NOT NULL,
  `logs` TEXT NULL,
  `rolled_back_at` DATETIME(3) NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `started_at`, `applied_steps_count`) VALUES ('677dca5a-f9f3-4129-a089-e6eefa96a0e5', '4f7bf1a964a3338a561beed94d7b2678c125d091b258accc61cd61a630d72ad9', '2026-11-02 06:19:57.774', '20261102000000_init', '2026-11-02 06:19:57.774', 1);

INSERT INTO `mkm_roles` (`id`,`name`,`description`,`createdAt`,`updatedAt`) VALUES
('mkm_seed_role_owner','OWNER','Full access to store management.',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_role_admin','ADMIN','Administrator access.',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_role_editor','EDITOR','Catalogue and content access.',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3));

INSERT INTO `mkm_categories` (`id`,`name`,`slug`,`description`,`imageUrl`,`active`,`sortOrder`,`createdAt`,`updatedAt`) VALUES
('mkm_seed_cat_oothuvathi','Oothuvathi','oothuvathi','Incense sticks for everyday rituals.','/images/royal-sandal.png',1,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_cat_sambrani','Sambrani','sambrani','Sambrani cups and resin.','/images/natural-loban.png',1,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_cat_pooja','Pooja Items','pooja-items','Pooja essentials and ritual items.','/images/brand-poster.png',1,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_cat_home_fragrance','Home Fragrance','home-fragrance','Fragrance for the home.','/images/fragrance-oil.png',1,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_cat_cleaning','Cleaning & Care','cleaning-care','Everyday cleaning and care.','/images/royal-patchouli.png',1,5,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_cat_festival','Festival Specials','festival-specials','Seasonal collections.','/images/good-gugal.png',1,6,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3));

INSERT INTO `mkm_products` (`id`,`name`,`slug`,`sku`,`shortDescription`,`mrpPaise`,`sellingPricePaise`,`minimumOrderQuantity`,`stockQuantity`,`lowStockThreshold`,`active`,`featured`,`categoryId`,`createdAt`,`updatedAt`) VALUES
('mkm_seed_prod_royal_sandal','Royal Sandal','royal-sandal','MKM-INC-001','Incense sticks','7500','7500','3','0','5','0','1','mkm_seed_cat_oothuvathi',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_prod_natural_loban','Natural Loban','natural-loban','MKM-SAM-001','Premium sambrani cup','7500','7500','3','0','5','0','1','mkm_seed_cat_sambrani',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_prod_good_gugal','Good Gugal','good-gugal','MKM-SAM-002','Premium sambrani cup','7500','7500','3','0','5','0','0','mkm_seed_cat_sambrani',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_prod_royal_oudh','Royal Oudh','royal-oudh','MKM-INC-002','Incense sticks','7500','7500','3','0','5','0','0','mkm_seed_cat_oothuvathi',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_prod_royal_lavender','Royal Lavender','royal-lavender','MKM-INC-003','Incense sticks','7500','7500','3','0','5','0','1','mkm_seed_cat_oothuvathi',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_prod_royal_patchouli','Royal Patchouli','royal-patchouli','MKM-INC-004','Incense sticks','7500','7500','3','0','5','0','0','mkm_seed_cat_oothuvathi',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_prod_fragrance_oil','Fragrance Oil','fragrance-oil','MKM-HFR-001','Fragrance oil','7500','7500','3','0','5','0','0','mkm_seed_cat_home_fragrance',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3));

INSERT INTO `mkm_product_images` (`id`,`productId`,`url`,`altText`,`sortOrder`,`isPrimary`) VALUES
('mkm_seed_img_1','mkm_seed_prod_royal_sandal','/images/royal-sandal.png','Royal Sandal package',0,1),
('mkm_seed_img_2','mkm_seed_prod_natural_loban','/images/natural-loban.png','Natural Loban package',0,1),
('mkm_seed_img_3','mkm_seed_prod_good_gugal','/images/good-gugal.png','Good Gugal package',0,1),
('mkm_seed_img_4','mkm_seed_prod_royal_oudh','/images/royal-oudh.png','Royal Oudh package',0,1),
('mkm_seed_img_5','mkm_seed_prod_royal_lavender','/images/royal-lavender.png','Royal Lavender package',0,1),
('mkm_seed_img_6','mkm_seed_prod_royal_patchouli','/images/royal-patchouli.png','Royal Patchouli package',0,1),
('mkm_seed_img_7','mkm_seed_prod_fragrance_oil','/images/fragrance-oil.png','Fragrance Oil package',0,1);

INSERT INTO `mkm_site_settings` (`id`,`key`,`value`,`createdAt`,`updatedAt`) VALUES
('mkm_seed_setting_1','businessName','"Mann Ki Mannat"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_2','tagline','"Har Ghar Ki Mannat, Ab Ek Hi Jagah"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_3','announcementBar','"Minimum 3 pieces · ₹75 per piece · Free shipping on 12 pieces"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_4','currency','"INR"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_5','globalMinimumQuantity','3',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_6','freeShippingThreshold','12',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_7','mixedCartShippingPolicy','"eligible_items"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_8','promoText','"Buy 12 pieces for ₹840: ₹60 off and free shipping. Shipping charges apply to 6 pieces."',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_9','phone','"8680871115"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_10','whatsappNumber','"918680871115"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_11','address','"4-6-369, Gali street, Tirupati, Andhra Pradesh"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_12','chatbotEnabled','true',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_13','chatbotWelcome','"I can help with current product details, prices, availability, and store policies. What would you like to explore?"',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('mkm_seed_setting_14','shippingChargePaise','null',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3));

INSERT INTO `mkm_offers` (`id`,`name`,`description`,`promoText`,`discountType`,`discountValue`,`minimumOrderPaise`,`freeShippingThreshold`,`active`,`createdAt`,`updatedAt`) VALUES ('mkm_seed_offer_12_piece', '12 pieces: ₹60 off + free shipping', 'Buy 12 pieces at ₹75 each, get ₹60 off and free shipping.', '12 pieces · ₹60 off · Free shipping', 'FIXED', 6000, 90000, 12, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
