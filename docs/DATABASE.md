# Database

MySQL 8 is the sole application database. Prisma schema, migration, and seed files are under `backend/prisma/`.

## Schema areas

- **Identity and access:** `Role`, `AdminUser`, and `AdminActivityLog`.
- **Catalogue:** `Category`, `Product`, and `ProductImage`.
- **Orders and stock:** `Customer`, `CustomerAddress`, `Order`, `OrderItem`, `OrderStatusHistory`, `Payment`, `InventoryMovement`, and `IdempotencyRecord`.
- **Store content:** `Offer`, `Banner`, `SiteSetting`, `ContentPage`, `Faq`, `ChatbotFaq`, and `Review`.
- **Customer contacts:** `Enquiry` and `NewsletterSubscriber`.

The schema uses foreign keys, unique constraints, indexes, enum statuses, paise-denominated integer prices, and order item snapshots. The snapshot retains the item name, SKU, quantity, MRP, and selling price at enquiry time. Order creation and its related records are written transactionally. Customer details stay in the protected admin API; the public order-reference endpoint returns a limited summary unless the matching order token is supplied.

## Migrations

For a new database, configure `DATABASE_URL`, generate Prisma Client, then apply migrations:

```powershell
npm run db:generate
npm run db:deploy
```

The initial migration is `20261102000000_init`. For future schema edits, update `schema.prisma`, create a migration in a development database with `npm run db:migrate`, review the generated SQL, and apply committed migrations with `npm run db:deploy` in deployed environments.

## Seed records

`npm run db:seed` creates:

- Six catalogue categories.
- Seven product records matched to the supplied package images.
- OWNER, ADMIN, and EDITOR roles.
- Baseline settings for the brand name, tagline, minimum quantity (3), free-shipping threshold (6), and mixed-cart policy.

Seeded products remain inactive with null MRP and selling price, zero stock, and minimum order quantity 3. This avoids presenting illustrative pricing or inventory as real business data. Existing products with matching SKUs are not overwritten.

## Price and shipping storage

Product and order amounts use integer paise. For example, ₹96 is stored as `9600`. Configure product MRP and selling price independently. Do not treat the sample MRP from the project brief as a selling price. The pricing service checks product active status, available stock, minimum quantities, valid offers, configured shipping charge, and free-shipping eligibility on the server.

## Backup and data handling

Use managed MySQL backups or a documented `mysqldump` schedule, encrypt backup storage, restrict access, and periodically test recovery in a separate environment. Customer address, telephone, and email values are personal data; expose them only to authorized administrators and apply the business's retention and privacy policy.
