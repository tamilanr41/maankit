-- Configure a flat delivery charge for carts below the free-shipping
-- threshold. Existing values are never overwritten.
INSERT INTO `mkm_site_settings` (`id`, `key`, `value`, `updatedBy`, `createdAt`, `updatedAt`)
VALUES ('mkm_default_shipping_charge', 'shippingChargePaise', CAST(6000 AS JSON), 'system', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;
