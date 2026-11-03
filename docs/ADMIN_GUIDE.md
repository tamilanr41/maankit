# Admin guide

Open `/admin/login` and sign in with the owner account created by `npm run admin:create`. Administrator screens are protected by server-side sessions and role checks. Sign out from the sidebar when finished on a shared computer.

## First-time store setup

1. Open **Settings** and enter verified store details, support contact, WhatsApp number, and business configuration.
2. Set `shippingChargePaise` as an integer in paise (₹49 is `4900`). The free-shipping threshold is 12 eligible units and the global minimum is three. Check the mixed-cart policy before opening checkout.
3. Open **Content** and add reviewed copy for the brand and policy pages. Publish only policies approved by the business.
4. Use **Categories** to add or edit categories. Use **Products** to add new products or edit the seven starter records, including category, MRP, selling price, minimum quantity, stock, shipping eligibility, and image URL. Activate only products that are ready to sell.
5. Use **Offers** to add a fixed, percentage, or free-shipping promotion. Configure homepage banners and FAQs from their matching screens.
6. Make a small checkout enquiry in a configured environment and confirm the saved order appears in **Orders** before enabling the store publicly.

The package photographs include product boxes and a fragrance bottle. Use the image that belongs to each real listing, and update it if the supplied image does not represent the exact item being sold.

## Day-to-day screens

- **Dashboard:** actual catalogue and order metrics. Enquiries are shown separately from confirmed orders.
- **Products / Categories:** maintain catalogue details, availability, image files, and category status. A product cannot be activated until it has a selling price.
- **Orders:** review the submitted contact and address details, update order and payment status when confirmed through the business process, and keep internal notes private.
- **Inventory:** record stock changes with a reason. Checkout validates stock again on the server.
- **Offers / Banners / Content / FAQs:** maintain time-bound promotions and published storefront information.
- **Reviews:** approve only customer-submitted reviews that meet the store's moderation policy.
- **Enquiries / Newsletter:** manage contact requests and subscriber records. Newsletter export contains customer email data; restrict downloads.
- **Reports:** export CSV reports. Enquiry totals are not revenue; only confirmed/order status data is categorized as sales.
- **Users:** add or disable administrator accounts with role-appropriate access.

## Product image uploads

The product upload endpoint uses Cloudinary. Configure all `CLOUDINARY_*` environment values on the backend, restart it, then upload up to eight JPG, PNG, or WebP images from a product edit form. The uploaded product image URLs and provider identifiers are stored with the product. Category and banner image upload workflows are not exposed in the current admin UI; those records accept an image URL.

## Pricing, shipping, and WhatsApp

Prices use integer paise in the API and database. The frontend formats them as INR. Selling price and MRP are separate fields. Checkout rejects missing prices, invalid minimum quantities, inactive products, and unavailable stock. For a mixed cart, free-shipping eligibility follows the configured policy and counts eligible units.

The store number can come from the public settings or `WHATSAPP_BUSINESS_NUMBER`. After checkout saves an enquiry, the browser opens WhatsApp with the order message prefilled. Customers must tap Send to complete the enquiry; administrators should confirm the order and payment state only after the business verifies them. There is no automated payment collection in this build.
