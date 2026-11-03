# Deploy on Render + Netlify

This is the step-by-step path for this repository:

- **Backend (Express + Prisma):** Render Web Service
- **Frontend (React + Vite):** Netlify
- **Database:** external MySQL 8 (this guide uses Hostinger MySQL; Render does not
  offer managed MySQL)

The repository already contains `render.yaml` and `netlify.toml`, so most build
settings are automatic.

---

## 0. Before you start

You need:

- A GitHub repository containing this project.
- A [Render](https://render.com) account.
- A [Netlify](https://netlify.com) account.
- A MySQL 8 database. This guide uses **Hostinger MySQL**, which you already
  have. Any other MySQL 8 host also works.
- Optional: Cloudinary account (product image uploads). The WhatsApp number is
  already set in `render.yaml`.

Never commit real `.env` files or passwords. All production secrets belong in
the Render and Netlify dashboards.

---

## 1. Connect the Hostinger MySQL database

Hostinger databases are localhost-only by default. Render connects from outside
Hostinger, so you must allow remote access first.

1. Open **Hostinger hPanel → Websites → Manage → Databases → MySQL Databases**.
   Create a database if you do not already have one. Hostinger creates the
   database user automatically; note the full database name, username, and
   password (they usually contain an account prefix such as `u123456789_`).
2. Open **Databases → Remote MySQL**. Enter `%` in the IP field (or tick
   **Any Host**), select the database, and click **Create**. Render's free
   service has no fixed outbound IP, so `%` is required. Authentication still
   uses the database username and password.
3. Copy the **MySQL hostname** shown at the top of the Remote MySQL page, for
   example `srv1517.hstgr.io`. The remote port is `3306`.
4. Build the Prisma connection string:

   ```text
   mysql://DB_USER:DB_PASSWORD@srv1517.hstgr.io:3306/DB_NAME
   ```

   Hostinger shared MySQL usually connects without an SSL parameter. Add
   `?sslaccept=strict` only if your Hostinger plan requires SSL. If you see an
   SSL error, remove that parameter.

5. Keep this URL private. It is the `DATABASE_URL` for Render.

### Existing Hostinger database

If this database already contains the Mann Ki Mannat tables, you can import the
provided SQL instead of letting Prisma create them:

1. Open **Hostinger hPanel → Databases → phpMyAdmin** for the database.
2. Import [`work/hostinger-mkm-import.sql`](../work/hostinger-mkm-import.sql).
   It creates the `mkm_*` tables, baseline settings, and the Prisma migration
   record.
3. Because the migration record is included, Render's `prisma migrate deploy`
   will skip the already-applied migration. Do **not** run `npm run db:seed`
   again on that database.

For a new empty database, let Render apply the migration and run the seed once
as described in step 3.

> The database user needs permission to create tables and indexes because
> `prisma migrate deploy` runs during the Render build.

---

## 2. Push the code to GitHub

From the project root:

```powershell
git init
git add .
git commit -m "Prepare Render and Netlify deployment"
git branch -M main
git remote add origin https://github.com/tamilanr41/maankit.git
git push -u origin main
```

If the remote already exists, use:

```powershell
git remote set-url origin https://github.com/tamilanr41/maankit.git
git push -u origin main
```

---

## 3. Deploy the backend on Render

1. Open **Render Dashboard → New → Blueprint**.
2. Select the `maankit` repository.
3. Render reads `render.yaml` and asks for the values marked `sync: false`.
   Only these two need to be entered:
   - `DATABASE_URL` — the Hostinger MySQL URL from step 1.
   - `FRONTEND_URL` — the final Netlify origin, for example
     `https://maankit.netlify.app` (no trailing slash). If you have not created
     the Netlify site yet, enter a temporary value and update it later.

   `JWT_SECRET` and `ADMIN_SETUP_TOKEN` are generated automatically by Render.
   The WhatsApp number is already set. Add Cloudinary variables later only if
   you need product image uploads.
4. Apply the Blueprint.

Render will:

- install backend dependencies (including Prisma CLI for the build),
- generate Prisma Client,
- apply the committed migration with `prisma migrate deploy` during the build,
- start the API and check `/health`.

When the service is live, copy its URL, for example:

```text
https://maankit.onrender.com
```

Render may add a suffix if the service name is already taken. Use the exact URL
shown in the dashboard.

Test it in a browser:

```text
https://maankit.onrender.com/health
```

Expected response:

```json
{ "success": true, "status": "ok" }
```

### Seed the new database once

Skip this section if you already imported `work/hostinger-mkm-import.sql` into
the Hostinger database.

Open **Render Dashboard → your service → Shell** and run:

```powershell
npm run db:seed
```

This adds the starter categories, inactive products, roles, and site settings.
Run it only for a new database.

### Create the first owner account

Use the `ADMIN_SETUP_TOKEN` generated by Render:

1. Open `https://YOUR-SITE.netlify.app/admin/login`.
2. Choose **Create the owner account**.
3. Paste the setup token from **Render → Environment**.
4. Set the owner name, email, and a unique password of 16 or more characters.
5. After the account is created, delete `ADMIN_SETUP_TOKEN` from Render and
   redeploy. This disables public setup permanently.

---

## 4. Deploy the frontend on Netlify

1. Open **Netlify → Add new site → Import an existing project**.
2. Select the GitHub repository.
3. Leave **Base directory** empty. `netlify.toml` already sets
   `base = "frontend"`, the build command, and the publish folder.
4. Add these environment variables under **Site configuration → Environment
   variables**:

   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://maankit.onrender.com/api/v1` |
   | `VITE_SITE_URL` | `https://maankit.netlify.app` |
   | `VITE_DEMO_MODE` | `false` |

   Use your real Render URL and Netlify URL. The API URL must end in `/api/v1`.
5. Deploy the site.

`netlify.toml` also adds:

- React Router fallback to `index.html`,
- long-term caching for hashed assets,
- basic security headers.

### After Netlify gives you the site URL

If you used a temporary `FRONTEND_URL` on Render, update it now:

1. Render → your service → **Environment**.
2. Set `FRONTEND_URL` to the exact Netlify origin, for example
   `https://maankit.netlify.app`.
3. Save and let Render redeploy.

Then confirm the Netlify environment variable `VITE_API_URL` points to the real
Render URL and trigger **Deploys → Trigger deploy → Clear cache and deploy
site**. Vite reads environment variables at build time, so a normal redeploy is
required after changing them.

---

## 5. Verify the deployment

Check these in order:

1. `https://YOUR-API.onrender.com/health` returns `{ "success": true }`.
2. The Netlify storefront loads products and settings from the API.
3. `/admin/login` works and the owner account can sign in.
4. Create or edit a product in the admin workspace.
5. Place a test order enquiry and confirm the WhatsApp link opens with the
   correct message. The message is not sent until the customer taps Send.
6. Upload a product image if Cloudinary is configured.

---

## 6. Recommended custom-domain setup

The default `*.netlify.app` and `*.onrender.com` hosts are different sites. The
API therefore sets the admin cookie as `SameSite=None; Secure` in production.
Some browsers block third-party cookies, which can prevent admin sign-in.

For a stronger production setup, use one parent domain:

| Purpose | Example |
| --- | --- |
| Storefront | `https://maankit.com` (Netlify custom domain) |
| API | `https://api.maankit.com` (Render custom domain) |

Then set:

- Render `FRONTEND_URL=https://maankit.com`
- Render `ADMIN_COOKIE_SAME_SITE=lax`
- Netlify `VITE_API_URL=https://api.maankit.com/api/v1`
- Netlify `VITE_SITE_URL=https://maankit.com`

Because both hosts share the `maankit.com` parent domain, the admin cookie is
first-party and works reliably in all browsers.

### Alternative: Netlify API proxy

If you want to keep the free `*.netlify.app` / `*.onrender.com` hosts, you can
proxy the API through Netlify. Uncomment the proxy block in `netlify.toml`, put
your Render host in the `to` value, and set `VITE_API_URL=/api/v1`. The browser
then calls the API on the Netlify origin, so cookies stay first-party.

---

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Render build fails on `prisma generate` | The build command must install dev dependencies: `npm ci --include=dev`. The included `render.yaml` already does this. Confirm `NODE_VERSION` is `22.23.4`. |
| Hostinger: `Access denied for user ...` | Enable **Databases → Remote MySQL** in hPanel, allow `%` (Any Host), and select the correct database. Use the `srvXXXX.hstgr.io` hostname, not `localhost`. |
| Hostinger: connection times out | Remote MySQL is not enabled for the database, or the host/port is wrong. Remote port is `3306`. |
| Prisma throws an SSL error with Hostinger | Remove `?sslaccept=strict` from `DATABASE_URL` unless your Hostinger plan requires SSL. |
| API returns `503` / "database is unavailable" | Check `DATABASE_URL`, database host/port, password, SSL mode, and Hostinger Remote MySQL access. |
| API starts but tables are missing | Check the Render build log for `prisma migrate deploy`. You can also import `work/hostinger-mkm-import.sql` through phpMyAdmin. |
| `ERR_REQUIRE_ESM` / `require() of ES Module` at startup | Set `NODE_VERSION=22.23.4` (or any 22.12+) in Render → Environment. Node 20 is EOL and cannot `require()` the ESM-only `htmlparser2` that `sanitize-html` uses. |
| Browser shows a CORS error | `FRONTEND_URL` must exactly match the browser origin, including `https://` and no trailing slash. Redeploy after changing it. |
| Admin login returns 200 but the dashboard immediately signs out | The browser blocked the cross-site cookie. Use the custom-domain or Netlify proxy setup above. |
| Netlify build uses old API URL | Vite bakes env vars into the build. Change the variable, then clear cache and redeploy. |
| First request after inactivity is slow | Render free services spin down when idle. Upgrade the plan or accept the cold start. |
| `/admin/login` shows "setup disabled" | `ADMIN_SETUP_TOKEN` was removed. Use an existing owner account or create one with `npm run admin:create` in the Render shell. |
| Render build fails with `P3009` / "migrate found failed migrations" | A migration from an earlier deploy failed halfway. `npm run db:deploy` runs `src/scripts/prepare-migrations.js` first, which deletes failed rows for migration folders that no longer exist. Check the log line it prints, then redeploy. |
| Checkout says "shipping charges are being configured" | No delivery charge is saved. The API writes a ₹60 default on startup; change it in Admin → Settings → Shipping and order minimums. |

---

## 8. Post-launch checklist

- [ ] Remove `ADMIN_SETUP_TOKEN` from Render after creating the owner.
- [ ] Set verified product prices, stock, and active status in the admin workspace.
- [ ] Configure store phone, WhatsApp number, address, shipping charge, and policies.
- [ ] Test a complete order enquiry from a phone.
- [ ] Confirm database backups and retention with the MySQL provider.
- [ ] Keep `VITE_DEMO_MODE=false` on Netlify.
- [ ] Never expose backend secrets in frontend environment variables.
