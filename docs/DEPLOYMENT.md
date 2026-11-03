# Production deployment

For the Render + Netlify setup used by this repository, follow
[GO_LIVE_RENDER_NETLIFY.md](GO_LIVE_RENDER_NETLIFY.md). The notes below cover
the general production requirements.

The application is split into a static React frontend and an Express API. Choose hosting that supports static SPA fallback, Node.js 20+, and managed MySQL 8. Use HTTPS for both origins.

## Configure production

- Set backend `NODE_ENV=production`, `PORT`, `DATABASE_URL`, a unique random `JWT_SECRET` (32+ characters), and the exact `FRONTEND_URL` origin.
- Configure `WHATSAPP_BUSINESS_NUMBER` if click-to-chat order enquiries are enabled.
- Configure all Cloudinary credentials if the product image upload workflow is enabled.
- Set frontend `VITE_API_URL` to the public API base ending in `/api/v1`, `VITE_SITE_URL` to the canonical website origin, and `VITE_DEMO_MODE=false`.
- Keep actual secrets in the hosting provider's secret manager. Never place backend credentials in frontend environment variables.
- Restrict database network access to the backend and operations staff. Enable TLS, automated backups, retention, and alerting with the managed database provider.

## Deploy sequence

1. Provision the database and production environment variables.
2. Install dependencies and generate Prisma Client during the build/deploy pipeline.
3. Apply committed migrations with `npm run db:deploy`.
4. Seed baseline records only for a new environment with `npm run db:seed`.
5. Create the initial owner using `ADMIN_EMAIL`, `ADMIN_PASSWORD` (16+ characters), and optional `ADMIN_NAME`; remove the password immediately afterward.
6. Build the static frontend with `npm run build` and publish `frontend/dist`.
7. Start the backend with `npm run start`, expose `/health` to platform health checks, and set the frontend host to serve `index.html` for client-side routes.
8. In the admin workspace, enter verified contact information, policies, shipping charge, product data, inventory, and active status. Confirm the live WhatsApp destination and test a controlled order enquiry before public launch.

Configure CORS with the exact deployed frontend origin. If frontend and API are on different sites, confirm that the hosting setup supports credentialed HTTPS cookies and the browser's cross-site cookie rules. Prefer same-site subdomains or a reverse proxy when available.

## Operational considerations

- Order enquiries do not become confirmed sales automatically, and no payment provider is configured.
- The chatbot is a database-backed FAQ/catalogue assistant, not a generative AI service.
- The current Vite frontend is a client-rendered SPA. Product structured data and metadata are updated client-side; add prerendering or server rendering for stronger crawlability of individual product routes before depending on SEO acquisition.
- Set up backup restoration, log retention and redaction, dependency update review, monitoring, and privacy/retention procedures for customer data.
- The frontend production build, nine health/pricing/shipping tests, Prisma schema validation, and generated-schema comparison for the initial migration passed in this workspace. The migration was not applied to a live MySQL instance, and production deployment has not been run. Apply it and verify API, browser checkout, image upload, and WhatsApp behavior in staging before production use.
