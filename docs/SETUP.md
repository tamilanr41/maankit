# Local setup

## Prerequisites

- Node.js 20+ with npm.
- MySQL 8+.
- Optional Cloudinary account for administrator image uploads.
- Optional WhatsApp Business contact number for click-to-chat ordering.

## 1. Create the database

Create a MySQL database with UTF-8 support. For example, in a MySQL client:

```sql
CREATE DATABASE mann_ki_mannat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Use a dedicated database user with privileges to create and update tables for migrations. Set its connection string in `backend/.env`.

## 2. Configure environment files

Copy the examples:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Set these backend values in `backend/.env`:

- `DATABASE_URL`: MySQL connection string, such as `mysql://user:password@localhost:3306/mann_ki_mannat`.
- `JWT_SECRET`: a cryptographically random string with at least 32 characters.
- `FRONTEND_URL`: the exact public frontend origin. Keep `http://localhost:5173` locally.
- `WHATSAPP_BUSINESS_NUMBER`: optional digits-only number with country code; no `+`, spaces, or punctuation.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`: optional until image uploads are needed.

Set `VITE_API_URL` and `VITE_SITE_URL` in `frontend/.env`. For local development these are `http://localhost:5000/api/v1` and `http://localhost:5173`. `VITE_DEMO_MODE=true` enables a labelled preview using the supplied product package imagery if the API catalog is empty. It does not show prices or enable checkout for preview products. Set it to `false` for a real storefront.

Restart Vite after changing frontend environment values.

## 3. Install, migrate, and seed

Run from the repository root:

```powershell
npm install
npm install --prefix frontend
npm install --prefix backend
npm run db:generate
npm run db:deploy
npm run db:seed
```

`db:deploy` applies the checked-in migration. Seeding creates six categories, seven inactive product records with the supplied images, administrator roles, baseline settings, and the requested ₹75 price, 3-piece minimum, contact details, and 12-piece ₹60-off/free-shipping offer. Products remain inactive with zero stock until you verify inventory and activate them. Configure the shipping fee for orders below 12 pieces before accepting those orders.

## 4. Create the first owner

The admin login screen includes **Create the owner account** for the first account. To safely enable this one-time flow, configure `ADMIN_SETUP_TOKEN` in `backend/.env` with a random value of at least 32 characters, start the API, then open `/admin/login`. Enter the token in the setup form and create the owner using an email address and a unique password of at least 16 characters.

Generate a token with Node.js:

```powershell
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

After creating the owner, remove `ADMIN_SETUP_TOKEN` from `backend/.env` and restart the API. The endpoint also locks itself after an active owner exists. Additional team accounts are created from the admin **Team access** page. The `npm run admin:create` command remains available as a server-side alternative.

## 5. Run the applications

```powershell
npm run dev
```

- Storefront: `http://localhost:5173`
- Admin: `http://localhost:5173/admin/login`
- Backend health: `http://localhost:5000/health`
- API base: `http://localhost:5000/api/v1`

## Troubleshooting

- **Backend fails at startup:** verify `backend/.env` exists and `DATABASE_URL` and `JWT_SECRET` are set. Required values are checked at startup.
- **Database connection error:** check that MySQL is running, the URL is correct, and the database user can connect and migrate.
- **Storefront cannot reach the API:** check `VITE_API_URL`, `FRONTEND_URL`, and the browser console. The backend only allows the configured frontend origin.
- **No products appear:** seeded products are inactive until an administrator enters verified price and stock, then activates them. Demo preview is separate from live API products.
- **Checkout reports that shipping is not configured:** set `shippingChargePaise` in Admin → Settings. The default free-shipping threshold is six eligible units.
- **Image upload fails:** add all three Cloudinary values and restart the backend. Existing supplied PNG assets are served from the frontend and do not need Cloudinary.
- **WhatsApp link is missing:** configure the store WhatsApp number in settings or `WHATSAPP_BUSINESS_NUMBER`.

## Production build

After configuring production environment values and applying migrations, run `npm run build`. Deploy the generated `frontend/dist` directory to a static host and start the Express backend with `npm run start`. See [DEPLOYMENT.md](DEPLOYMENT.md). `npm test` runs the included health, pricing, and shipping checks. In this workspace the frontend build, all nine tests, and Prisma schema validation passed; live database/API and browser end-to-end behavior still need staging credentials and a configured MySQL instance.
