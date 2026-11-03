import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const categories = [
  { name: 'Oothuvathi', slug: 'oothuvathi', description: 'Incense sticks for everyday rituals.', imageUrl: '/images/royal-sandal.png', sortOrder: 1 },
  { name: 'Sambrani', slug: 'sambrani', description: 'Sambrani cups and resin.', imageUrl: '/images/natural-loban.png', sortOrder: 2 },
  { name: 'Pooja Items', slug: 'pooja-items', description: 'Pooja essentials and ritual items.', imageUrl: '/images/brand-poster.png', sortOrder: 3 },
  { name: 'Home Fragrance', slug: 'home-fragrance', description: 'Fragrance for the home.', imageUrl: '/images/fragrance-oil.png', sortOrder: 4 },
  { name: 'Cleaning & Care', slug: 'cleaning-care', description: 'Everyday cleaning and care.', imageUrl: '/images/royal-patchouli.png', sortOrder: 5 },
  { name: 'Festival Specials', slug: 'festival-specials', description: 'Seasonal collections.', imageUrl: '/images/good-gugal.png', sortOrder: 6 },
  { name: 'Long-lasting Perfumes', slug: 'long-lasting-perfumes', description: 'Coming soon: long-lasting perfumes.', active: false, sortOrder: 7 },
  { name: 'Attars', slug: 'attars', description: 'Coming soon: traditional attars.', active: false, sortOrder: 8 },
  { name: 'Incense Cones', slug: 'cones', description: 'Coming soon: incense cones.', active: false, sortOrder: 9 },
  { name: 'Dhoop Sticks', slug: 'dhoop-sticks', description: 'Coming soon: dhoop sticks.', active: false, sortOrder: 10 },
  { name: 'Room Sprays', slug: 'room-sprays', description: 'Coming soon: room sprays.', active: false, sortOrder: 11 },
  { name: 'Bulk Pack Agarbatti', slug: 'bulk-pack-agarbatti', description: 'Coming soon: bulk-pack agarbatti.', active: false, sortOrder: 12 },
];
const products = [
  { name: 'Prithvi Cup Sambrani · 36 Cups', slug: 'prithvi-cup-sambrani-36', sku: 'MKM-SAM-003', category: 'sambrani', shortDescription: '36 sambrani cups in a jar · Diwali & Karthigai Deepam special', description: 'A jar of 36 Prithvi Cup Sambrani cups, selected for the Diwali and Karthigai Deepam season. MRP ₹249 per jar. Message us on WhatsApp to confirm availability and place your order.', image: '/images/prithvi-sambrani-36.png', mrpPaise: 24900, sellingPricePaise: 24900, minimumOrderQuantity: 1, featured: true, seasonal: true, active: true },
  { name: 'Royal Sandal', slug: 'royal-sandal', sku: 'MKM-INC-001', category: 'oothuvathi', shortDescription: 'Incense sticks', image: '/images/royal-sandal.png', featured: true },
  { name: 'Natural Loban', slug: 'natural-loban', sku: 'MKM-SAM-001', category: 'sambrani', shortDescription: 'Premium sambrani cup', image: '/images/natural-loban.png', featured: true },
  { name: 'Good Gugal', slug: 'good-gugal', sku: 'MKM-SAM-002', category: 'sambrani', shortDescription: 'Premium sambrani cup', image: '/images/good-gugal.png' },
  { name: 'Royal Oudh', slug: 'royal-oudh', sku: 'MKM-INC-002', category: 'oothuvathi', shortDescription: 'Incense sticks', image: '/images/royal-oudh.png' },
  { name: 'Royal Lavender', slug: 'royal-lavender', sku: 'MKM-INC-003', category: 'oothuvathi', shortDescription: 'Incense sticks', image: '/images/royal-lavender.png', featured: true },
  { name: 'Royal Patchouli', slug: 'royal-patchouli', sku: 'MKM-INC-004', category: 'oothuvathi', shortDescription: 'Incense sticks', image: '/images/royal-patchouli.png' },
  { name: 'Fragrance Oil', slug: 'fragrance-oil', sku: 'MKM-HFR-001', category: 'home-fragrance', shortDescription: 'Fragrance oil', image: '/images/fragrance-oil.png' },
];

async function main() {
  for (const role of [{ name: 'OWNER', description: 'Full access to store management.' }, { name: 'ADMIN', description: 'Administrator access.' }, { name: 'EDITOR', description: 'Catalogue and content access.' }]) {
    await prisma.role.upsert({ where: { name: role.name }, create: role, update: { description: role.description } });
  }
  const categoryIds = {};
  for (const category of categories) {
    const saved = await prisma.category.upsert({ where: { slug: category.slug }, create: category, update: {} });
    categoryIds[category.slug] = saved.id;
  }
  for (const product of products) {
    const { category, image, ...details } = product;
    const existing = await prisma.product.findUnique({ where: { sku: details.sku } });
    const pricing = { mrpPaise: product.mrpPaise ?? 7500, sellingPricePaise: product.sellingPricePaise ?? 7500, minimumOrderQuantity: product.minimumOrderQuantity ?? 3 };
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: { ...pricing, name: details.name, slug: details.slug, shortDescription: details.shortDescription || null, description: details.description || null, categoryId: categoryIds[category], ...(details.active !== undefined ? { active: details.active } : {}), ...(details.featured !== undefined ? { featured: details.featured } : {}), ...(details.seasonal !== undefined ? { seasonal: details.seasonal } : {}) } });
      const primaryImage = await prisma.productImage.findFirst({ where: { productId: existing.id, isPrimary: true } });
      if (primaryImage) await prisma.productImage.update({ where: { id: primaryImage.id }, data: { url: image, altText: `${details.name} package`, sortOrder: 0 } });
      else await prisma.productImage.create({ data: { productId: existing.id, url: image, altText: `${details.name} package`, sortOrder: 0, isPrimary: true } });
      continue;
    }
    const saved = await prisma.product.create({ data: { ...details, categoryId: categoryIds[category], ...pricing, stockQuantity: 0, lowStockThreshold: 5, active: details.active ?? false, featured: Boolean(details.featured), seasonal: Boolean(details.seasonal) } });
    await prisma.productImage.create({ data: { productId: saved.id, url: image, altText: `${details.name} package`, sortOrder: 0, isPrimary: true } });
  }
  const defaults = {
    businessName: 'Mann Ki Mannat',
    tagline: 'Har Ghar Ki Mannat, Ab Ek Hi Jagah',
    announcementBar: 'Minimum 3 pieces · ₹75 per piece · Free shipping on 12 pieces',
    currency: 'INR',
    globalMinimumQuantity: 3,
    freeShippingThreshold: 12,
    mixedCartShippingPolicy: 'eligible_items',
    promoText: 'Buy 12 pieces for ₹840: ₹60 off and free shipping. Shipping charges apply to 6 pieces.',
    phone: '8680871115',
    whatsappNumber: '918680871115',
    address: '4-6-369, Gali street, Tirupati, Andhra Pradesh',
    chatbotEnabled: true,
    chatbotWelcome: 'I can help with current product details, prices, availability, and store policies. What would you like to explore?',
  };
  for (const [key, value] of Object.entries(defaults)) await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  const offer = await prisma.offer.findFirst({ where: { name: '12 pieces: ₹60 off + free shipping' } });
  const offerData = { name: '12 pieces: ₹60 off + free shipping', description: 'Buy 12 pieces at ₹75 each, get ₹60 off and free shipping.', promoText: '12 pieces · ₹60 off · Free shipping', discountType: 'FIXED', discountValue: 6000, minimumOrderPaise: 90000, freeShippingThreshold: 12, active: true };
  if (offer) await prisma.offer.update({ where: { id: offer.id }, data: offerData });
  else await prisma.offer.create({ data: offerData });
  console.log('Seeded the collections, seasonal 36-cup sambrani jar at ₹249, existing products at ₹75 each with a 3-piece minimum, future collections, 12-piece free-shipping and ₹60 offer, and the supplied contact details. Product stock remains zero until updated by the store owner; shipping below the threshold still needs its charge configured.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
