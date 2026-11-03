-- Additive, idempotent catalogue update for Mann Ki Mannat.
-- Does not drop, rename, or alter existing tables or the original unprefixed tables.
START TRANSACTION;

INSERT INTO `mkm_categories` (`id`, `name`, `slug`, `description`, `imageUrl`, `active`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('mkm_future_cat_perfumes','Long-lasting Perfumes','long-lasting-perfumes','Coming soon: long-lasting perfumes.',NULL,0,7,NOW(3),NOW(3)),
('mkm_future_cat_attars','Attars','attars','Coming soon: traditional attars.',NULL,0,8,NOW(3),NOW(3)),
('mkm_future_cat_cones','Incense Cones','cones','Coming soon: incense cones.',NULL,0,9,NOW(3),NOW(3)),
('mkm_future_cat_dhoop','Dhoop Sticks','dhoop-sticks','Coming soon: dhoop sticks.',NULL,0,10,NOW(3),NOW(3)),
('mkm_future_cat_room_sprays','Room Sprays','room-sprays','Coming soon: room sprays.',NULL,0,11,NOW(3),NOW(3)),
('mkm_future_cat_bulk_agarbatti','Bulk Pack Agarbatti','bulk-pack-agarbatti','Coming soon: bulk-pack agarbatti.',NULL,0,12,NOW(3),NOW(3))
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`), `sortOrder`=VALUES(`sortOrder`), `updatedAt`=NOW(3);

INSERT INTO `mkm_products` (`id`, `name`, `slug`, `sku`, `shortDescription`, `description`, `mrpPaise`, `sellingPricePaise`, `minimumOrderQuantity`, `stockQuantity`, `lowStockThreshold`, `active`, `featured`, `seasonal`, `categoryId`, `createdAt`, `updatedAt`) VALUES
('mkm_seed_prod_prithvi_sambrani_36','Prithvi Cup Sambrani · 36 Cups','prithvi-cup-sambrani-36','MKM-SAM-003','36 sambrani cups in a jar · Diwali & Karthigai Deepam special','A jar of 36 Prithvi Cup Sambrani cups, selected for the Diwali and Karthigai Deepam season. MRP ₹249 per jar. Message us on WhatsApp to confirm availability and place your order.','24900','24900','1','0','5','1','1','1','mkm_seed_cat_sambrani',NOW(3),NOW(3))
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `shortDescription`=VALUES(`shortDescription`), `description`=VALUES(`description`), `mrpPaise`=VALUES(`mrpPaise`), `sellingPricePaise`=VALUES(`sellingPricePaise`), `minimumOrderQuantity`=VALUES(`minimumOrderQuantity`), `active`=1, `featured`=1, `seasonal`=1, `categoryId`=VALUES(`categoryId`), `updatedAt`=NOW(3);

INSERT INTO `mkm_product_images` (`id`, `productId`, `url`, `altText`, `sortOrder`, `isPrimary`, `createdAt`)
SELECT 'mkm_seed_img_prithvi_sambrani_36', `id`, '/images/prithvi-sambrani-36.png', 'Prithvi Cup Sambrani jar with 36 cups', 0, 1, NOW(3)
FROM `mkm_products` WHERE `sku`='MKM-SAM-003'
ON DUPLICATE KEY UPDATE `url`=VALUES(`url`), `altText`=VALUES(`altText`), `sortOrder`=0, `isPrimary`=1;

COMMIT;
