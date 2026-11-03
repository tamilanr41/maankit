# Mann Ki Mannat

A premium, responsive storefront and administration workspace for the Mann Ki Mannat spiritual lifestyle catalogue. The customer experience uses the supplied poster and product photographs, with a forest green, ivory, cream, and saffron visual system. The project is split into a React/Vite frontend and an Express/Prisma/MySQL backend.

## What is included

- Customer pages for home, shop, product details, brand story, contact, cart, checkout, order status, and policies.
- Responsive product search and catalogue filters, cart persistence, server price and stock checks, quantity rules, and configurable shipping.
- Order enquiries saved to MySQL, then WhatsApp opens with the order details prefilled. The customer still needs to tap Send; enquiries are not automatically confirmed or paid.
- Admin sign-in, dashboard, product and category management, order and inventory tools, offers, banners, content, FAQs, reviews, enquiries, newsletter, chatbot FAQs, settings, reports, and team access.
- Prisma schema and initial MySQL migration, seed records, CSV exports, Cloudinary product-image upload route, security middleware, and setup documentation.
- A labelled design preview mode for seeing the supplied imagery before a live catalogue is configured.

The starter products use the requested ₹75 price and 3-piece minimum; the 12-piece offer gives ₹60 off and free shipping. Products stay inactive with zero stock until the store owner records actual stock and activates them. The shipping fee below 12 pieces remains for the owner to configure.

## Requirements

- Node.js 20 or later and npm.
- MySQL 8 or later.
- Cloudinary credentials only if administrators will upload product images.
- A WhatsApp Business number if order enquiries should open a prefilled click-to-chat message.

## Quick start

1. Create a MySQL database named `mann_ki_mannat` using `utf8mb4`.
2. Copy `backend/.env.example` to `backend/.env` and set the database URL and a random `JWT_SECRET` of at least 32 characters. Keep the configured frontend origin as `http://localhost:5173` for local development.
3. Copy `frontend/.env.example` to `frontend/.env`. The default `VITE_DEMO_MODE=true` enables the clearly marked image preview when there is no live catalogue. Set it to `false` for a live deployment.
4. From the project root, run:

   ```powershell
   npm install
   npm install --prefix frontend
   npm install --prefix backend
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

5. Set a random `ADMIN_SETUP_TOKEN` (at least 32 characters) in `backend/.env`. Start the API, open `/admin/login`, and use **Create the owner account** to set the first owner's name, email, and unique password (16 or more characters). Remove the setup token and restart the API after account creation. `npm run admin:create` remains available as a server-side alternative.
6. Start both apps from the project root with `npm run dev`. The storefront is at `http://localhost:5173`; the API health endpoint is at `http://localhost:5000/health`.
7. Sign in at `http://localhost:5173/admin/login`. Configure verified product prices and stock, store details, shipping charge, WhatsApp number, policies, and homepage content before activating products.

See [SETUP.md](docs/SETUP.md) for the full local setup and [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) for store configuration.

## Deploy on Render and Netlify

This repository includes `render.yaml` for the API and `netlify.toml` for the storefront. Follow [GO_LIVE_RENDER_NETLIFY.md](docs/GO_LIVE_RENDER_NETLIFY.md) for the database, Render Blueprint, Netlify site, first owner account, and post-deploy checks. Render does not provide managed MySQL, so use an external MySQL 8 service such as Aiven MySQL.

## Environment and integrations

Backend startup validates required settings. The `.env.example` files contain only placeholders; never commit real secrets. Cloudinary and WhatsApp credentials are optional during development, but their associated workflows require configuration. After an enquiry is saved, the browser opens the WhatsApp click-to-chat link; the application cannot tell whether the customer sent the message. No online payment provider is wired in this version.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Vite frontend and Express backend together |
| `npm run build` | Build the frontend for production |
| `npm run start` | Start the backend |
| `npm test` | Run backend health, pricing, and shipping tests |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:deploy` | Apply committed Prisma migrations |
| `npm run db:seed` | Add starter categories, inactive products, roles, and baseline settings |
| `npm run admin:create` | Create the first OWNER account from shell environment variables |

## Project documentation

- [Local setup](docs/SETUP.md)
- [Database and seed data](docs/DATABASE.md)
- [REST API](docs/API.md)
- [Admin guide](docs/ADMIN_GUIDE.md)
- [Production deployment](docs/DEPLOYMENT.md)
- [Render + Netlify go-live guide](docs/GO_LIVE_RENDER_NETLIFY.md)

## Project status

The frontend production build passes; nine backend health, pricing, and shipping tests pass; and Prisma schema validation passes. The initial SQL migration matches the Prisma-generated schema. Separate npm lockfiles and install steps avoid workspace symlinks on Windows. The dependency audit reports zero vulnerabilities. A live MySQL migration, full API/end-to-end checks, and production deployment still require a configured MySQL service and business credentials. Configure those services and run the documented deployment checks before treating the site as production-ready.
