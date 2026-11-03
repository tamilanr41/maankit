const pricingError = (message, status) => Object.assign(new Error(message), { status });

export function buildPricedLines(products, requestedItems, globalMinimum = 3) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const seen = new Set();
  return requestedItems.map((item) => {
    if (seen.has(item.productId)) throw pricingError('Each product can appear only once in the cart.', 400);
    seen.add(item.productId);
    const product = byId.get(item.productId);
    if (!product || !product.active || product.archivedAt) throw pricingError('A selected product is no longer available.', 409);
    const minimum = product.minimumOrderQuantity ?? globalMinimum;
    if (!Number.isInteger(item.quantity) || item.quantity < minimum) throw pricingError(`${product.name} requires a minimum order of ${minimum} pieces.`, 400);
    if (product.stockQuantity < item.quantity) throw pricingError(`${product.name} does not have enough available stock.`, 409);
    if (product.sellingPricePaise == null || product.sellingPricePaise <= 0) throw pricingError(`Pricing for ${product.name} is not configured yet.`, 409);
    return { product, quantity: item.quantity, lineTotalPaise: product.sellingPricePaise * item.quantity };
  });
}

export function calculateTotals(lines, settings, offers = [], now = new Date()) {
  const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  const allUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
  const eligibleUnits = lines.reduce((sum, line) => sum + (line.product.shippingEligible ? line.quantity : 0), 0);
  const qualifyingUnits = settings.mixedCartShippingPolicy === 'all_items' && eligibleUnits !== allUnits ? 0 : eligibleUnits;
  const threshold = Number(settings.freeShippingThreshold ?? 6);
  const activeOffers = offers.filter((offer) => offer.active && (!offer.startsAt || offer.startsAt <= now) && (!offer.endsAt || offer.endsAt >= now));
  const applicableOffers = activeOffers.filter((offer) => offer.minimumOrderPaise == null || subtotalPaise >= offer.minimumOrderPaise);
  const discountPaise = Math.min(subtotalPaise, applicableOffers.reduce((best, offer) => {
    if (offer.discountType === 'PERCENT') return Math.max(best, Math.floor(subtotalPaise * Math.min(100, offer.discountValue) / 100));
    if (offer.discountType === 'FIXED') return Math.max(best, offer.discountValue);
    return best;
  }, 0));
  const offerFreeShipping = applicableOffers.some((offer) => offer.discountType === 'FREE_SHIPPING' && (offer.freeShippingThreshold == null || qualifyingUnits >= offer.freeShippingThreshold));
  const freeShipping = qualifyingUnits >= threshold || offerFreeShipping;
  const configuredShipping = settings.shippingChargePaise;
  if (!freeShipping && (configuredShipping == null || Number(configuredShipping) < 0)) {
    throw pricingError('Shipping charges are being configured. Please contact the store before placing an order enquiry.', 503);
  }
  const shippingPaise = freeShipping ? 0 : Number(configuredShipping);
  return { lines, subtotalPaise, shippingPaise, discountPaise, totalPaise: subtotalPaise - discountPaise + shippingPaise, freeShipping, qualifyingUnits, threshold };
}
