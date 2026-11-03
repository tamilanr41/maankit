// Design-only catalogue for VITE_DEMO_MODE. These records are never submitted to the API.
// Preview pricing reflects the store owner's requested ₹75 per-piece rate.
export const previewProducts = [
  { id: 'preview-prithvi-36', slug: 'prithvi-cup-sambrani-36', name: 'Prithvi Cup Sambrani · 36 Cups', category: 'Sambrani', image: '/images/prithvi-sambrani-36.png', images: ['/images/prithvi-sambrani-36.png'], mrpPaise: 24900, sellingPricePaise: 24900, minimumOrderQuantity: 1, stockQuantity: 0, shortDescription: '36 sambrani cups in a jar · Diwali & Karthigai Deepam special', description: 'A jar of 36 Prithvi Cup Sambrani cups, selected for the Diwali and Karthigai Deepam season. MRP ₹249 per jar. Message us on WhatsApp to confirm availability and place your order.', featured: true, seasonal: true, preview: true },
  { id: 'preview-sandal', slug: 'royal-sandal', name: 'Royal Sandal', category: 'Oothuvathi', image: '/images/royal-sandal.png', images: ['/images/royal-sandal.png'], mrpPaise: 7500, sellingPricePaise: 7500, minimumOrderQuantity: 3, shortDescription: 'Incense sticks', featured: true, preview: true },
  { id: 'preview-loban', slug: 'natural-loban', name: 'Natural Loban', category: 'Sambrani', image: '/images/natural-loban.png', images: ['/images/natural-loban.png'], mrpPaise: 7500, sellingPricePaise: 7500, minimumOrderQuantity: 3, shortDescription: 'Premium sambrani cup', featured: true, preview: true },
  { id: 'preview-gugal', slug: 'good-gugal', name: 'Good Gugal', category: 'Sambrani', image: '/images/good-gugal.png', images: ['/images/good-gugal.png'], mrpPaise: 7500, sellingPricePaise: 7500, minimumOrderQuantity: 3, shortDescription: 'Premium sambrani cup', featured: false, preview: true },
  { id: 'preview-oudh', slug: 'royal-oudh', name: 'Royal Oudh', category: 'Oothuvathi', image: '/images/royal-oudh.png', images: ['/images/royal-oudh.png'], mrpPaise: 7500, sellingPricePaise: 7500, minimumOrderQuantity: 3, shortDescription: 'Incense sticks', featured: false, preview: true },
  { id: 'preview-lavender', slug: 'royal-lavender', name: 'Royal Lavender', category: 'Oothuvathi', image: '/images/royal-lavender.png', images: ['/images/royal-lavender.png'], mrpPaise: 7500, sellingPricePaise: 7500, minimumOrderQuantity: 3, shortDescription: 'Incense sticks', featured: true, preview: true },
  { id: 'preview-patchouli', slug: 'royal-patchouli', name: 'Royal Patchouli', category: 'Oothuvathi', image: '/images/royal-patchouli.png', images: ['/images/royal-patchouli.png'], mrpPaise: 7500, sellingPricePaise: 7500, minimumOrderQuantity: 3, shortDescription: 'Incense sticks', featured: false, preview: true },
  { id: 'preview-oil', slug: 'fragrance-oil', name: 'Fragrance Oil', category: 'Home Fragrance', image: '/images/fragrance-oil.png', images: ['/images/fragrance-oil.png'], mrpPaise: 7500, sellingPricePaise: 7500, minimumOrderQuantity: 3, shortDescription: 'Fragrance oil', featured: false, preview: true },
];

export const previewCategories = [
  { name: 'Oothuvathi', slug: 'oothuvathi', image: '/images/royal-sandal.png', note: 'Incense sticks' },
  { name: 'Sambrani', slug: 'sambrani', image: '/images/natural-loban.png', note: 'Resin & cups' },
  { name: 'Pooja Items', slug: 'pooja-items', image: '/images/brand-poster.png', note: 'Brass & essentials' },
  { name: 'Home Fragrance', slug: 'home-fragrance', image: '/images/fragrance-oil.png', note: 'Agarbatti & more' },
  { name: 'Cleaning & Care', slug: 'cleaning-care', image: '/images/royal-patchouli.png', note: 'Natural products' },
  { name: 'Festival Specials', slug: 'festival-specials', image: '/images/good-gugal.png', note: 'Seasonal collection' },
];

export const futureCollections = [
  { name: 'Long-lasting Perfumes', slug: 'long-lasting-perfumes', mark: '✧' },
  { name: 'Attars', slug: 'attars', mark: '❋' },
  { name: 'Incense Cones', slug: 'cones', mark: '◈' },
  { name: 'Dhoop Sticks', slug: 'dhoop-sticks', mark: '∿' },
  { name: 'Room Sprays', slug: 'room-sprays', mark: '✳' },
  { name: 'Bulk Pack Agarbatti', slug: 'bulk-pack-agarbatti', mark: '≋' },
];
