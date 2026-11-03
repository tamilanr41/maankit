# REST API

Base path: `/api/v1`. Success responses use `{ "success": true, "data": ... }`; failures use `{ "success": false, "message": ..., "details": ... }` where applicable. List endpoints use pagination metadata. The backend health endpoint is `GET /health`.

## Public routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/products` | Filtered and paginated active catalogue |
| GET | `/products/featured` | Featured active products |
| GET | `/products/best-sellers` | Best sellers from actual order data |
| GET | `/products/search?q=...` | Catalogue search |
| GET | `/products/:slug` | Product detail |
| GET | `/categories` | Active categories |
| GET | `/categories/:slug` | Category detail |
| GET | `/banners` | Active banners |
| GET | `/settings/public` | Public store settings only |
| GET | `/faqs` | Published FAQs |
| GET | `/content` | Published content pages |
| POST | `/newsletter/subscribe` | Subscribe an email address |
| POST | `/newsletter/unsubscribe` | Unsubscribe with token |
| POST | `/enquiries` | Submit a contact enquiry |
| POST | `/reviews` | Submit a review for moderation |
| POST | `/checkout/validate` | Validate current prices, stock, quantities, and shipping |
| POST | `/orders` | Create a saved order enquiry; requires `Idempotency-Key` |
| GET | `/orders/reference/:orderNumber` | Retrieve a privacy-limited order summary; include the returned token to retrieve the WhatsApp link |
| POST | `/chatbot/query` | Catalogue, shipping, and FAQ assistant response |

Order creation saves the enquiry before the frontend opens the WhatsApp click-to-chat link. The customer must send the prefilled message themselves. The API does not treat link opening as an order confirmation or payment.

## Administrator routes

All routes under `/admin` require an authenticated administrator unless noted. Login establishes a secure HTTP-only cookie; mutating requests also require the CSRF header used by the frontend client.

| Area | Paths |
| --- | --- |
| Auth | `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me`, `POST /admin/auth/change-password` |
| Products | `GET/POST /admin/products`, `GET/PATCH/DELETE /admin/products/:id`, `POST /admin/products/:id/images`, `DELETE /admin/products/:id/images/:imageId` |
| Categories | `GET/POST /admin/categories`, `PATCH/DELETE /admin/categories/:id` |
| Orders | `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`, `/payment`, and `/notes` |
| Dashboard | `GET /admin/dashboard/overview`, `/orders-chart`, `/product-performance` |
| Inventory | `GET /admin/inventory`, `POST /admin/inventory/adjust`, `GET /admin/inventory/history` |
| Settings and content | `GET/PATCH /admin/settings`, `GET/PATCH /admin/content` |
| Store management | `/admin/faqs`, `/admin/offers`, `/admin/banners`, `/admin/customers`, `/admin/enquiries`, `/admin/newsletter`, `/admin/reviews`, `/admin/chatbot/faqs`, `/admin/users` |
| Reports | `GET /admin/reports` and `/admin/reports/{orders,products,inventory,customers,newsletter}`; `?format=csv` exports CSV |

Roles are enforced on the server. Access to customer information, orders, settings, inventory adjustment, reports, and team permissions is restricted by role. Treat production API access and logs as sensitive.

## Checkout payload outline

`POST /checkout/validate` and `POST /orders` accept an `items` array of `{ productId, quantity }`. Order submission also requires customer name, phone, address, city, state, PIN code, and optional email/instructions. Do not submit price or shipping totals as authoritative values; the server looks up and calculates the final amounts.

Use the schema validators in `backend/src/routes/` as the source of truth for field constraints and enums.
