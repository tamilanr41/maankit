import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  BookOpen, CircleHelp, Clock3, Flower2, Heart, LayoutGrid, Leaf, Menu, Minus, PackageCheck, Plus, Search, ShieldCheck, Store,
  ShoppingBag, Sparkles, Truck, X, MessageCircle, Send, Instagram, Facebook, Mail, Phone, MapPin,
  SlidersHorizontal, LoaderCircle, LockKeyhole, LayoutDashboard, Boxes, ClipboardList, Settings,
  LogOut, ExternalLink, CheckCircle2, AlertCircle, Trash2, Eye, EyeOff,
  Star, Images, ImagePlus, Link2, Upload, RefreshCw, Copy,
} from 'lucide-react';
import api, { assetUrl, getCategories, getFaqs, getProduct, getProducts, getPublicSettings } from './api';
import { futureCollections, previewCategories, previewProducts } from './catalog-preview';

const CartContext = createContext(null);
const WishlistContext = createContext(null);
const ToastContext = createContext(() => {});
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const previewSettings = {
  businessName: 'Mann Ki Mannat',
  phone: '8680871115',
  whatsappNumber: '918680871115',
  address: '4-6-369, Gali street, Tirupati, Andhra Pradesh',
  globalMinimumQuantity: 3,
  freeShippingThreshold: 12,
  shippingChargePaise: null,
  mixedCartShippingPolicy: 'eligible_items',
  announcementBar: 'Minimum 3 pieces · ₹75 each · Free shipping on 12 pieces + ₹60 off',
  promoText: 'Buy 12 pieces for ₹840: ₹60 off and free shipping. Shipping charges apply to 6 pieces.',
};
const media = (item) => assetUrl(item?.images?.[0]?.url || item?.images?.[0] || item?.image || item?.primaryImage?.url || '/images/royal-sandal.png');
const money = (paise) => paise == null ? 'Price on request' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
const moneyRounded = (paise) => paise == null ? 'Price on request' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
const savedItemId = (item) => String(typeof item === 'string' ? item : item?.id ?? '');

function readSavedItems() {
  try {
    const value = JSON.parse(localStorage.getItem('mkm-wishlist') || '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string' || (item && typeof item === 'object' && item.id != null)) : [];
  } catch { return []; }
}

function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mkm-cart-v1') || '[]'); } catch { return []; }
  });
  useEffect(() => localStorage.setItem('mkm-cart-v1', JSON.stringify(items)), [items]);
  const add = (product, quantity) => setItems((current) => {
    const existing = current.find((line) => line.id === product.id);
    return existing ? current.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + quantity } : line)
      : [...current, { id: product.id, slug: product.slug, name: product.name, image: media(product), pricePaise: product.sellingPricePaise, mrpPaise: product.mrpPaise, quantity, minimum: product.minimumOrderQuantity || 3 }];
  });
  const setQuantity = (id, quantity) => setItems((current) => current.map((line) => line.id === id ? { ...line, quantity: Math.max(line.minimum || 1, quantity) } : line));
  const syncPrices = (prices) => setItems((current) => current.map((line) => { const latest = prices.find((price) => price.productId === line.id); return latest ? { ...line, pricePaise: latest.sellingPricePaise, mrpPaise: latest.mrpPaise } : line; }));
  const remove = (id) => setItems((current) => current.filter((line) => line.id !== id));
  const clear = () => setItems([]);
  const count = items.reduce((sum, line) => sum + line.quantity, 0);
  return <CartContext.Provider value={{ items, add, setQuantity, syncPrices, remove, clear, count }}>{children}</CartContext.Provider>;
}
const useCart = () => useContext(CartContext);
function WishlistProvider({ children }) {
  const [items, setItems] = useState(readSavedItems);
  useEffect(() => { localStorage.setItem('mkm-wishlist', JSON.stringify(items)); }, [items]);
  useEffect(() => {
    const syncFromAnotherTab = (event) => { if (event.key === 'mkm-wishlist') setItems(readSavedItems()); };
    window.addEventListener('storage', syncFromAnotherTab);
    return () => window.removeEventListener('storage', syncFromAnotherTab);
  }, []);
  const has = (id) => items.some((item) => savedItemId(item) === String(id));
  const toggle = (product) => setItems((current) => {
    if (current.some((item) => savedItemId(item) === String(product.id))) return current.filter((item) => savedItemId(item) !== String(product.id));
    const image = media(product);
    return [...current, {
      id: String(product.id), slug: product.slug, name: product.name, image, images: [image],
      pricePaise: product.sellingPricePaise, sellingPricePaise: product.sellingPricePaise, mrpPaise: product.mrpPaise,
      minimumOrderQuantity: product.minimumOrderQuantity || 3, stockQuantity: product.stockQuantity,
      shortDescription: product.shortDescription || product.description, category: product.category?.name || product.category,
      sku: product.sku, preview: Boolean(product.preview),
    }];
  });
  const remove = (id) => setItems((current) => current.filter((item) => savedItemId(item) !== String(id)));
  return <WishlistContext.Provider value={{ items, count: items.length, has, toggle, remove }}>{children}</WishlistContext.Provider>;
}
const useWishlist = () => useContext(WishlistContext);
const useToast = () => useContext(ToastContext);

function useCatalogue(params = {}) {
  const query = useQuery({ queryKey: ['products', params], queryFn: () => getProducts(params), enabled: !demoMode });
  const result = query.data;
  const records = Array.isArray(result) ? result : result?.items || result?.products || [];
  const items = records.length ? records : (demoMode && (query.isError || !query.isFetched || result?.total === 0) ? previewProducts : []);
  const isPreview = items.some((item) => item.preview);
  return { ...query, items, isPreview, total: result?.total ?? items.length, pageCount: result?.pageCount ?? 1 };
}

function useCategoryList() {
  const query = useQuery({ queryKey: ['categories'], queryFn: getCategories, enabled: !demoMode });
  const records = Array.isArray(query.data) ? query.data : query.data?.items || [];
  const items = records.length ? records : (demoMode ? previewCategories : []);
  return { ...query, items };
}

function App() {
  const [toast, setToast] = useState(null);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3200); return () => clearTimeout(timer); }, [toast]);
  return <ToastContext.Provider value={(message, kind = 'success') => setToast({ message, kind })}>
    <CartProvider>
      <WishlistProvider>
        <ScrollReset />
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Storefront />} />
        </Routes>
        <AnimatePresence>{toast && <motion.div className={`toast toast--${toast.kind}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><CheckCircle2 size={18} />{toast.message}<button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={15} /></button></motion.div>}</AnimatePresence>
      </WishlistProvider>
    </CartProvider>
  </ToastContext.Provider>;
}

function ScrollReset() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); const names = { '/': ['Mann Ki Mannat — The Art of Pure Living','Thoughtful essentials for familiar rituals and the feeling of home.'], '/shop': ['Shop the Collection — Mann Ki Mannat','Explore pooja essentials, incense, sambrani and home fragrance.'], '/collections': ['Collections — Mann Ki Mannat','Browse every Mann Ki Mannat collection and upcoming fragrance range.'], '/wishlist': ['Saved Items — Mann Ki Mannat','Find the pieces you saved for later in your Mann Ki Mannat wishlist.'], '/about': ['Our Story — Mann Ki Mannat','The story and point of view behind Mann Ki Mannat.'], '/contact': ['Contact & Support — Mann Ki Mannat','Contact Mann Ki Mannat for product and order support.'] }; const [title, description] = names[pathname] || (pathname.startsWith('/admin') ? ['Store Admin — Mann Ki Mannat',''] : ['Mann Ki Mannat — The Art of Pure Living','Thoughtful essentials for familiar rituals and the feeling of home.']); document.title = title; const meta = document.querySelector('meta[name="description"]'); if (meta) meta.content = description; let robots = document.querySelector('meta[name="robots"]'); if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); } robots.content = pathname.startsWith('/admin') ? 'noindex,nofollow' : 'index,follow'; let canonical = document.querySelector('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); } canonical.href = `${import.meta.env.VITE_SITE_URL || window.location.origin}${pathname}`; }, [pathname]); return null; }

function Storefront() {
  const [chatOpen, setChatOpen] = useState(false);
  return <div className="site-shell"><SiteHeader />
    <main><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/product/:slug" element={<ProductPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
      <Route path="/policies/:slug" element={<PolicyPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes></main>
    <SiteFooter />
    <button className="chat-launcher" aria-label="Open shopping assistant" onClick={() => setChatOpen((open) => !open)}>{chatOpen ? <X size={20} /> : <MessageCircle size={20} />}<span>Ask us</span></button>
    <AnimatePresence>{chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}</AnimatePresence>
  </div>;
}

function BrandMark({ light = false }) {
  return <Link to="/" className={`brand-lockup ${light ? 'brand-lockup--light' : ''}`} aria-label="Mann Ki Mannat home">
    <img className="brand-image" src="/images/mann-ki-mannat-logo.png" alt="Mann Ki Mannat" />
  </Link>;
}

function SiteHeader() {
  const { count } = useCart();
  const { count: savedCount } = useWishlist();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const settingsQuery = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings, staleTime: 5 * 60_000, enabled: !demoMode });
  const settings = settingsQuery.data || (demoMode ? previewSettings : {});
  const submitSearch = (event) => { event.preventDefault(); navigate(`/shop?q=${encodeURIComponent(query)}`); setSearchOpen(false); setMobileOpen(false); };
  return <>
    <div className="announcement"><span className="announcement__ornament">✦</span>{settings.announcementBar || 'A little ritual. A lot of meaning.'}<span className="announcement__right">Thoughtfully made for your home <ArrowRight size={13} /></span></div>
    <header className="site-header"><div className="nav-wrap">
      <button className="icon-button mobile-menu" aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileOpen} aria-controls="primary-navigation" onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X /> : <Menu />}</button>
      <BrandMark />
      {mobileOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} />}
      <nav id="primary-navigation" className={`main-nav ${mobileOpen ? 'main-nav--open' : ''}`}>
        <div className="mobile-nav-heading"><div className="mobile-nav-heading__top"><div className="eyebrow"><span></span> Explore</div><button className="mobile-nav-close" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}><X size={19} /></button></div><strong>Find your everyday ritual.</strong></div>
        <NavLink className="mobile-nav-link" to="/shop" onClick={() => setMobileOpen(false)}><Store className="mobile-nav-icon" size={18} /><span>Shop</span><ArrowRight className="mobile-nav-arrow" size={16} /></NavLink>
        <NavLink className="mobile-nav-link" to="/collections" onClick={() => setMobileOpen(false)}><LayoutGrid className="mobile-nav-icon" size={18} /><span>Collections</span><ArrowRight className="mobile-nav-arrow" size={16} /></NavLink>
        <NavLink className="mobile-nav-link" to="/about" onClick={() => setMobileOpen(false)}><BookOpen className="mobile-nav-icon" size={18} /><span>Our story</span><ArrowRight className="mobile-nav-arrow" size={16} /></NavLink>
        <NavLink className="mobile-nav-link" to="/contact" onClick={() => setMobileOpen(false)}><MessageCircle className="mobile-nav-icon" size={18} /><span>Contact</span><ArrowRight className="mobile-nav-arrow" size={16} /></NavLink>
        <div className="mobile-nav-bottom"><div className="mobile-nav-note"><Leaf size={17} /><span>Buy 12 pieces for ₹840<br /><small>₹60 off with free shipping</small></span></div><Link className="mobile-nav-admin" to="/admin/login" aria-label="Admin sign in" title="Admin" onClick={() => setMobileOpen(false)}><ShieldCheck size={20} /></Link></div>
      </nav>
      <div className="nav-actions">
        <button className="icon-button search-trigger" aria-label="Search products" onClick={() => { setSearchOpen((open) => !open); setMobileOpen(false); }}><Search size={20} /></button>
        <Link className="icon-button saved-nav" to="/wishlist" aria-label={`Saved items, ${savedCount} saved`} title="Saved items"><Heart size={20} fill={savedCount ? 'currentColor' : 'none'} />{savedCount > 0 && <span className="saved-count">{savedCount}</span>}</Link>
        <Link className="icon-button admin-nav" to="/admin/login" aria-label="Admin sign in" title="Admin"><ShieldCheck size={19} /></Link>
        <Link className="icon-button cart-nav" to="/cart" aria-label={`Shopping bag with ${count} pieces`}><ShoppingBag size={20} />{count > 0 && <span className="cart-count">{count}</span>}</Link>
      </div>
    </div>
      <AnimatePresence>{searchOpen && <motion.form className="search-drawer" onSubmit={submitSearch} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><div className="search-drawer__inner"><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incense, sambrani, rituals…" aria-label="Search collection" /><button type="submit">Search <ArrowRight size={15} /></button><button type="button" className="search-close" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={18} /></button></div></motion.form>}</AnimatePresence>
    </header>
  </>;
}

function Home() {
  const heroRef = useRef(null);
  const { items, isLoading, isPreview } = useCatalogue({ limit: 8, featured: true });
  const { items: categories } = useCategoryList();
  const settingsQuery = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings, enabled: !demoMode });
  const bannerQuery = useQuery({ queryKey: ['home-banners'], queryFn: async () => (await api.get('/banners', { params: { placement: 'home-hero' } })).data.data, staleTime: 5 * 60_000, enabled: !demoMode });
  const bestSellerQuery = useQuery({ queryKey: ['best-sellers'], queryFn: async () => (await api.get('/products/best-sellers')).data.data, staleTime: 5 * 60_000, enabled: !demoMode });
  const settings = settingsQuery.data || (demoMode ? previewSettings : {});
  const heroBanner = bannerQuery.data?.[0];
  const [newsletter, setNewsletter] = useState('');
  const toast = useToast();
  const newArrival = items.find((item) => item.slug === 'prithvi-cup-sambrani-36');
  const displayed = items.filter((item) => item.slug !== 'prithvi-cup-sambrani-36').slice(0, 4);
  const orderNumber = String(settings.whatsappNumber || previewSettings.whatsappNumber).replace(/\D/g, '');
  const orderMessage = `Hello Mann Ki Mannat! I would like to order Prithvi Cup Sambrani (36 cups per jar, MRP ₹249) for Diwali / Karthigai Deepam. Please confirm availability.`;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !heroRef.current) return;
    const scope = gsap.context(() => {
      gsap.fromTo(heroRef.current.querySelectorAll('.hero-copy .eyebrow, .hero-copy h1, .hero-copy > p, .hero-actions'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .65, stagger: .09, ease: 'power2.out', delay: .12 });
      gsap.fromTo(heroRef.current.querySelector('.hero-art-frame'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'power2.inOut', delay: .25 });
      gsap.fromTo(heroRef.current.querySelectorAll('.hero-art-note, .hero-stamp'), { autoAlpha: 0, y: 9 }, { autoAlpha: 1, y: 0, duration: .55, stagger: .13, ease: 'power2.out', delay: .8 });
    }, heroRef);
    return () => scope.revert();
  }, []);
  async function subscribe(event) {
    event.preventDefault();
    if (demoMode) { toast('The preview is read-only. Call or WhatsApp 8680871115 to reach the store.', 'error'); return; }
    try { await api.post('/newsletter/subscribe', { email: newsletter, consent: true }); toast('You’re on the list. Thank you.'); setNewsletter(''); }
    catch { toast('Newsletter sign-up is unavailable right now.', 'error'); }
  }
  return <>
    {isPreview && <div className="preview-ribbon"><Sparkles size={14} /> Visual preview • sample prices shown; WhatsApp us to confirm availability and order</div>}
    <section className="hero-section" ref={heroRef}>
      <div className="hero-copy">
        <div className="eyebrow"><span></span> A quieter kind of everyday</div>
        {settings.heroTitle ? <h1>{settings.heroTitle}</h1> : <h1>Make room for<br /><em>a little more</em><br />meaning.</h1>}
        <p>{settings.heroSubtitle || 'Thoughtful rituals, familiar fragrances, and the small things that make a house feel like home.'}</p>
        <div className="hero-actions"><Link className="button button--forest" to="/shop">Explore the collection <ArrowUpRight size={16} /></Link><Link className="text-link" to="/about">Discover our story <ArrowRight size={15} /></Link></div>
        <div className="hero-signoff"><span className="hero-signoff__line"></span><span>Har Ghar Ki Mannat, Ab Ek Hi Jagah</span></div>
      </div>
      <div className="hero-art-wrap">
        <div className="hero-art-frame"><img src={heroBanner?.imageUrl || settings.heroImageUrl || '/images/brand-poster.png'} alt={heroBanner?.title || 'Mann Ki Mannat brand artwork with diya and incense'} /></div>
        <div className="hero-art-note"><span className="note-icon"><Flower2 size={18} /></span><span><b>Rooted in tradition</b><small>Made for the way we live now</small></span></div>
        <div className="hero-stamp"><span>Pure</span><span>by nature</span><Leaf size={19} /></div>
      </div>
      <div className="hero-index">01 <span></span> 04</div>
    </section>

    <section className="trust-strip"><div><Flower2 /><span>For mindful rituals</span></div><i></i><div><Leaf /><span>For the everyday</span></div><i></i><div><ShieldCheck /><span>Thoughtfully chosen</span></div></section>

    <section id="categories" className="section category-section">
      <SectionHeading eyebrow="Find your ritual" title={<>A place for <em>everyday meaning.</em></>} copy="Explore the familiar favourites and small essentials that bring a little more intention to your day." link="View all collections" href="/collections" />
      <div className="category-grid">{categories.slice(0, 6).map((category, index) => <Link to={`/shop?category=${encodeURIComponent(category.slug || category.name)}`} key={category.id || category.slug || category.name} className={`category-card category-card--${index + 1}`}>
        <div className="category-image"><img loading="lazy" src={assetUrl(category.image || category.images?.[0]?.url || '/images/royal-sandal.png')} alt="" /><span className="category-arrow"><ArrowUpRight size={17} /></span></div>
        <div className="category-label"><div><h3>{category.name}</h3><span>{category.note || category.subtitle || 'Explore collection'}</span></div><ArrowRight size={16} /></div>
      </Link>)}</div>
    </section>

    <section className="section seasonal-section">
      <SectionHeading eyebrow="Diwali & Karthigai Deepam · New arrival" title={<>A little more glow<br /><em>for the festive home.</em></>} copy="Make your festive order with Prithvi Cup Sambrani — 36 cups in every jar." />
      <article className="seasonal-arrival">
        <div className="seasonal-arrival__image"><img loading="lazy" src={newArrival ? media(newArrival) : '/images/prithvi-sambrani-36.png'} alt="Prithvi Cup Sambrani jar with 36 cups" /><span className="seasonal-arrival__seal">36<br /><small>cups</small></span></div>
        <div className="seasonal-arrival__copy"><span className="seasonal-arrival__label"><Sparkles size={14} /> FESTIVE NEW ARRIVAL</span><h3>{newArrival?.name || 'Prithvi Cup Sambrani'}</h3><p>One jar, 36 fragrant cups — a thoughtful companion for Diwali prayers and Karthigai Deepam evenings.</p><div className="seasonal-arrival__price"><span>MRP</span><strong>{moneyRounded(newArrival?.mrpPaise ?? 24900)}</strong><small>36 cups per jar</small></div><a className="button button--forest" href={`https://wa.me/${orderNumber}?text=${encodeURIComponent(orderMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Make your festive order <ArrowUpRight size={15} /></a><small className="seasonal-arrival__note">WhatsApp us to confirm availability and delivery.</small></div>
      </article>
    </section>

    <section className="future-collections section"><div className="future-collections__heading"><div className="eyebrow"><span></span> A little further ahead</div><h2>More good things <em>are on the way.</em></h2><p>We’re preparing a few new ways to bring fragrance into your home.</p></div><div className="future-collections__grid">{futureCollections.map((item) => <div className="future-collection" key={item.slug}><span className="future-collection__mark" aria-hidden="true">{item.mark}</span><span>{item.name}</span><small>Coming soon</small></div>)}</div></section>

    <section className="section collection-section">
      <SectionHeading eyebrow="A few favourites" title={<>Made for the <em>moments between.</em></>} copy="A considered collection for prayer corners, slow mornings, and welcoming someone in." link="Shop everything" href="/shop" />
      {isLoading && !isPreview ? <ProductSkeletons /> : displayed.length ? <ProductGrid products={displayed} isPreview={isPreview} /> : <EmptyProducts />}
      {isPreview && <p className="catalogue-note"><CircleHelp size={14} /> These visuals use the packaging you shared. Live prices, stock, and purchase actions are managed in your catalogue.</p>}
    </section>

    {(bestSellerQuery.data || []).length > 0 && <section className="section bestseller-section"><SectionHeading eyebrow="Loved by homes" title={<>The pieces people <em>come back to.</em></>} copy="Based on confirmed store orders." link="Shop all" href="/shop" /><ProductGrid products={bestSellerQuery.data} isPreview={false} /></section>}

    <section className="story-band">
      <div className="story-image"><img loading="lazy" src="/images/royal-oudh.png" alt="Royal Oudh incense packaging" /><span className="story-image-seal"><span>Rooted</span><b>in</b><span>tradition</span></span></div>
      <div className="story-copy"><div className="eyebrow eyebrow--light"><span></span> Our point of view</div><h2>Some things are<br />better <em>felt than said.</em></h2><p>Mann Ki Mannat brings the warmth of familiar rituals into the rhythm of modern homes. Thoughtful essentials, chosen to make everyday moments feel a little more yours.</p><Link className="button button--ivory" to="/about">A little about us <ArrowUpRight size={16} /></Link><span className="story-flourish">✳</span></div>
    </section>

    <section className="ritual-note"><div className="ritual-note__inner"><span className="ritual-note__mark">❋</span><p>Tradition, with room to breathe.</p><span className="ritual-note__sub">For the home you make your own.</span></div></section>

    <section className="newsletter-section"><div className="newsletter-copy"><div className="eyebrow"><span></span> Notes from home</div><h2>A little something<br /><em>to look forward to.</em></h2><p>New arrivals, seasonal rituals, and thoughtful notes — only when we have something worth sharing.</p></div><form className="newsletter-form" onSubmit={subscribe}><label htmlFor="newsletter-email">Your email address</label><div className="newsletter-input"><input id="newsletter-email" type="email" required placeholder="you@example.com" value={newsletter} onChange={(event) => setNewsletter(event.target.value)} /><button aria-label="Subscribe to newsletter"><ArrowRight size={19} /></button></div><small>By subscribing, you agree to receive occasional updates. Unsubscribe anytime.</small></form></section>

    {settings?.freeShippingThreshold && <div className="shipping-callout"><Truck size={18} /><span>{settings.promoText || `Free shipping from ${settings.freeShippingThreshold} eligible pieces`}</span><Link to="/shop">Explore <ArrowRight size={14} /></Link></div>}
  </>;
}

function CollectionsPage() {
  const { items: categories, isLoading, isError, refetch } = useCategoryList();
  return <>
    <div className="page-hero page-hero--shop"><div className="eyebrow"><span></span> The Mann Ki Mannat collections</div><h1>Choose your <em>everyday ritual.</em></h1><p>Browse by the moments, fragrances, and small essentials that make a home feel like yours.</p><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Collections</span></div></div>
    <section className="section collection-directory">
      <div className="section-heading"><div><div className="eyebrow"><span></span> Find your ritual</div><h2>A place for <em>everyday meaning.</em></h2><p>Choose a collection to see the pieces gathered for it.</p></div><Link className="underlined-link" to="/shop">Shop everything <ArrowUpRight size={15} /></Link></div>
      {isLoading ? <div className="category-grid">{[1, 2, 3, 4, 5, 6].map((item) => <div className="category-skeleton" key={item} />)}</div> : isError && !categories.length ? <ErrorNotice retry={() => refetch()} /> : <div className="category-grid">{categories.map((category, index) => <Link to={`/shop?category=${encodeURIComponent(category.slug || category.name)}`} key={category.id || category.slug || category.name} className={`category-card category-card--${index + 1}`}>
        <div className="category-image"><img loading="lazy" src={assetUrl(category.image || category.images?.[0]?.url || '/images/royal-sandal.png')} alt="" /><span className="category-arrow"><ArrowUpRight size={17} /></span></div>
        <div className="category-label"><div><h3>{category.name}</h3><span>{category.note || category.subtitle || 'Explore collection'}</span></div><ArrowRight size={16} /></div>
      </Link>)}</div>}
    </section>
    <section className="future-collections section"><div className="future-collections__heading"><div className="eyebrow"><span></span> A little further ahead</div><h2>More good things <em>are on the way.</em></h2><p>These collections are being prepared and will appear here when they’re ready.</p></div><div className="future-collections__grid">{futureCollections.map((item) => <div className="future-collection" key={item.slug}><span className="future-collection__mark" aria-hidden="true">{item.mark}</span><span>{item.name}</span><small>Coming soon</small></div>)}</div></section>
    <div className="collection-directory__browse"><Link className="button button--forest" to="/shop">Browse all available pieces <ArrowRight size={16} /></Link></div>
  </>;
}

function SectionHeading({ eyebrow, title, copy, link, href = '/shop' }) {
  return <div className="section-heading"><div><div className="eyebrow"><span></span>{eyebrow}</div><h2>{title}</h2>{copy && <p>{copy}</p>}</div>{link && <Link className="underlined-link" to={href}>{link}<ArrowUpRight size={15} /></Link>}</div>;
}

function ProductGrid({ products, isPreview }) {
  return <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id || product.slug} product={product} isPreview={isPreview || product.preview} index={index} />)}</div>;
}
function ProductCard({ product, isPreview, index = 0 }) {
  const { items: savedItems, toggle: toggleSavedItem } = useWishlist();
  const wish = savedItems.some((item) => savedItemId(item) === String(product.id));
  const toast = useToast();
  const { add } = useCart();
  const hasPrice = product.sellingPricePaise != null && Number(product.sellingPricePaise) > 0;
  const outOfStock = product.stockQuantity === 0;
  const discount = product.mrpPaise > product.sellingPricePaise && hasPrice ? Math.round((product.mrpPaise - product.sellingPricePaise) / product.mrpPaise * 100) : 0;
  function toggleWish() {
    toggleSavedItem(product);
    toast(wish ? 'Removed from saved pieces.' : 'Saved for later. Open the heart in the top bar to view it.');
  }
  function addProduct(event) {
    event.preventDefault();
    if (!hasPrice) { toast('Pricing is being configured for this piece.', 'error'); return; }
    if (outOfStock && !isPreview) { toast('This piece is currently out of stock.', 'error'); return; }
    add(product, product.minimumOrderQuantity || 3); toast(`${product.name} added to your bag${isPreview ? ' preview' : ''}.`);
  }
  const imageClass = /loban|gugal/i.test(product.slug || '') ? 'product-image product-image--dark' : 'product-image';
  return <motion.article className="product-card" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.35, delay: index * 0.045 }}>
    <div className={imageClass}><Link to={`/product/${product.slug}`} className="product-image-link" aria-label={`View ${product.name}`}><img loading="lazy" src={media(product)} alt={product.name} /></Link><span className="product-image-tag">{product.category?.name || product.category || 'Mann Ki Mannat'}</span>{discount > 0 && <span className="product-discount">{discount}% off</span>}<button className={`wishlist-button ${wish ? 'is-saved' : ''}`} aria-label={wish ? 'Remove from wishlist' : 'Save to wishlist'} onClick={toggleWish}><Heart size={17} fill={wish ? 'currentColor' : 'none'} /></button></div>
    <div className="product-details"><div className="product-title-row"><Link to={`/product/${product.slug}`}><h3>{product.name}</h3></Link><span className="product-sku">{product.sku || 'MKM'}</span></div><p>{product.shortDescription || product.description || 'A considered addition to your home ritual.'}</p><div className={`stock-note ${outOfStock ? 'stock-note--out' : ''}`}>{isPreview ? 'Catalogue preview' : outOfStock ? 'Currently out of stock' : product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockThreshold || 3) ? 'Limited availability' : 'Available to order'}</div><div className="product-buy-row"><span className="product-price">{hasPrice ? money(product.sellingPricePaise) : 'Price on request'}{product.mrpPaise > product.sellingPricePaise && hasPrice && <del>{money(product.mrpPaise)}</del>}</span><button className="add-icon-button" aria-label={`Add ${product.name} to bag`} onClick={addProduct} disabled={!hasPrice || (!isPreview && outOfStock)}><Plus size={17} /></button></div></div>
  </motion.article>;
}

function WishlistPage() {
  const { items: savedItems, remove } = useWishlist();
  const { items: catalogueItems, isLoading, isError, isPreview } = useCatalogue({ limit: 100 });
  const savedProducts = savedItems.map((saved) => {
    if (typeof saved === 'object' && saved?.name) return saved;
    return catalogueItems.find((product) => String(product.id) === savedItemId(saved));
  }).filter(Boolean);
  const resolvedIds = new Set(savedProducts.map((product) => String(product.id)));
  const unavailableItems = savedItems.filter((item) => !resolvedIds.has(savedItemId(item)));
  return <>
    <div className="page-hero page-hero--shop"><div className="eyebrow"><span></span> Kept close</div><h1>Your saved <em>pieces.</em></h1><p>Pieces you’ve saved with the heart stay here on this device, ready when you are.</p><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Saved items</span></div></div>
    {!savedItems.length ? <section className="empty-cart section saved-empty"><span className="empty-cart__icon"><Heart size={25} /></span><div className="eyebrow"><span></span> Saved for later</div><h1>A few things you<br /><em>love, all in one place.</em></h1><p>Tap the heart on any piece and it will be saved here.</p><Link className="button button--forest" to="/shop">Explore the collection <ArrowRight size={16} /></Link></section> : <section className="section saved-items-section">
      <div className="section-heading"><div><div className="eyebrow"><span></span> Saved for later</div><h2>Your little <em>shortlist.</em></h2><p>{savedItems.length} {savedItems.length === 1 ? 'piece' : 'pieces'} kept here on this device.</p></div><Link className="underlined-link" to="/shop">Find more pieces <ArrowUpRight size={15} /></Link></div>
      {isLoading && !savedProducts.length ? <ProductSkeletons /> : null}
      {savedProducts.length > 0 && <ProductGrid products={savedProducts} isPreview={isPreview || savedProducts.some((product) => product.preview)} />}
      {!isLoading && unavailableItems.map((item) => <div className="saved-unavailable" key={savedItemId(item)}><span><Heart size={17} /> This saved piece is no longer in the current catalogue.</span><button onClick={() => remove(savedItemId(item))}>Remove</button></div>)}
      {isError && !savedProducts.length && <ErrorNotice retry={() => window.location.reload()} />}
    </section>}
  </>;
}

function ProductSkeletons() { return <div className="product-grid">{[1, 2, 3, 4].map((i) => <div className="product-skeleton" key={i}><div /><span /><span /></div>)}</div>; }
function EmptyProducts() { return <div className="empty-products"><PackageCheck size={28} /><h3>The collection is taking shape.</h3><p>Products will appear here as soon as they’re added to the catalogue.</p></div>; }

function Shop() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [category, setCategory] = useState(params.get('category') || '');
  const [page, setPage] = useState(1);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const { items: categories } = useCategoryList();
  const queryParams = { search: search || undefined, category: category || undefined, sort, page, limit: 12, minPrice: minPrice ? Math.round(Number(minPrice) * 100) : undefined, maxPrice: maxPrice ? Math.round(Number(maxPrice) * 100) : undefined, available: availableOnly || undefined, featured: featuredOnly || undefined };
  const { items, isLoading, isError, isPreview, pageCount, total } = useCatalogue(queryParams);
  const matchingItems = isPreview ? items.filter((p) => (!category || (p.category?.slug || p.category) === category || p.category === categories.find((c) => c.slug === category)?.name) && (!search || p.name.toLowerCase().includes(search.toLowerCase()))) : items;
  useEffect(() => { const next = new URLSearchParams(); if (search) next.set('q', search); if (category) next.set('category', category); if (sort !== 'newest') next.set('sort', sort); setParams(next, { replace: true }); }, [search, category, sort]);
  return <>
    <div className="page-hero page-hero--shop"><div className="eyebrow"><span></span> The collection</div><h1>Find your <em>everyday ritual.</em></h1><p>Familiar fragrances, prayer-time essentials, and thoughtful little things for home.</p><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Shop</span></div></div>
    {isPreview && <div className="preview-ribbon preview-ribbon--page"><Sparkles size={14} /> Design preview • products shown from your supplied packaging; live catalogue data loads from the backend</div>}
    <section className="shop-layout section section--shop">
      <aside className="shop-sidebar"><div className="sidebar-title"><SlidersHorizontal size={17} /><span>Browse by</span></div><button className={`category-filter ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All collections <span>{total || ''}</span></button>{categories.map((c) => <button key={c.slug || c.name} className={`category-filter ${category === (c.slug || c.name) ? 'active' : ''}`} onClick={() => { setCategory(category === (c.slug || c.name) ? '' : (c.slug || c.name)); setPage(1); }}>{c.name}<ArrowUpRight size={13} /></button>)}<div className="shop-filter-group"><h4>Price range <small>INR</small></h4><div className="price-range-inputs"><label><span>From</span><input type="number" min="0" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(1); }} placeholder="₹ 0" /></label><label><span>To</span><input type="number" min="0" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }} placeholder="₹ —" /></label></div></div><div className="shop-filter-group shop-filter-checks"><label><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /> In stock</label><label><input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} /> Featured pieces</label></div><div className="sidebar-note"><Leaf size={16} /><p>Small everyday rituals.<br />Chosen with care.</p></div></aside>
      <div className="shop-main"><div className="shop-toolbar"><label className="shop-search"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search the collection" aria-label="Search collection" />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</label><span className="result-count">{isPreview ? matchingItems.length : (total || 0)} pieces</span><select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Sort: Newest</option><option value="price-asc">Price: Low to high</option><option value="price-desc">Price: High to low</option><option value="popular">Most loved</option></select></div>
        {isLoading && !isPreview ? <ProductSkeletons /> : isError && !isPreview ? <ErrorNotice retry={() => window.location.reload()} /> : matchingItems.length ? <ProductGrid products={matchingItems} isPreview={isPreview} /> : <div className="no-results"><Search size={23} /><h3>No pieces found</h3><p>Try another search or choose a different collection.</p><button className="text-link" onClick={() => { setSearch(''); setCategory(''); }}>Clear filters <ArrowRight size={14} /></button></div>}
        {!isPreview && pageCount > 1 && <div className="pagination"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft size={15} /> Previous</button><span>Page {page} of {pageCount}</span><button onClick={() => setPage(page + 1)} disabled={page >= pageCount}>Next <ChevronRight size={15} /></button></div>}
      </div>
    </section>
  </>;
}

function ProductPage() {
  const { slug } = useParams();
  const toast = useToast();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(3);
  const [activeImage, setActiveImage] = useState(0);
  const query = useQuery({ queryKey: ['product', slug], queryFn: () => getProduct(slug), enabled: !demoMode });
  const { items, isPreview } = useCatalogue({ limit: 100 });
  const product = query.data || (demoMode ? items.find((item) => item.slug === slug) : null);
  const images = useMemo(() => (product?.images?.map((image) => assetUrl(image.url || image)) || (product ? [media(product)] : [])).filter(Boolean), [product]);
  const hasPrice = product?.sellingPricePaise != null && Number(product.sellingPricePaise) > 0;
  const minimum = product?.minimumOrderQuantity || 3;
  const outOfStock = product?.stockQuantity === 0;
  useEffect(() => {
    if (!product) return;
    document.title = `${product.seoTitle || product.name} — Mann Ki Mannat`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = product.seoDescription || product.shortDescription || `Explore ${product.name} from Mann Ki Mannat.`;
    let structured = document.querySelector('#mkm-product-jsonld');
    if (!structured) { structured = document.createElement('script'); structured.id = 'mkm-product-jsonld'; structured.type = 'application/ld+json'; document.head.appendChild(structured); }
    structured.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: product.name, sku: product.sku, description: product.shortDescription || product.description || undefined, image: images, brand: { '@type': 'Brand', name: 'Mann Ki Mannat' }, offers: hasPrice ? { '@type': 'Offer', priceCurrency: 'INR', price: (product.sellingPricePaise / 100).toFixed(2), availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: `${import.meta.env.VITE_SITE_URL || window.location.origin}/product/${product.slug}` } : undefined });
    return () => structured.remove();
  }, [product, images, hasPrice, outOfStock]);
  useEffect(() => { setQuantity(minimum); setActiveImage(0); }, [slug, minimum]);
  if (query.isLoading && !product) return <div className="section"><ProductSkeletons /></div>;
  if (!product) return <NotFound />;
  const orderWhatsApp = async () => {
    if (!hasPrice) { toast('Pricing is being configured for this piece.', 'error'); return; }
    const number = (query.data?.whatsappNumber || previewSettings.whatsappNumber).replace(/\D/g, '');
    if (!number) { toast('WhatsApp ordering is not configured yet.', 'error'); return; }
    const message = `Hello Mann Ki Mannat! I would like to order ${quantity} × ${product.name} at ${money(product.sellingPricePaise)} per piece. Please confirm availability and delivery.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };
  return <>
    <div className="breadcrumb breadcrumb--standalone"><Link to="/">Home</Link><span>/</span><Link to="/shop">Shop</Link><span>/</span><span>{product.name}</span></div>
    <section className="product-page section"><div className="product-gallery"><div className={`product-main-image ${/loban|gugal/i.test(slug) ? 'product-main-image--dark' : ''}`}><img src={images[activeImage] || media(product)} alt={product.name} /><span className="product-main-image__caption">MANN KI MANNAT · {product.category?.name || product.category || 'COLLECTION'}</span></div>{images.length > 1 && <div className="product-thumbnails">{images.map((img, i) => <button className={i === activeImage ? 'active' : ''} key={img} onClick={() => setActiveImage(i)}><img src={img} alt={`${product.name} view ${i + 1}`} /></button>)}</div>}</div>
      <div className="product-info"><div className="eyebrow"><span></span>{product.category?.name || product.category || 'A considered ritual'}</div><h1>{product.name}</h1><p className="product-info__subtitle">{product.shortDescription || 'A thoughtful addition to your everyday ritual.'}</p><div className="product-info__price">{hasPrice ? money(product.sellingPricePaise) : 'Price on request'}{product.mrpPaise > product.sellingPricePaise && hasPrice && <del>{money(product.mrpPaise)}</del>}</div><div className="detail-rule"></div><p className="product-description">{product.description || 'A familiar fragrance from the Mann Ki Mannat collection. Product details and usage information are shared by the business when configured.'}</p>{product.sku && <div className="product-meta"><span>SKU</span><b>{product.sku}</b></div>}
        <div className="quantity-row"><span>Quantity <small>(minimum {minimum})</small></span><div className="quantity-control"><button aria-label="Reduce quantity" onClick={() => setQuantity(Math.max(minimum, quantity - 1))}><Minus size={15} /></button><strong>{quantity}</strong><button aria-label="Increase quantity" onClick={() => setQuantity(quantity + 1)}><Plus size={15} /></button></div></div>
        <div className={`product-availability ${outOfStock ? 'product-availability--out' : ''}`}>{isPreview ? 'Preview only · message us to confirm stock and ordering.' : outOfStock ? 'Currently out of stock' : product.stockQuantity <= (product.lowStockThreshold || 3) ? 'Limited availability' : 'Available to order'}</div><button className="button button--forest button--wide" disabled={!hasPrice || (!isPreview && outOfStock)} onClick={() => { add(product, quantity); toast(`${quantity} pieces added to your bag${isPreview ? ' preview' : ''}.`); }}><ShoppingBag size={17} />{isPreview ? 'Add to bag · preview' : !hasPrice ? 'Pricing coming soon' : outOfStock ? 'Currently unavailable' : 'Add to your bag'}</button><button className="button button--outline button--wide" onClick={orderWhatsApp}><MessageCircle size={16} />Order on WhatsApp</button>
        <div className="product-assurances"><span><Truck size={16} /> Shipping calculated at checkout</span><span><ShieldCheck size={16} /> Secure order enquiry</span></div>
      </div></section>
    <section className="section related-section"><SectionHeading eyebrow="Keep exploring" title={<>More to <em>make yours.</em></>} link="See the collection" href="/shop" /><ProductGrid products={items.filter((item) => item.id !== product.id).slice(0, 4)} isPreview={isPreview} /></section>
  </>;
}

function About() {
  return <>
    <div className="page-hero page-hero--about"><div className="eyebrow"><span></span> A home for your rituals</div><h1>Meaning lives in<br /><em>the little things.</em></h1><p>Our name is a wish for the home you make, the moments you keep, and the traditions you carry forward.</p><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Our story</span></div></div>
    <section className="about-intro section"><div className="about-poster"><img src="/images/brand-poster.png" alt="Mann Ki Mannat visual identity and collection" /></div><div className="about-copy"><div className="eyebrow"><span></span> Mann Ki Mannat</div><h2>Har Ghar Ki Mannat,<br /><em>Ab Ek Hi Jagah.</em></h2><p>Some rituals are so familiar, they feel like home. The quiet pause before the day begins. The fragrance that welcomes everyone in. The small act of care that makes a space your own.</p><p>Mann Ki Mannat brings these everyday traditions together in one considered place — with pooja essentials, incense, sambrani, home fragrance, and care for the home.</p><div className="about-signature"><img className="about-signature__logo" src="/images/mann-ki-mannat-logo.png" alt="" /><span>For the home you make your own<small>THE ART OF PURE LIVING</small></span></div></div></section>
    <section className="values-section"><div className="section values-inner"><div><div className="eyebrow eyebrow--light"><span></span> What guides us</div><h2>Familiar by nature.<br /><em>Thoughtful by choice.</em></h2><p>Our point of view is simple: let tradition feel at home in everyday life.</p></div><div className="values-grid"><article><Leaf /><h3>Rooted in ritual</h3><p>Made for the moments and practices that feel like yours.</p></article><article><Flower2 /><h3>Considered essentials</h3><p>A thoughtful home for everyday pooja, fragrance, and care.</p></article><article><Sparkles /><h3>Room to make it yours</h3><p>Tradition can be timeless and still belong to today.</p></article></div></div></section>
    <section className="about-cta section"><span className="about-cta__flower">❋</span><div><div className="eyebrow"><span></span> A place to begin</div><h2>Find a little <em>meaning.</em></h2><p>Explore a collection made for the small things that make a home.</p></div><Link className="button button--forest" to="/shop">Explore the collection <ArrowUpRight size={16} /></Link></section>
  </>;
}

const contactSchema = z.object({ name: z.string().min(2, 'Please enter your name.'), email: z.string().email('Enter a valid email.'), phone: z.string().min(8, 'Enter a valid phone number.'), subject: z.string().min(2, 'Please choose a subject.'), message: z.string().min(10, 'Please add a little more detail.') });
function Contact() {
  const toast = useToast();
  const query = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings, enabled: !demoMode });
  const faqQuery = useQuery({ queryKey: ['faqs'], queryFn: getFaqs, enabled: !demoMode });
  const settings = query.data || (demoMode ? previewSettings : {});
  const faqs = Array.isArray(faqQuery.data) ? faqQuery.data : faqQuery.data?.items || [];
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(contactSchema) });
  async function send(data) { if (demoMode) { toast('The preview is read-only. Call or WhatsApp 8680871115 to reach the store.', 'error'); return; } try { await api.post('/enquiries', data); toast('Your note is with us. We’ll be in touch.'); reset(); } catch { toast('We couldn’t send your note just now. Please try again.', 'error'); } }
  const waNumber = (settings.whatsappNumber || '').replace(/\D/g, '');
  return <>
    <div className="page-hero page-hero--contact"><div className="eyebrow"><span></span> We’re here to help</div><h1>Let’s make this<br /><em>easy.</em></h1><p>Questions about a product, an order, or just want to say hello? We’d love to hear from you.</p><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Contact</span></div></div>
    <section className="section contact-layout"><div className="contact-form-wrap"><div className="eyebrow"><span></span> Write us a note</div><h2>How can we <em>help?</em></h2><form className="form-grid" onSubmit={handleSubmit(send)}>
      <FormField label="Your name" error={errors.name?.message}><input {...register('name')} placeholder="Name" /></FormField><FormField label="Email address" error={errors.email?.message}><input {...register('email')} type="email" placeholder="you@example.com" /></FormField>
      <FormField label="Phone number" error={errors.phone?.message}><input {...register('phone')} type="tel" placeholder="Your number" /></FormField><FormField label="What’s this about?" error={errors.subject?.message}><select {...register('subject')} defaultValue=""><option value="" disabled>Choose a topic</option><option>Product question</option><option>Order support</option><option>Partnership</option><option>Something else</option></select></FormField>
      <FormField label="Your message" error={errors.message?.message} wide><textarea {...register('message')} rows="5" placeholder="Tell us a little more…" /></FormField><button className="button button--forest" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="spin" size={16} /> : null}Send your note <ArrowUpRight size={15} /></button>
    </form></div><aside className="contact-details"><div className="contact-details__top"><span className="contact-mark"><MessageCircle size={20} /></span><div><div className="eyebrow">A real person, always</div><h3>Prefer a quick chat?</h3><p>Reach us on WhatsApp for product and order enquiries.</p></div></div>{waNumber && <a className="button button--forest" href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer">Message on WhatsApp <ArrowUpRight size={15} /></a>}
      <div className="contact-lines">{settings.phone && <a href={`tel:${settings.phone}`}><Phone size={16} /><span><small>Call us</small>{settings.phone}</span></a>}{settings.email && <a href={`mailto:${settings.email}`}><Mail size={16} /><span><small>Email</small>{settings.email}</span></a>}{settings.address && <div><MapPin size={16} /><span><small>Find us</small>{settings.address}</span></div>}{settings.businessHours && <div><Clock3 size={16} /><span><small>Our hours</small>{settings.businessHours}</span></div>}</div>
      <div className="contact-note"><span>“</span><p>We’ll get back to you as soon as we can.</p></div></aside></section>
    {faqs.length > 0 && <section className="section faq-section"><div className="faq-intro"><div className="eyebrow"><span></span> A few helpful things</div><h2>Good to <em>know.</em></h2></div><div className="faq-list">{faqs.slice(0, 8).map((faq) => <details key={faq.id || faq.question}><summary>{faq.question}<Plus size={16} /></summary><p>{faq.answer}</p></details>)}</div></section>}
  </>;
}
function FormField({ label, error, wide, children }) { return <label className={`form-field ${wide ? 'form-field--wide' : ''}`}><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>; }

function CartPage() {
  const { items, setQuantity, syncPrices, remove } = useCart();
  const toast = useToast();
  const cartKey = items.map((item) => `${item.id}:${item.quantity}`).join('|');
  const pricingQuery = useQuery({ queryKey: ['cart-validate', cartKey], queryFn: async () => (await api.post('/checkout/validate', { items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) })).data.data, enabled: !demoMode && items.length > 0 && items.every((item) => !String(item.id).startsWith('preview-')), retry: false });
  useEffect(() => { if (pricingQuery.data?.items) { const changed = pricingQuery.data.items.some((current) => items.find((line) => line.id === current.productId)?.pricePaise !== current.sellingPricePaise); if (changed) { syncPrices(pricingQuery.data.items); toast('A product price changed. Your bag now shows the latest catalogue price.', 'error'); } } }, [pricingQuery.data, items, syncPrices, toast]);
  const subtotal = items.reduce((sum, item) => sum + (Number(item.pricePaise) || 0) * item.quantity, 0);
  const eligiblePieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const settingsQuery = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings, enabled: !demoMode });
  const settings = settingsQuery.data || (demoMode ? previewSettings : {});
  const threshold = settings.freeShippingThreshold || 12;
  const verified = pricingQuery.data;
  const shipping = verified?.shippingPaise ?? (eligiblePieces >= threshold ? 0 : settings.shippingChargePaise);
  const savings = verified?.discountPaise ?? (demoMode && eligiblePieces >= 12 ? 6000 : 0);
  const whatsappNumber = String(settings.whatsappNumber || settings.phone || previewSettings.whatsappNumber).replace(/\D/g, '');
  const whatsappMessage = [
    'Namaste Mann Ki Mannat! I would like to place this order enquiry:',
    ...items.map((item) => `• ${item.quantity} × ${item.name} — ${item.pricePaise ? money(item.pricePaise * item.quantity) : 'price to confirm'}`),
    `Total pieces: ${eligiblePieces}`,
    `Subtotal: ${subtotal ? money(subtotal) : 'to confirm'}`,
    savings > 0 ? `Offer: ${money(savings)} off` : null,
    `Shipping: ${eligiblePieces >= threshold ? 'Free' : 'Please confirm the shipping charge'}`,
    'Please confirm stock and delivery details.',
  ].filter(Boolean).join('\n');
  const whatsappOrderUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  if (!items.length) return <div className="empty-cart section"><span className="empty-cart__icon"><ShoppingBag size={25} /></span><div className="eyebrow"><span></span> Your bag</div><h1>A little room<br /><em>for something lovely.</em></h1><p>Your bag is waiting for its first piece.</p><Link className="button button--forest" to="/shop">Explore the collection <ArrowRight size={16} /></Link></div>;
  return <section className="section cart-section"><div className="eyebrow"><span></span> Your bag</div><h1>Good things, <em>gathered.</em></h1><div className="cart-layout"><div className="cart-items">{items.map((item) => <article className="cart-item" key={item.id}><Link to={`/product/${item.slug}`} className="cart-item__image"><img src={item.image} alt={item.name} /></Link><div className="cart-item__detail"><Link to={`/product/${item.slug}`}><h3>{item.name}</h3></Link><span>{item.sku || 'Mann Ki Mannat'}</span><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => item.quantity > item.minimum ? setQuantity(item.id, item.quantity - 1) : null}><Minus size={14} /></button><strong>{item.quantity}</strong><button aria-label="Increase quantity" onClick={() => setQuantity(item.id, item.quantity + 1)}><Plus size={14} /></button></div><small>Minimum {item.minimum} pieces</small></div><div className="cart-item__price"><strong>{item.pricePaise ? money(item.pricePaise * item.quantity) : 'Price on request'}</strong>{item.pricePaise && <small>{money(item.pricePaise)} each</small>}<button className="remove-item" aria-label={`Remove ${item.name}`} onClick={() => remove(item.id)}><Trash2 size={15} />Remove</button></div></article>)}</div>
      <aside className="order-summary"><div className="order-summary__title">Order summary</div>{pricingQuery.isLoading ? <div className="pricing-verification"><LoaderCircle className="spin" size={14} /> Checking current prices and stock…</div> : pricingQuery.isError ? <div className="pricing-error"><AlertCircle size={15} />{pricingQuery.error.response?.data?.message || 'We could not verify this bag. Please check your items before checkout.'}</div> : <ShippingProgress count={verified?.qualifyingUnits ?? eligiblePieces} threshold={verified?.threshold ?? threshold} />}<div className="summary-line"><span>Subtotal</span><span>{verified ? money(verified.subtotalPaise) : subtotal ? money(subtotal) : 'Price on request'}</span></div>{savings > 0 && <div className="summary-line"><span>Offer savings</span><span>−{money(savings)}</span></div>}<div className="summary-line"><span>Shipping</span><span>{verified ? (verified.shippingPaise === 0 ? 'Free' : money(verified.shippingPaise)) : (eligiblePieces >= threshold ? 'Free' : (shipping != null ? money(shipping) : 'Set by store'))}</span></div><div className="summary-line summary-line--total"><span>Estimated total</span><strong>{verified ? money(verified.totalPaise) : subtotal ? (eligiblePieces >= threshold || shipping != null ? money(subtotal - savings + (shipping || 0)) : `${money(subtotal)} + shipping`) : 'Price on request'}</strong></div>{demoMode ? <a className="button button--forest button--wide" href={whatsappOrderUrl} target="_blank" rel="noreferrer"><MessageCircle size={16} />Send order on WhatsApp <ArrowRight size={16} /></a> : <Link className={`button button--forest button--wide ${!subtotal || pricingQuery.isError ? 'button--disabled' : ''}`} onClick={(event) => { if (pricingQuery.isError || pricingQuery.isLoading) event.preventDefault(); }} to={subtotal ? '/checkout' : '/shop'}>{subtotal ? 'Continue to checkout' : 'Browse live collection'}<ArrowRight size={16} /></Link>}{demoMode && <p className="summary-footnote">Your bag is prepared in WhatsApp. Confirm product availability and delivery details with the store.</p>}<p className="summary-footnote"><LockKeyhole size={13} /> Final pricing and shipping are verified again when your enquiry is saved.</p></aside></div></section>;
}

function ShippingProgress({ count, threshold }) {
  const remaining = Math.max(0, threshold - count);
  return <div className="shipping-progress"><div className="shipping-progress__top"><Truck size={17} /><span>{remaining ? <>Add <b>{remaining} more {remaining === 1 ? 'piece' : 'pieces'}</b> to unlock free shipping</> : <>You’ve unlocked <b>free shipping</b></>}</span></div><div className="progress-track"><span style={{ width: `${Math.min(100, count / threshold * 100)}%` }} /></div></div>;
}

const checkoutSchema = z.object({ fullName: z.string().min(2, 'Enter your full name.'), phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'), email: z.union([z.string().email(), z.literal('')]).optional(), address: z.string().min(8, 'Enter your delivery address.'), city: z.string().min(2, 'Enter your city.'), state: z.string().min(2, 'Enter your state.'), pinCode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code.'), instructions: z.string().optional() });
function Checkout() {
  const { items, clear, syncPrices } = useCart();
  const toast = useToast();
  const [result, setResult] = useState(null);
  const cartSignature = items.map((item) => `${item.id}:${item.quantity}`).join('|');
  const makeKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const [idempotencyKey, setIdempotencyKey] = useState(() => {
    if (!cartSignature) return '';
    try { const saved = JSON.parse(sessionStorage.getItem('mkm-order-idempotency') || 'null'); if (saved?.signature === cartSignature) return saved.key; } catch {}
    const key = makeKey(); sessionStorage.setItem('mkm-order-idempotency', JSON.stringify({ signature: cartSignature, key })); return key;
  });
  useEffect(() => {
    if (!cartSignature) { sessionStorage.removeItem('mkm-order-idempotency'); setIdempotencyKey(''); return; }
    try { const saved = JSON.parse(sessionStorage.getItem('mkm-order-idempotency') || 'null'); if (saved?.signature !== cartSignature) { const key = makeKey(); sessionStorage.setItem('mkm-order-idempotency', JSON.stringify({ signature: cartSignature, key })); setIdempotencyKey(key); } }
    catch { const key = makeKey(); sessionStorage.setItem('mkm-order-idempotency', JSON.stringify({ signature: cartSignature, key })); setIdempotencyKey(key); }
  }, [cartSignature]);
  const pricingQuery = useQuery({ queryKey: ['checkout-validate', cartSignature], queryFn: async () => (await api.post('/checkout/validate', { items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) })).data.data, enabled: !demoMode && items.length > 0, retry: false });
  useEffect(() => { if (pricingQuery.data?.items) { const changed = pricingQuery.data.items.some((current) => items.find((line) => line.id === current.productId)?.pricePaise !== current.sellingPricePaise); if (changed) { syncPrices(pricingQuery.data.items); toast('A product price changed. The latest catalogue prices are now shown.', 'error'); } } }, [pricingQuery.data, items, syncPrices, toast]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(checkoutSchema) });
  const subtotal = pricingQuery.data?.subtotalPaise ?? items.reduce((sum, item) => sum + (Number(item.pricePaise) || 0) * item.quantity, 0);
  const pieceCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutSavings = pricingQuery.data?.discountPaise ?? (demoMode && pieceCount >= 12 ? 6000 : 0);
  const checkoutWhatsAppNumber = String(previewSettings.whatsappNumber).replace(/\D/g, '');
  async function placeOrder(data) {
    if (demoMode) {
      const message = [
        'Namaste Mann Ki Mannat! I would like to place this order enquiry:',
        ...items.map((item) => `• ${item.quantity} × ${item.name} — ${item.pricePaise ? money(item.pricePaise * item.quantity) : 'price to confirm'}`),
        `Total pieces: ${pieceCount}`,
        `Subtotal: ${subtotal ? money(subtotal) : 'to confirm'}`,
        checkoutSavings > 0 ? `Offer: ${money(checkoutSavings)} off` : null,
        `Shipping: ${pieceCount >= 12 ? 'Free' : 'Please confirm the shipping charge'}`,
        '',
        `Customer: ${data.fullName}`,
        `WhatsApp / mobile: ${data.phone}`,
        data.email ? `Email: ${data.email}` : null,
        `Delivery address: ${data.address}, ${data.city}, ${data.state} - ${data.pinCode}`,
        data.instructions ? `Delivery instructions: ${data.instructions}` : null,
        'Please confirm product availability and delivery details. No payment has been made.',
      ].filter(Boolean).join('\n');
      window.location.assign(`https://wa.me/${checkoutWhatsAppNumber}?text=${encodeURIComponent(message)}`);
      return;
    }
    if (pricingQuery.isLoading || pricingQuery.isError) { toast(pricingQuery.error?.response?.data?.message || 'We are still checking your prices and stock.', 'error'); return; }
    try {
      const response = await api.post('/orders', { ...data, items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) }, { headers: { 'Idempotency-Key': idempotencyKey } });
      const order = response.data.data;
      localStorage.setItem('mkm-last-order', order.orderNumber);
      localStorage.setItem('mkm-order-token', order.publicToken);
      sessionStorage.removeItem('mkm-order-idempotency');
      clear();
      if (order.whatsappUrl) window.location.assign(order.whatsappUrl);
      else setResult(order);
    } catch (error) { toast(error.response?.data?.message || 'We couldn’t create your order enquiry. Please review your bag.', 'error'); }
  }
  if (!items.length && !result) return <div className="empty-cart section"><h1>Your bag is <em>waiting.</em></h1><p>Add a piece before you continue to checkout.</p><Link className="button button--forest" to="/shop">Explore the collection <ArrowRight size={16} /></Link></div>;
  if (result) return <section className="order-success section"><span className="success-seal"><Check size={27} /></span><div className="eyebrow"><span></span> Enquiry created</div><h1>Your next step<br /><em>is just a message away.</em></h1><p>Your order enquiry <b>{result.orderNumber}</b> has been saved. Send the prepared message in WhatsApp so our team can confirm the details with you.</p>{result.whatsappUrl ? <a className="button button--forest" href={result.whatsappUrl} target="_blank" rel="noreferrer">Continue in WhatsApp <ArrowUpRight size={16} /></a> : <Link className="button button--forest" to="/contact">Contact the store <ArrowRight size={16} /></Link>}<button className="text-link order-retry" onClick={() => result.whatsappUrl && window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer')}>Retry WhatsApp <ArrowRight size={14} /></button><small>Please send the message in WhatsApp to complete your order enquiry. Opening WhatsApp does not confirm your order. Your reference is saved on this device.</small></section>;
  const latestPrices = new Map((pricingQuery.data?.items || []).map((line) => [line.productId, line]));
  return <section className="section checkout-section"><div className="eyebrow"><span></span> A few details</div><h1>Let’s get it <em>to you.</em></h1><div className="checkout-layout"><form className="checkout-form" onSubmit={handleSubmit(placeOrder)}><h2>Delivery details</h2><div className="form-grid"><FormField label="Full name" error={errors.fullName?.message}><input {...register('fullName')} placeholder="Your name" /></FormField><FormField label="WhatsApp / mobile" error={errors.phone?.message}><input {...register('phone')} type="tel" inputMode="numeric" placeholder="10-digit mobile number" /></FormField><FormField label="Email (optional)" error={errors.email?.message}><input {...register('email')} type="email" placeholder="you@example.com" /></FormField><FormField label="PIN code" error={errors.pinCode?.message}><input {...register('pinCode')} inputMode="numeric" placeholder="6-digit PIN code" /></FormField><FormField label="Delivery address" error={errors.address?.message} wide><textarea {...register('address')} rows="3" placeholder="House / flat, street, landmark" /></FormField><FormField label="City" error={errors.city?.message}><input {...register('city')} /></FormField><FormField label="State" error={errors.state?.message}><input {...register('state')} /></FormField><FormField label="Delivery instructions (optional)" wide><textarea {...register('instructions')} rows="2" placeholder="Anything we should know?" /></FormField></div><div className="checkout-consent"><ShieldCheck size={16} /><span>{demoMode ? 'Your order and delivery details will be prepared in WhatsApp. No payment is collected here.' : 'Your order will be created as an enquiry. Payment is not collected on this page.'}</span></div><button className="button button--forest" disabled={isSubmitting || pricingQuery.isLoading || pricingQuery.isError}>{isSubmitting || pricingQuery.isLoading ? <LoaderCircle className="spin" size={16} /> : <MessageCircle size={16} />}{demoMode ? 'Continue in WhatsApp' : 'Create enquiry & continue to WhatsApp'} <ArrowRight size={15} /></button>{pricingQuery.isError && <div className="pricing-error"><AlertCircle size={15} />{pricingQuery.error.response?.data?.message || 'This bag could not be verified.'} <Link to="/cart">Review bag</Link></div>}</form>
      <aside className="order-summary checkout-summary"><div className="order-summary__title">Your selection <span>{pieceCount} pieces</span></div>{items.map((item) => { const latest = latestPrices.get(item.id); return <div className="checkout-product" key={item.id}><img src={item.image} alt="" /><div><b>{item.name}</b><small>{item.quantity} pieces</small></div><strong>{latest ? money(latest.lineTotalPaise) : item.pricePaise ? money(item.pricePaise * item.quantity) : '—'}</strong></div>; })}<div className="summary-line"><span>Subtotal</span><span>{pricingQuery.data ? money(pricingQuery.data.subtotalPaise) : subtotal ? money(subtotal) : '—'}</span></div>{checkoutSavings > 0 && <div className="summary-line"><span>Offer savings</span><span>−{money(checkoutSavings)}</span></div>}<div className="summary-line"><span>Shipping</span><span>{pricingQuery.data ? pricingQuery.data.shippingPaise === 0 ? 'Free' : money(pricingQuery.data.shippingPaise) : demoMode ? pieceCount >= 12 ? 'Free' : 'Please confirm' : 'Checking…'}</span></div><div className="summary-line summary-line--total"><span>Estimated total</span><strong>{pricingQuery.data ? money(pricingQuery.data.totalPaise) : subtotal ? pieceCount >= 12 ? money(subtotal - checkoutSavings) : `${money(subtotal)} + shipping` : 'Verifying…'}</strong></div><p className="summary-footnote"><LockKeyhole size={13} /> {demoMode ? 'Confirm stock and shipping with the store in WhatsApp.' : 'Current price, stock, minimum quantities, active offers, and shipping are checked again before the enquiry is saved.'}</p></aside></div></section>;
}

function OrderConfirmation() {
  const { orderNumber } = useParams();
  const savedOrder = localStorage.getItem('mkm-last-order');
  const token = savedOrder === orderNumber ? localStorage.getItem('mkm-order-token') : null;
  const query = useQuery({ queryKey: ['order-reference', orderNumber, token], queryFn: async () => (await api.get(`/orders/reference/${encodeURIComponent(orderNumber)}`, { params: token ? { token } : {} })).data.data, enabled: !demoMode });
  if (demoMode) return <div className="not-found section"><div className="eyebrow"><span></span> Order reference</div><h1>Preview mode<br /><em>is read-only.</em></h1><p>Call or WhatsApp 8680871115 to ask about an order.</p><Link className="button button--forest" to="/contact">Contact the store <ArrowRight size={16} /></Link></div>;
  if (query.isLoading) return <div className="section admin-table-loading"><LoaderCircle className="spin" /> Retrieving your order reference…</div>;
  if (query.isError) return <div className="not-found section"><div className="eyebrow"><span></span> Order reference</div><h1>We couldn’t find<br /><em>that enquiry.</em></h1><p>Check the reference and try again.</p><Link className="button button--forest" to="/contact">Contact the store <ArrowRight size={16} /></Link></div>;
  const order = query.data;
  return <section className="order-success section"><span className="success-seal"><Check size={27} /></span><div className="eyebrow"><span></span> Enquiry created</div><h1>Your next step<br /><em>is just a message away.</em></h1><p>Your order enquiry <b>{order.orderNumber}</b> has been saved. Send the prepared message in WhatsApp so our team can confirm the details with you.</p><div className="order-confirmation-summary"><span>Status <b>{order.orderStatus}</b></span><span>Enquiry total <b>{money(order.totalPaise)}</b></span><span>{order.items.length} line items</span></div>{order.whatsappUrl ? <a className="button button--forest" href={order.whatsappUrl} target="_blank" rel="noreferrer">Continue in WhatsApp <ArrowUpRight size={16} /></a> : <Link className="button button--forest" to="/contact">Contact the store <ArrowRight size={16} /></Link>}{order.whatsappUrl && <button className="text-link order-retry" onClick={() => window.open(order.whatsappUrl, '_blank', 'noopener,noreferrer')}>Retry WhatsApp <ArrowRight size={14} /></button>}<small>Please send the message in WhatsApp to complete your order enquiry. Opening WhatsApp does not confirm your order. This reference is saved on this device.</small></section>;
}

function PolicyPage() {
  const { slug } = useParams();
  const title = ({ shipping: 'Shipping policy', returns: 'Returns & exchanges', refunds: 'Refund policy', privacy: 'Privacy policy', terms: 'Terms & conditions' })[slug] || 'Policies';
  const query = useQuery({ queryKey: ['content'], queryFn: async () => (await api.get('/content')).data.data, enabled: !demoMode });
  const content = query.data?.[slug] || query.data?.[`${slug}Policy`];
  return <section className="section policy-page"><div className="breadcrumb breadcrumb--standalone"><Link to="/">Home</Link><span>/</span><span>{title}</span></div><div className="eyebrow"><span></span> The helpful details</div><h1>{title.split(' ').slice(0, -1).join(' ')} <em>{title.split(' ').slice(-1)}</em></h1>{content ? <div className="policy-content" dangerouslySetInnerHTML={{ __html: content }} /> : <div className="policy-placeholder"><CircleHelp /><p>{query.isLoading ? 'Loading the latest policy…' : 'This policy will be published here when configured by the Mann Ki Mannat team.'}</p><Link to="/contact">Ask us a question <ArrowRight size={14} /></Link></div>}</section>;
}

function NotFound() { return <section className="not-found section"><div className="eyebrow"><span></span> A small detour</div><h1>That page seems<br /><em>to have wandered.</em></h1><p>Let’s find something lovely instead.</p><Link className="button button--forest" to="/">Return home <ArrowRight size={16} /></Link></section>; }

function SiteFooter() {
  const settingsQuery = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings, staleTime: 5 * 60_000, enabled: !demoMode });
  const settings = settingsQuery.data || (demoMode ? previewSettings : {});
  const social = settings.socialLinks || {};
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><BrandMark light /><p>Thoughtful essentials for familiar rituals and the feeling of home.</p><div className="footer-social">{(settings.instagram || social.instagram) && <a href={settings.instagram || social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>}{(settings.facebook || social.facebook) && <a href={settings.facebook || social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={17} /></a>}{settings.email && <a href={`mailto:${settings.email}`} aria-label="Email"><Mail size={17} /></a>}</div></div>
      <div className="footer-links"><h4>Explore</h4><Link to="/shop">Shop all</Link><Link to="/collections">Collections</Link><Link to="/about">Our story</Link><Link to="/contact">Contact</Link></div>
      <div className="footer-links"><h4>Helpful things</h4><Link to="/policies/shipping">Shipping</Link><Link to="/policies/returns">Returns & exchanges</Link><Link to="/policies/privacy">Privacy</Link><Link to="/policies/terms">Terms</Link></div>
      <div className="footer-contact"><h4>Reach out</h4>{settings.email && <a href={`mailto:${settings.email}`}><Mail size={14} />{settings.email}</a>}{settings.phone && <a href={`tel:${settings.phone}`}><Phone size={14} />{settings.phone}</a>}{settings.address && <span><MapPin size={14} />{settings.address}</span>}<Link to="/contact" className="footer-contact__link">We’re listening <ArrowUpRight size={14} /></Link></div>
    </div><div className="footer-bottom"><span>© {new Date().getFullYear()} Mann Ki Mannat</span><span className="footer-mantra">Tradition <i>♥</i> Purity <i>♥</i> For a better home</span><span>For homes across India</span></div></footer>;
}

function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Namaste. What can I help you find today?' }]);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (question = value) => {
    if (!question.trim() || busy) return;
    setMessages((current) => [...current, { from: 'you', text: question }]); setValue(''); setBusy(true);
    if (demoMode) {
      const answer = /free|ship/i.test(question)
        ? 'Orders of 12 pieces get free shipping and ₹60 off. Shipping charges apply to 6 pieces; please call 8680871115 for the current fee.'
        : 'Each piece is ₹75, with a 3-piece minimum (₹225). Call or WhatsApp 8680871115 for product and order enquiries.';
      setMessages((current) => [...current, { from: 'bot', text: answer }]); setBusy(false); return;
    }
    try { const { data } = await api.post('/chatbot/query', { message: question }); setMessages((current) => [...current, { from: 'bot', text: data.data.answer, products: data.data.products || [] }]); }
    catch { setMessages((current) => [...current, { from: 'bot', text: 'I can help with products and policies once the catalogue is connected. You can also reach our team on the Contact page.' }]); }
    finally { setBusy(false); }
  };
  return <motion.aside className="chat-panel" initial={{ opacity: 0, y: 18, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .97 }}><div className="chat-head"><span className="chat-avatar"><Flower2 size={18} /></span><div><b>A little help?</b><small>Mann Ki Mannat assistant</small></div><button onClick={onClose} aria-label="Close chat"><X size={18} /></button></div><div className="chat-messages">{messages.map((message, i) => <div key={i} className={`chat-message chat-message--${message.from}`}>{message.text}{message.products?.slice(0, 2).map((product) => <Link key={product.id} className="chat-product" to={`/product/${product.slug}`} onClick={onClose}><img src={media(product)} alt="" /><span><b>{product.name}</b><small>{product.sellingPricePaise ? money(product.sellingPricePaise) : 'View details'}</small></span><ArrowRight size={14} /></Link>)}</div>)}{busy && <div className="chat-typing"><i></i><i></i><i></i></div>}</div><div className="chat-suggestions">{['Show me incense', 'Free shipping?'].map((item) => <button key={item} onClick={() => send(item)}>{item}</button>)}</div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask a question…" /><button aria-label="Send message" disabled={busy}><Send size={16} /></button></form></motion.aside>;
}

function AdminLogin() {
  const toast = useToast();
  const navigate = useNavigate();
  const [accountMode, setAccountMode] = useState('login');
  const [setupStatus, setSetupStatus] = useState({ loading: true, available: false, reason: 'checking' });
  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors, isSubmitting: loginSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });
  const { register: registerSetup, handleSubmit: handleSetupSubmit, setError: setSetupError, formState: { errors: setupErrors, isSubmitting: setupSubmitting } } = useForm({ defaultValues: { name: '', email: '', password: '', confirmPassword: '', setupToken: '' } });
  useEffect(() => {
    let current = true;
    api.get('/admin/auth/setup-status').then(({ data }) => { if (current) setSetupStatus({ loading: false, ...data.data }); }).catch(() => { if (current) setSetupStatus({ loading: false, available: false, reason: 'unavailable' }); });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    api.get('/admin/auth/me').then(() => { if (current) navigate('/admin/dashboard', { replace: true }); }).catch(() => {});
    return () => { current = false; };
  }, [navigate]);
  async function login(values) {
    try { await api.post('/admin/auth/login', values); navigate('/admin/dashboard'); }
    catch (error) { toast(error.response?.data?.message || 'Sign-in failed. Check your details and try again.', 'error'); }
  }
  async function createOwner(values) {
    if (values.password !== values.confirmPassword) {
      setSetupError('confirmPassword', { type: 'validate', message: 'The passwords do not match.' });
      return;
    }
    try {
      await api.post('/admin/auth/setup', { setupToken: values.setupToken, name: values.name, email: values.email, password: values.password });
      navigate('/admin/dashboard');
    } catch (error) {
      if (error.response?.status === 409) setSetupStatus({ loading: false, available: false, reason: 'owner_exists' });
      toast(error.response?.data?.message || 'Owner account setup failed. Check the backend and database connection.', 'error');
    }
  }
  async function resetOwner(values) {
    if (values.password !== values.confirmPassword) {
      setSetupError('confirmPassword', { type: 'validate', message: 'The passwords do not match.' });
      return;
    }
    try {
      await api.post('/admin/auth/reset-owner', { setupToken: values.setupToken, name: values.name, email: values.email, password: values.password });
      toast('Owner access updated. Sign in with the new email and password.');
      setAccountMode('login');
    } catch (error) {
      toast(error.response?.data?.message || 'Owner reset failed. Check the setup token and try again.', 'error');
    }
  }
  const canResetOwner = setupStatus.reason === 'owner_exists';
  const setupMessage = setupStatus.loading ? 'Checking first-account setup…' : setupStatus.available
    ? 'This store is ready for its first owner account.'
    : setupStatus.reason === 'owner_exists' ? 'An owner account already exists. Enter the setup token below to set a new owner email and password, or sign in.'
      : setupStatus.reason === 'disabled' ? 'Initial setup is locked. Configure ADMIN_SETUP_TOKEN in the backend environment and restart the API.'
        : 'The backend or database is unavailable. Start the API, connect the database, then reload this page.';
  return <div className="admin-login-page"><div className="admin-login-art"><div className="admin-login-brand"><BrandMark light /><span className="admin-login-statement">A considered home.<br /><em>Thoughtfully managed.</em></span><small>ADMINISTRATOR ACCESS</small></div><img src="/images/brand-poster.png" alt="" /></div>
    {accountMode === 'login' ? <form className="admin-login-form" onSubmit={handleLoginSubmit(login)}>
      <Link className="back-store" to="/"><ArrowLeft size={15} /> Back to storefront</Link><div className="eyebrow"><span></span> Welcome back</div><h1>Sign in to<br /><em>your workspace.</em></h1><p>Use your administrator email and password.</p>
      <FormField label="Email address" error={loginErrors.email?.message}><input {...registerLogin('email', { required: 'Enter your email address.' })} type="email" autoComplete="username" placeholder="you@example.com" /></FormField>
      <FormField label="Password" error={loginErrors.password?.message}><input {...registerLogin('password', { required: 'Enter your password.' })} type="password" autoComplete="current-password" placeholder="Your password" /></FormField>
      <button className="button button--forest button--wide" disabled={loginSubmitting}>{loginSubmitting ? 'Signing in…' : 'Sign in securely'} <ArrowRight size={16} /></button>
      <div className="admin-account-switch"><span>First time setting up this store?</span><button type="button" onClick={() => setAccountMode('setup')}>Create the owner account <ArrowRight size={14} /></button></div>
    </form> : <form className="admin-login-form admin-login-form--setup" onSubmit={handleSetupSubmit(canResetOwner ? resetOwner : createOwner)}>
      <Link className="back-store" to="/"><ArrowLeft size={15} /> Back to storefront</Link><div className="eyebrow"><span></span> {canResetOwner ? 'Owner password reset' : 'One-time store setup'}</div><h1>{canResetOwner ? <>Reset your<br /><em>owner access.</em></> : <>Create your<br /><em>owner account.</em></>}</h1><p>{canResetOwner ? 'Confirm the owner name and email, then set a new password. Store data stays unchanged.' : 'The first owner can manage products, offers, orders, and team access.'}</p>
      <div className={`admin-account-availability ${setupStatus.available ? 'admin-account-availability--ready' : 'admin-account-availability--locked'}`} role="status">{setupMessage}</div>
      <FormField label="Full name" error={setupErrors.name?.message}><input {...registerSetup('name', { required: 'Enter your name.', minLength: { value: 2, message: 'Enter at least 2 characters.' } })} autoComplete="name" placeholder="Store owner" /></FormField>
      <FormField label="Email address (username)" error={setupErrors.email?.message}><input {...registerSetup('email', { required: 'Enter your email address.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' } })} type="email" autoComplete="username" placeholder="you@example.com" /></FormField>
      <FormField label="Password · at least 16 characters" error={setupErrors.password?.message}><input {...registerSetup('password', { required: 'Create a password.', minLength: { value: 16, message: 'Use at least 16 characters.' } })} type="password" autoComplete="new-password" placeholder="Create a strong password" /></FormField>
      <FormField label="Confirm password" error={setupErrors.confirmPassword?.message}><input {...registerSetup('confirmPassword', { required: 'Confirm your password.' })} type="password" autoComplete="new-password" placeholder="Enter it again" /></FormField>
      <FormField label="One-time setup token" error={setupErrors.setupToken?.message}><input {...registerSetup('setupToken', { required: 'Enter the setup token from the backend configuration.', minLength: { value: 32, message: 'The setup token must be at least 32 characters.' } })} type="password" autoComplete="off" placeholder="Paste ADMIN_SETUP_TOKEN" /></FormField>
      <button className="button button--forest button--wide" disabled={setupSubmitting || !(setupStatus.available || canResetOwner)}>{setupSubmitting ? (canResetOwner ? 'Updating owner access…' : 'Creating owner account…') : (canResetOwner ? 'Reset owner password' : 'Create owner account')} <ArrowRight size={16} /></button>
      <div className="admin-account-switch"><span>Already have an account?</span><button type="button" onClick={() => setAccountMode('login')}>Sign in <ArrowRight size={14} /></button></div>
    </form>}
  </div>;
}

function AdminApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const toast = useToast();
  useEffect(() => { api.get('/admin/auth/me').then((response) => setMe(response.data.data)).catch(() => setMe(null)).finally(() => setAuthLoading(false)); }, []);
  async function signOut() { try { await api.post('/admin/auth/logout'); } catch {} setMe(null); navigate('/admin/login'); }
  if (authLoading) return <div className="admin-loading"><LoaderCircle className="spin" /> Loading workspace</div>;
  if (!me) return <div className="admin-locked"><LockKeyhole size={26} /><h2>Admin sign-in required</h2><p>Your secure session has ended or is unavailable.</p><Link to="/admin/login" className="button button--forest">Sign in <ArrowRight size={15} /></Link></div>;
  const section = location.pathname.split('/')[2] || 'dashboard';
  const title = ({ dashboard: 'Overview', products: 'Products', categories: 'Categories', media: 'Media library', orders: 'Order enquiries', inventory: 'Inventory', settings: 'Settings', reports: 'Reports', offers: 'Offers', banners: 'Banners', content: 'Site content', faqs: 'FAQs', reviews: 'Reviews', enquiries: 'Enquiries', newsletter: 'Newsletter', chatbot: 'Shopping assistant', customers: 'Customers', users: 'Team access' })[section] || 'Overview';
  const links = [{ path: 'dashboard', label: 'Overview', Icon: LayoutDashboard }, { path: 'products', label: 'Products', Icon: Boxes }, { path: 'categories', label: 'Categories', Icon: Flower2 }, { path: 'media', label: 'Media library', Icon: Images }, { path: 'orders', label: 'Order enquiries', Icon: ClipboardList }, { path: 'inventory', label: 'Inventory', Icon: PackageCheck }, { path: 'offers', label: 'Offers', Icon: Sparkles }, { path: 'banners', label: 'Banners', Icon: Eye }, { path: 'content', label: 'Site content', Icon: LayoutDashboard }, { path: 'faqs', label: 'FAQs', Icon: CircleHelp }, { path: 'reviews', label: 'Reviews', Icon: Heart }, { path: 'enquiries', label: 'Enquiries', Icon: MessageCircle }, { path: 'newsletter', label: 'Newsletter', Icon: Mail }, { path: 'chatbot', label: 'Shopping assistant', Icon: Sparkles }, { path: 'customers', label: 'Customers', Icon: ClipboardList }, ...(me.role?.name === 'OWNER' ? [{ path: 'users', label: 'Team access', Icon: ShieldCheck }] : []), { path: 'reports', label: 'Reports', Icon: ArrowUpRight }, { path: 'settings', label: 'Settings', Icon: Settings }];
  return <div className="admin-shell"><aside className={`admin-sidebar ${mobileSidebar ? 'admin-sidebar--open' : ''}`}><div className="admin-sidebar-brand"><BrandMark /><button onClick={() => setMobileSidebar(false)} aria-label="Close menu"><X size={17} /></button></div><div className="admin-nav-label">WORKSPACE</div><nav>{links.map(({ path, label, Icon }) => <NavLink key={path} to={`/admin/${path}`} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileSidebar(false)}><Icon size={17} />{label}{label === 'Order enquiries' && <span className="admin-nav-dot" />}</NavLink>)}</nav><div className="admin-sidebar-bottom"><div className="admin-user"><span className="admin-user-avatar">{(me.name || me.email || 'A').slice(0, 1).toUpperCase()}</span><span><b>{me.name || 'Administrator'}</b><small>{me.email}</small></span></div><button className="admin-signout" onClick={signOut}><LogOut size={16} />Sign out</button><Link to="/" className="view-store-link"><ExternalLink size={14} /> View storefront</Link></div></aside>
    <main className="admin-main"><header className="admin-topbar"><button className="icon-button admin-menu-toggle" onClick={() => setMobileSidebar(true)} aria-label="Open admin menu"><Menu /></button><div><small>ADMINISTRATION / {section.toUpperCase()}</small><h1>{title}</h1></div><div className="admin-topbar-right"><span className="admin-live"><i></i> Store workspace</span><span className="admin-user-mini">{(me.name || me.email || 'A').slice(0,1).toUpperCase()}</span></div></header>
      {section === 'dashboard' ? <AdminDashboard /> : section === 'media' ? <MediaLibraryPage /> : <AdminResource section={section} />}
    </main></div>;
}

function AdminDashboard() {  const query = useQuery({ queryKey: ['admin-overview'], queryFn: async () => (await api.get('/admin/dashboard/overview')).data.data });
  const data = query.data || {};
  const cards = [{ label: 'Active products', value: data.activeProducts ?? '—', change: 'Catalogue' }, { label: 'New enquiries', value: data.newEnquiries ?? '—', change: 'Needs attention' }, { label: 'Confirmed orders', value: data.confirmedOrders ?? '—', change: 'Sales only' }, { label: 'Low stock', value: data.lowStock ?? '—', change: 'Inventory' }];
  return <div className="admin-content"><div className="admin-welcome"><div><div className="eyebrow"><span></span> Your store, at a glance</div><h2>Good things begin <em>with a clear view.</em></h2><p>Order enquiries and confirmed orders are tracked separately.</p></div><Link to="/admin/products/add" className="button button--forest">Add a product <Plus size={16} /></Link></div><div className="admin-metric-grid">{cards.map((card, i) => <article className="admin-metric" key={card.label}><span>{card.label}</span><strong>{query.isLoading ? '…' : card.value}</strong><small className={i === 1 ? 'metric-warn' : ''}>{card.change}</small><span className="metric-mark">{['◈', '↗', '✓', '⌁'][i]}</span></article>)}</div><div className="admin-dashboard-grid"><section className="admin-panel admin-chart-panel"><div className="admin-panel-heading"><div><span>Order activity</span><small>Actual enquiries and confirmed orders</small></div><select aria-label="Chart period"><option>Last 30 days</option><option>Last 7 days</option></select></div>{data.orderTrends?.length ? <div className="simple-chart">{data.orderTrends.map((point, i) => <div key={point.label || i} style={{ height: `${Math.max(8, Math.min(100, point.value * 8))}%` }} title={`${point.label}: ${point.value}`}><span>{point.label}</span></div>)}</div> : <div className="chart-empty"><span className="chart-empty-icon"><ArrowUpRight /></span><p>{query.isLoading ? 'Loading order activity…' : 'Your order activity will appear here as enquiries come in.'}</p></div>}</section><section className="admin-panel admin-activity"><div className="admin-panel-heading"><div><span>Recent enquiries</span><small>Latest customer requests</small></div><Link to="/admin/orders">View all <ArrowRight size={14} /></Link></div>{data.recentEnquiries?.length ? data.recentEnquiries.slice(0, 5).map((order) => <div className="admin-order-row" key={order.id}><span className="order-initial">{(order.customerName || 'C')[0]}</span><div><b>{order.customerName}</b><small>{order.orderNumber}</small></div><span className={`status-pill status-pill--${(order.orderStatus || 'ENQUIRY').toLowerCase()}`}>{order.orderStatus || 'ENQUIRY'}</span></div>) : <div className="activity-empty"><ClipboardList size={22} /><p>{query.isLoading ? 'Loading enquiries…' : 'No enquiries yet. New customer orders will appear here.'}</p></div>}</section></div><div className="admin-setup-tip"><Sparkles size={16} /><span><b>Set your store up for success.</b> Add verified catalogue details, price, stock, and WhatsApp settings before opening orders.</span><Link to="/admin/settings">Review settings <ArrowRight size={14} /></Link></div></div>;
}

const productFormDefaults = {
  name: '', slug: '', sku: '', categoryId: '', shortDescription: '', description: '',
  mrpPaise: '', sellingPricePaise: '', minimumOrderQuantity: 3, stockQuantity: 0, lowStockThreshold: 5,
  fragrance: '', ingredients: '', usageInstructions: '', shippingEligible: true,
  featured: false, seasonal: false, active: true, images: [],
};
function emptySectionForm(section) {
  if (section === 'products') return { ...productFormDefaults, images: [] };
  if (section === 'categories') return { name: '', slug: '', description: '', imageUrl: '', active: true, sortOrder: 0 };
  if (section === 'offers') return { name: '', description: '', promoText: '', discountType: 'FIXED', discountValue: '', minimumOrderPaise: '', freeShippingThreshold: '', active: true };
  if (section === 'banners') return { title: '', subtitle: '', imageUrl: '', linkUrl: '', placement: 'home-hero', sortOrder: 0, active: true };
  if (section === 'faqs') return { question: '', answer: '', category: '', active: true, sortOrder: 0 };
  if (section === 'chatbot') return { question: '', answer: '', active: true, sortOrder: 0 };
  if (section === 'users') return { name: '', email: '', password: '', role: 'ADMIN', active: true };
  if (section === 'inventory') return { change: 0, reason: '' };
  return {};
}
function productForm(record = {}) {
  return {
    ...productFormDefaults,
    name: record.name || '', slug: record.slug || '', sku: record.sku || '',
    categoryId: record.categoryId || record.category?.id || '',
    shortDescription: record.shortDescription || '', description: record.description || '',
    mrpPaise: record.mrpPaise ?? '', sellingPricePaise: record.sellingPricePaise ?? '',
    minimumOrderQuantity: record.minimumOrderQuantity ?? record.minimumQuantity ?? 3,
    stockQuantity: record.stockQuantity ?? 0, lowStockThreshold: record.lowStockThreshold ?? 5,
    fragrance: record.fragrance || '', ingredients: record.ingredients || '', usageInstructions: record.usageInstructions || '',
    shippingEligible: record.shippingEligible ?? true, featured: Boolean(record.featured), seasonal: Boolean(record.seasonal), active: record.active ?? true,
    images: reindexImages((record.images || []).map((image) => ({ url: image.url || image, publicId: image.publicId || undefined, altText: image.altText || '', isPrimary: Boolean(image.isPrimary), sortOrder: image.sortOrder ?? 0 })), Math.max(0, (record.images || []).findIndex((image) => image.isPrimary))),
  };
}
function reindexImages(list, primaryIndex = 0) {
  const safePrimary = list.length ? Math.min(Math.max(primaryIndex, 0), list.length - 1) : 0;
  return list.map((image, index) => ({ url: image.url, publicId: image.publicId || undefined, altText: image.altText || '', sortOrder: index, isPrimary: list.length > 0 && index === safePrimary }));
}
async function compressImage(file, maxSize = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`, { type: blob.type || 'image/webp' });
  } catch { return file; }
}
function readableSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function PaiseInput({ value, onChange, placeholder, min = '0', ...rest }) {
  return <input {...rest} type="number" min={min} step="1" inputMode="decimal" value={value === '' || value == null ? '' : Number(value) / 100} placeholder={placeholder} onChange={(event) => onChange(event.target.value === '' ? '' : Math.round(Number(event.target.value) * 100))} />;
}
function ImageManager({ images, onChange, max = 12 }) {
  const toast = useToast();
  const fileInput = useRef(null);
  const galleryInput = useRef(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');
  const [picked, setPicked] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const galleryQuery = useQuery({ queryKey: ['admin-media', gallerySearch], queryFn: async () => (await api.get('/admin/media', { params: { limit: 60, search: gallerySearch } })).data.data.items, enabled: galleryOpen });
  const selected = images || [];
  function change(list, primaryIndex) { onChange(reindexImages(list, primaryIndex ?? 0)); }
  function addAssets(assets) {
    const existingPrimary = selected.findIndex((image) => image.isPrimary);
    const next = [...selected];
    for (const asset of assets) {
      if (next.length >= max) { toast(`Up to ${max} images can be added to one product.`, 'error'); break; }
      if (next.some((image) => image.url === asset.url)) continue;
      next.push({ url: asset.url, altText: '', sortOrder: next.length, isPrimary: next.length === 0 });
    }
    if (next.length !== selected.length) change(next, existingPrimary >= 0 ? existingPrimary : 0);
  }
  async function uploadFiles(files) {
    const list = [...files];
    if (!list.length) return;
    setUploading(true);
    try {
      const prepared = [];
      for (const file of list) prepared.push(await compressImage(file));
      const uploaded = [];
      for (let index = 0; index < prepared.length; index += 8) {
        const form = new FormData();
        prepared.slice(index, index + 8).forEach((file) => form.append('images', file));
        const response = await api.post('/admin/media', form);
        uploaded.push(...response.data.data);
      }
      addAssets(uploaded);
      toast(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} added. Save the product to publish them.`);
      if (galleryOpen) galleryQuery.refetch();
    } catch (error) {
      toast(error.response?.data?.message || 'Image upload failed. Use a JPG, PNG, or WebP under 5 MB.', 'error');
    } finally { setUploading(false); }
  }
  function addUrl() {
    const value = urlDraft.trim();
    if (!value) return;
    const relative = value.startsWith('/images/') || value.startsWith('/api/v1/media/');
    if (!relative) {
      try { if (new URL(value).protocol !== 'https:') throw new Error('https'); } catch { toast('Paste a full HTTPS image URL.', 'error'); return; }
    }
    if (selected.some((image) => image.url === value)) { toast('That image is already in the product.', 'error'); return; }
    if (selected.length >= max) { toast(`Up to ${max} images can be added to one product.`, 'error'); return; }
    if (value !== urlDraft.trim()) return;
    change([...selected, { url: value, altText: '', sortOrder: selected.length, isPrimary: selected.length === 0 }], selected.findIndex((image) => image.isPrimary));
    setUrlDraft('');
  }
  function removeAt(index) {
    const primaryIndex = selected.findIndex((image) => image.isPrimary);
    const next = selected.filter((_, itemIndex) => itemIndex !== index);
    const nextPrimary = primaryIndex === index ? 0 : primaryIndex > index ? primaryIndex - 1 : primaryIndex;
    change(next, nextPrimary);
  }
  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const primaryUrl = selected.find((image) => image.isPrimary)?.url;
    change(next, next.findIndex((image) => image.url === primaryUrl));
  }
  function togglePicked(asset) {
    setPicked((current) => current.some((item) => item.id === asset.id) ? current.filter((item) => item.id !== asset.id) : [...current, asset]);
  }
  return <div className="image-manager">
    <div className="image-manager-actions">
      <button type="button" className="button button--forest" onClick={() => fileInput.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}{uploading ? 'Preparing images…' : 'Upload from device'}</button>
      <button type="button" className="button button--outline" onClick={() => { setPicked([]); setGalleryOpen(true); }}><Images size={15} /> Choose from gallery</button>
      <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { uploadFiles(event.target.files); event.target.value = ''; }} />
      <span className="image-manager-count">{selected.length} of {max} images · first image is the main photo</span>
    </div>
    <div className="image-url-row"><Link2 size={14} /><input value={urlDraft} onChange={(event) => setUrlDraft(event.target.value)} placeholder="Or paste an HTTPS image URL" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addUrl(); } }} /><button type="button" className="text-link" onClick={addUrl}>Add URL</button></div>
    {selected.length ? <div className="image-tile-grid">{selected.map((image, index) => <figure className={`image-tile ${image.isPrimary ? 'image-tile--primary' : ''}`} key={`${image.url}-${index}`}>
      <div className="image-tile-preview"><img src={assetUrl(image.url)} alt={image.altText || `Product image ${index + 1}`} />{image.isPrimary && <span className="image-tile-badge"><Star size={11} /> Main</span>}</div>
      <figcaption><input value={image.altText || ''} onChange={(event) => { const next = selected.map((item, itemIndex) => itemIndex === index ? { ...item, altText: event.target.value } : item); change(next, selected.findIndex((item) => item.isPrimary)); }} placeholder="Describe this image (optional)" aria-label={`Alt text for image ${index + 1}`} />
        <div className="image-tile-tools">
          <button type="button" title="Make main image" onClick={() => change(selected, index)} disabled={image.isPrimary}><Star size={13} /></button>
          <button type="button" title="Move left" onClick={() => move(index, -1)} disabled={index === 0}><ChevronLeft size={14} /></button>
          <button type="button" title="Move right" onClick={() => move(index, 1)} disabled={index === selected.length - 1}><ChevronRight size={14} /></button>
          <button type="button" title="Remove image" onClick={() => removeAt(index)}><Trash2 size={13} /></button>
        </div>
      </figcaption>
    </figure>)}</div> : <div className="image-manager-empty"><ImagePlus size={26} /><div><b>No images yet</b><span>Upload from this device, pick a saved image from the gallery, or paste a URL.</span></div></div>}
    {galleryOpen && <div className="media-modal-backdrop" role="dialog" aria-modal="true" aria-label="Choose images from gallery" onClick={() => setGalleryOpen(false)}>
      <div className="media-modal" onClick={(event) => event.stopPropagation()}>
        <div className="media-modal-head"><div><span className="eyebrow"><span></span> Media library</span><h3>Choose saved images</h3></div><button type="button" className="icon-button" onClick={() => setGalleryOpen(false)} aria-label="Close gallery"><X size={18} /></button></div>
        <div className="media-modal-tools"><label className="admin-search"><Search size={15} /><input value={gallerySearch} onChange={(event) => setGallerySearch(event.target.value)} placeholder="Search by file name" /></label><button type="button" className="button button--outline" onClick={() => galleryInput.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="spin" size={14} /> : <Upload size={14} />} Upload new</button><input ref={galleryInput} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { uploadFiles(event.target.files); event.target.value = ''; }} /><button type="button" className="icon-button" onClick={() => galleryQuery.refetch()} title="Refresh"><RefreshCw size={15} /></button></div>
        {galleryQuery.isLoading ? <div className="admin-table-loading"><LoaderCircle className="spin" /> Loading gallery…</div> : galleryQuery.isError ? <div className="image-manager-empty"><AlertCircle size={24} /><div><b>Gallery unavailable</b><span>Upload a new image instead.</span></div></div> : galleryQuery.data?.length ? <div className="media-pick-grid">{galleryQuery.data.map((asset) => { const active = picked.some((item) => item.id === asset.id); return <button type="button" key={asset.id} className={`media-pick ${active ? 'media-pick--active' : ''}`} onClick={() => togglePicked(asset)}><img src={assetUrl(asset.url)} alt={asset.fileName} loading="lazy" /><span>{active ? <Check size={13} /> : null}{asset.fileName}</span></button>; })}</div> : <div className="image-manager-empty"><Images size={26} /><div><b>No saved images yet</b><span>Upload one above and it will stay in the gallery for future products.</span></div></div>}
        <div className="media-modal-foot"><span>{picked.length ? `${picked.length} selected` : 'Select one or more images'}</span><div><button type="button" className="button button--outline" onClick={() => setGalleryOpen(false)}>Cancel</button><button type="button" className="button button--forest" disabled={!picked.length} onClick={() => { addAssets(picked); setGalleryOpen(false); setPicked([]); }}>Add selected images <Check size={15} /></button></div></div>
      </div>
    </div>}
  </div>;
}
function MediaLibraryPage() {
  const toast = useToast();
  const fileInput = useRef(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const query = useQuery({ queryKey: ['admin-media-page', page, search], queryFn: async () => (await api.get('/admin/media', { params: { page, limit: 24, search } })).data.data });
  const items = query.data?.items || [];
  async function uploadFiles(files) {
    const list = [...files];
    if (!list.length) return;
    setUploading(true);
    try {
      const prepared = [];
      for (const file of list) prepared.push(await compressImage(file));
      const uploaded = [];
      for (let index = 0; index < prepared.length; index += 8) {
        const form = new FormData();
        prepared.slice(index, index + 8).forEach((file) => form.append('images', file));
        uploaded.push(...(await api.post('/admin/media', form)).data.data);
      }
      toast(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded.`);
      setPage(1);
      query.refetch();
    } catch (error) { toast(error.response?.data?.message || 'Image upload failed.', 'error'); } finally { setUploading(false); }
  }
  async function removeAsset(asset) {
    if (!window.confirm('Remove this image from the gallery?')) return;
    try { await api.delete(`/admin/media/${asset.id}`); toast('Image removed.'); query.refetch(); }
    catch (error) { toast(error.response?.data?.message || 'Could not remove this image.', 'error'); }
  }
  async function copyAsset(asset) {
    const url = new URL(assetUrl(asset.url), window.location.origin).href;
    try { await navigator.clipboard.writeText(url); toast('Image URL copied.'); } catch { toast('Could not copy the URL. Long-press the image and copy its address.', 'error'); }
  }
  return <div className="admin-content">
    <div className="admin-resource-toolbar"><div><div className="eyebrow"><span></span> Manage your store</div><h2>Media library</h2><p>One place for every product photo. Upload once, reuse on any product.</p></div><div className="admin-resource-actions"><label className="admin-search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search images" /></label><button type="button" className="button button--forest" onClick={() => fileInput.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}{uploading ? 'Uploading…' : 'Upload images'}</button><input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { uploadFiles(event.target.files); event.target.value = ''; }} /></div></div>
    {query.isLoading ? <div className="admin-table-loading"><LoaderCircle className="spin" /> Loading images…</div> : query.isError ? <ErrorNotice retry={() => query.refetch()} /> : items.length ? <div className="media-library-grid">{items.map((asset) => <article className="media-library-card" key={asset.id}><div className="media-library-card-image"><img src={assetUrl(asset.url)} alt={asset.fileName} loading="lazy" /></div><div className="media-library-card-body"><b title={asset.fileName}>{asset.fileName}</b><small>{readableSize(asset.sizeBytes)} · {new Date(asset.createdAt).toLocaleDateString('en-IN')}</small><div className="media-library-card-actions"><button type="button" title="Copy image URL" onClick={() => copyAsset(asset)}><Copy size={13} /> Copy URL</button><button type="button" title="Delete image" onClick={() => removeAsset(asset)}><Trash2 size={13} /> Delete</button></div></div></article>)}</div> : <div className="image-manager-empty admin-media-empty"><Images size={30} /><div><b>No images in the library yet</b><span>Upload product photos here, then choose them from any product form.</span></div><button type="button" className="button button--forest" onClick={() => fileInput.current?.click()}>Upload your first image</button></div>}
    {query.data && query.data.pageCount > 1 && <div className="admin-pagination"><span>Page {query.data.page} of {query.data.pageCount} · {query.data.total} images</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={14} /></button><span>{page}</span><button type="button" disabled={page >= query.data.pageCount} onClick={() => setPage((current) => current + 1)}><ChevronRight size={14} /></button></div></div>}
  </div>;
}
function ProductEditorFields({ formData, setFormData, categories }) {
  const set = (key, value) => setFormData((current) => ({ ...current, [key]: value }));
  const price = formData.sellingPricePaise ? money(formData.sellingPricePaise) : 'Set a selling price';
  return <>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>01</span><div><h4>Product basics</h4><p>The name, code, and category customers will browse.</p></div></div>
      <div className="admin-form-grid">
        <label className="admin-form-field admin-form-field--wide"><span>Product name <i>*</i></span><input value={formData.name || ''} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Royal Sandal Incense Sticks" autoComplete="off" /></label>
        <label className="admin-form-field"><span>Slug <small>Leave blank to create it from the name</small></span><input value={formData.slug || ''} onChange={(event) => set('slug', event.target.value.trim().toLowerCase())} placeholder="royal-sandal" autoComplete="off" /></label>
        <label className="admin-form-field"><span>SKU <i>*</i></span><input value={formData.sku || ''} onChange={(event) => set('sku', event.target.value.toUpperCase())} placeholder="MKM-INC-001" autoComplete="off" /></label>
        <label className="admin-form-field"><span>Category</span><select value={formData.categoryId || ''} onChange={(event) => set('categoryId', event.target.value || null)}><option value="">No category</option>{(categories || []).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="admin-form-field admin-form-field--wide"><span>Short description <small>One line shown on product cards</small></span><textarea rows="2" maxLength="300" value={formData.shortDescription || ''} onChange={(event) => set('shortDescription', event.target.value)} placeholder="A calm, grounding sandalwood blend for daily rituals." /></label>
      </div>
    </section>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>02</span><div><h4>Price and stock</h4><p>Enter amounts in rupees — the store converts them automatically.</p></div></div>
      <div className="admin-form-grid">
        <label className="admin-form-field"><span>MRP <small>₹ per piece</small></span><PaiseInput value={formData.mrpPaise} onChange={(value) => set('mrpPaise', value)} placeholder="120" /></label>
        <label className="admin-form-field"><span>Selling price <i>*</i> <small>₹ per piece</small></span><PaiseInput value={formData.sellingPricePaise} onChange={(value) => set('sellingPricePaise', value)} placeholder="75" /></label>
        <label className="admin-form-field"><span>Minimum order <small>pieces</small></span><input type="number" min="1" max="500" step="1" value={formData.minimumOrderQuantity ?? 3} onChange={(event) => set('minimumOrderQuantity', event.target.value === '' ? '' : Number(event.target.value))} /></label>
        <label className="admin-form-field"><span>Stock on hand <small>pieces</small></span><input type="number" min="0" step="1" value={formData.stockQuantity ?? 0} onChange={(event) => set('stockQuantity', event.target.value === '' ? '' : Number(event.target.value))} /></label>
        <label className="admin-form-field"><span>Low-stock alert at <small>pieces</small></span><input type="number" min="0" step="1" value={formData.lowStockThreshold ?? 5} onChange={(event) => set('lowStockThreshold', event.target.value === '' ? '' : Number(event.target.value))} /></label>
        <div className="admin-form-summary"><small>Customer sees</small><strong>{price}</strong><span>{formData.minimumOrderQuantity || 3} piece minimum{formData.mrpPaise && formData.sellingPricePaise && Number(formData.mrpPaise) > Number(formData.sellingPricePaise) ? ` · ${Math.round((1 - Number(formData.sellingPricePaise) / Number(formData.mrpPaise)) * 100)}% off MRP` : ''}</span></div>
      </div>
    </section>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>03</span><div><h4>Product photos</h4><p>Upload from this device or reuse an image from the gallery. Drag-free ordering with the arrows.</p></div></div>
      <ImageManager images={formData.images || []} onChange={(images) => set('images', images)} />
    </section>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>04</span><div><h4>Details and care</h4><p>Helpful information shown on the product page.</p></div></div>
      <div className="admin-form-grid">
        <label className="admin-form-field"><span>Fragrance</span><input value={formData.fragrance || ''} onChange={(event) => set('fragrance', event.target.value)} placeholder="Sandalwood, rose, lavender" /></label>
        <label className="admin-form-field admin-form-field--wide"><span>Full description</span><textarea rows="5" value={formData.description || ''} onChange={(event) => set('description', event.target.value)} placeholder="Tell the story of this product, its ingredients, and how it feels to use." /></label>
        <label className="admin-form-field admin-form-field--wide"><span>Ingredients</span><textarea rows="3" value={formData.ingredients || ''} onChange={(event) => set('ingredients', event.target.value)} placeholder="One ingredient per line, or a short paragraph." /></label>
        <label className="admin-form-field admin-form-field--wide"><span>How to use</span><textarea rows="3" value={formData.usageInstructions || ''} onChange={(event) => set('usageInstructions', event.target.value)} placeholder="Light the tip, wait a moment, and place it on a heat-safe holder." /></label>
      </div>
    </section>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>05</span><div><h4>Visibility</h4><p>Control where this product appears. A selling price is required before it can be active.</p></div></div>
      <div className="admin-switch-grid">
        {[['active', 'Active in the store', 'Customers can browse and order it.'], ['featured', 'Featured', 'Show it in featured collections on the home page.'], ['seasonal', 'Seasonal', 'Mark it for festive or limited-time ranges.'], ['shippingEligible', 'Shipping eligible', 'Counts toward free-shipping thresholds.']].map(([key, label, hint]) => <label className="admin-switch" key={key}><input type="checkbox" checked={Boolean(formData[key])} onChange={(event) => set(key, event.target.checked)} /><span><b>{label}</b><small>{hint}</small></span></label>)}
      </div>
    </section>
  </>;
}
function SettingsEditorFields({ formData, setFormData }) {
  const set = (key, value) => setFormData((current) => ({ ...current, [key]: value }));
  const shipping = formData.shippingChargePaise;
  const threshold = Number(formData.freeShippingThreshold) || 12;
  return <>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>01</span><div><h4>Store identity</h4><p>The name and lines customers see across the storefront.</p></div></div>
      <div className="admin-form-grid">
        <label className="admin-form-field"><span>Business name <i>*</i></span><input value={formData.businessName || ''} onChange={(event) => set('businessName', event.target.value)} placeholder="Mann Ki Mannat" /></label>
        <label className="admin-form-field"><span>Tagline</span><input value={formData.tagline || ''} onChange={(event) => set('tagline', event.target.value)} placeholder="Har Ghar Ki Mannat" /></label>
        <label className="admin-form-field"><span>Announcement bar</span><input value={formData.announcementBar || ''} onChange={(event) => set('announcementBar', event.target.value)} placeholder="Free shipping on 12 pieces" /></label>
        <label className="admin-form-field admin-form-field--wide"><span>Promotion note <small>Shown near the cart and checkout</small></span><textarea rows="2" value={formData.promoText || ''} onChange={(event) => set('promoText', event.target.value)} placeholder="Buy 12 pieces and get free shipping." /></label>
      </div>
    </section>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>02</span><div><h4>Contact and address</h4><p>Used on the contact page, invoices, and WhatsApp order links.</p></div></div>
      <div className="admin-form-grid">
        <label className="admin-form-field"><span>WhatsApp number <small>With country code</small></span><input value={formData.whatsappNumber || ''} onChange={(event) => set('whatsappNumber', event.target.value)} placeholder="918680871115" /></label>
        <label className="admin-form-field"><span>Phone</span><input value={formData.phone || ''} onChange={(event) => set('phone', event.target.value)} placeholder="8680871115" /></label>
        <label className="admin-form-field"><span>Email</span><input type="email" value={formData.email || ''} onChange={(event) => set('email', event.target.value)} placeholder="hello@mannkimannat.com" /></label>
        <label className="admin-form-field"><span>Business hours</span><input value={formData.businessHours || ''} onChange={(event) => set('businessHours', event.target.value)} placeholder="Mon–Sat, 10am–7pm" /></label>
        <label className="admin-form-field admin-form-field--wide"><span>Address</span><textarea rows="2" value={formData.address || ''} onChange={(event) => set('address', event.target.value)} placeholder="Street, city, state, PIN" /></label>
      </div>
    </section>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>03</span><div><h4>Shipping and order minimums</h4><p>Controls the delivery line at checkout. Enter money in rupees.</p></div></div>
      <div className="admin-form-grid">
        <label className="admin-form-field"><span>Delivery charge <small>₹ per order below the free-shipping quantity</small></span><PaiseInput value={shipping ?? ''} onChange={(value) => set('shippingChargePaise', value)} placeholder="60" /></label>
        <label className="admin-form-field"><span>Free shipping from <small>pieces</small></span><input type="number" min="1" step="1" value={formData.freeShippingThreshold ?? ''} onChange={(event) => set('freeShippingThreshold', event.target.value === '' ? '' : Number(event.target.value))} placeholder="12" /></label>
        <label className="admin-form-field"><span>Store minimum order <small>pieces</small></span><input type="number" min="1" step="1" value={formData.globalMinimumQuantity ?? ''} onChange={(event) => set('globalMinimumQuantity', event.target.value === '' ? '' : Number(event.target.value))} placeholder="3" /></label>
        <label className="admin-form-field"><span>Mixed carts <small>How shipping counts non-eligible items</small></span><select value={formData.mixedCartShippingPolicy || 'eligible_items'} onChange={(event) => set('mixedCartShippingPolicy', event.target.value)}><option value="eligible_items">Count eligible items only</option><option value="all_items">Count every item</option></select></label>
        <div className="admin-form-summary"><small>Checkout preview</small><strong>{shipping == null || shipping === '' ? 'Delivery charge not set' : money(Number(shipping))}</strong><span>{shipping == null || shipping === '' ? 'Orders below the free-shipping quantity will ask the store to confirm delivery.' : `Free delivery from ${threshold} pieces`}</span></div>
      </div>
    </section>
    <section className="admin-form-section">
      <div className="admin-form-section-head"><span>04</span><div><h4>Shopping assistant</h4><p>The small helper that answers product and policy questions.</p></div></div>
      <div className="admin-switch-grid">
        <label className="admin-switch"><input type="checkbox" checked={Boolean(formData.chatbotEnabled)} onChange={(event) => set('chatbotEnabled', event.target.checked)} /><span><b>Assistant enabled</b><small>Show the chat button on the storefront.</small></span></label>
      </div>
      <div className="admin-form-grid">
        <label className="admin-form-field admin-form-field--wide"><span>Welcome message</span><textarea rows="3" value={formData.chatbotWelcome || ''} onChange={(event) => set('chatbotWelcome', event.target.value)} placeholder="I can help with products, prices, availability, and policies." /></label>
      </div>
    </section>
  </>;
}
function AdminResource({ section }) {
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(section === 'products' && location.pathname.endsWith('/add'));
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() => section === 'products' && location.pathname.endsWith('/add') ? emptySectionForm('products') : {});
  const toast = useToast();
  useEffect(() => {
    const wantsNew = section === 'products' && location.pathname.endsWith('/add');
    if (wantsNew) { setEditId(null); setFormData(emptySectionForm('products')); setFormOpen(true); }
    else if (section === 'products') { setEditId(null); setFormOpen(false); }
  }, [section, location.pathname]);
  const routes = { products: '/admin/products', categories: '/admin/categories', orders: '/admin/orders', inventory: '/admin/inventory', settings: '/admin/settings', reports: '/admin/reports', offers: '/admin/offers', banners: '/admin/banners', content: '/admin/content', faqs: '/admin/faqs', reviews: '/admin/reviews', enquiries: '/admin/enquiries', newsletter: '/admin/newsletter', chatbot: '/admin/chatbot/faqs', customers: '/admin/customers', users: '/admin/users' };
  const query = useQuery({ queryKey: ['admin-resource', section, page, search], queryFn: async () => (await api.get(routes[section] || routes.products, { params: { page, limit: 20, search } })).data.data, enabled: !!routes[section], placeholderData: (previousData) => previousData });
  const categoryOptions = useQuery({ queryKey: ['admin-category-options'], queryFn: async () => (await api.get('/admin/categories', { params: { limit: 100 } })).data.data.items || [], enabled: section === 'products' });
  const data = query.data;
  const records = section === 'content' && data && !Array.isArray(data) ? Object.values(data) : section === 'settings' && data ? Object.entries(data).map(([key, value]) => ({ id: key, key, value })) : (Array.isArray(data) ? data : data?.items || data?.products || data?.orders || []);
  const tableFieldsBySection = {
    orders: [['orderNumber','Reference'],['customerName','Customer'],['totalPaise','Total'],['orderStatus','Status'],['createdAt','Received']],
    categories: [['name','Name'],['slug','Slug'],['active','Status']],
    inventory: [['name','Product'],['sku','SKU'],['stockQuantity','On hand'],['lowStockThreshold','Low-stock at'],['active','Status']],
    settings: [['key','Setting'],['value','Current value']], reports: [['metric','Metric'],['value','Actual records']],
    offers: [['name','Offer'],['discountType','Type'],['promoText','Promotion'],['active','Status']],
    banners: [['title','Banner'],['placement','Placement'],['active','Status']],
    content: [['key','Page'],['title','Title'],['updatedAt','Updated']],
    faqs: [['question','Question'],['category','Category'],['active','Status']],
    reviews: [['name','Customer'],['rating','Rating'],['product.name','Product'],['approved','Approved'],['createdAt','Received']],
    enquiries: [['name','Name'],['email','Email'],['subject','Subject'],['status','Status'],['createdAt','Received']],
    newsletter: [['email','Email'],['consent','Consent'],['unsubscribedAt','Unsubscribed']],
    chatbot: [['question','Suggested answer'],['active','Status']],
    customers: [['fullName','Customer'],['phone','Phone'],['email','Email'],['_count.orders','Orders'],['createdAt','Joined']],
    users: [['name','Administrator'],['email','Email'],['role.name','Role'],['active','Status'],['lastLoginAt','Last sign-in']],
  };
  const tableFields = tableFieldsBySection[section] || [['name','Name'],['sku','SKU'],['sellingPricePaise','Selling price'],['stockQuantity','Stock'],['active','Status']];
  const columns = ({ products: 'Product catalogue', categories: 'Store categories', orders: 'Order enquiries', inventory: 'Stock overview', settings: 'Business settings', reports: 'Store reports', offers:'Offers & promotions', banners:'Homepage banners', content:'Site pages and policies', faqs:'Frequently asked questions', reviews:'Customer reviews', enquiries:'Customer support enquiries', newsletter:'Email subscribers', chatbot:'Assistant answers', customers:'Customer records', users:'Administrator access' })[section] || 'Workspace';
  const fieldDefinitions = {
    products: [['name','Product name'],['slug','Slug'],['sku','SKU'],['categoryId','Category ID'],['shortDescription','Short description'],['description','Description'],['imageUrl','Primary image URL'],['mrpPaise','MRP (paise)'],['sellingPricePaise','Selling price (paise)'],['minimumOrderQuantity','Minimum quantity'],['stockQuantity','Stock quantity'],['lowStockThreshold','Low-stock threshold'],['fragrance','Fragrance'],['ingredients','Ingredients'],['usageInstructions','Usage instructions'],['active','Active'],['featured','Featured'],['seasonal','Seasonal'],['shippingEligible','Shipping eligible']],
    categories: [['name','Category name'],['slug','Slug'],['description','Description'],['imageUrl','Image URL'],['active','Active'],['sortOrder','Sort order']],
    faqs: [['question','Question'],['answer','Answer'],['category','Category'],['active','Visible'],['sortOrder','Sort order']],
    chatbot: [['question','Question'],['answer','Answer'],['active','Visible'],['sortOrder','Sort order']],
    offers: [['name','Offer name'],['description','Description'],['promoText','Promotion text'],['discountType','Discount type'],['discountValue','Discount value (paise or percent)'],['minimumOrderPaise','Minimum order (paise)'],['freeShippingThreshold','Free-shipping pieces'],['active','Active']],
    banners: [['title','Title'],['subtitle','Subtitle'],['imageUrl','Image URL'],['linkUrl','Link URL'],['placement','Placement'],['sortOrder','Sort order'],['active','Active']],
    content: [['key','Page key'],['title','Page title'],['content','Page content']],
    users: [['name','Name'],['email','Email'],['password','Temporary password (12+ characters)'],['role','Role'],['active','Active']],
    inventory: [['change','Stock change (+/- pieces)'],['reason','Reason']],
  };
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const route = routes[section];
    setSaving(true);
    try {
      const payload = { ...formData };
      for (const key of ['mrpPaise','sellingPricePaise','minimumOrderQuantity','minimumQuantity','stockQuantity','lowStockThreshold','sortOrder','freeShippingThreshold','discountValue','minimumOrderPaise']) if (payload[key] !== undefined && payload[key] !== '' && payload[key] !== null) payload[key] = Number(payload[key]);
      for (const key of ['mrpPaise','sellingPricePaise','minimumQuantity','minimumOrderPaise']) if (payload[key] === '') payload[key] = null;
      if (payload.categoryId === '') payload.categoryId = null;
      if (payload.slug === '') delete payload.slug;
      if (payload.imageUrl === '') delete payload.imageUrl;
      if (Array.isArray(payload.images)) { const images = payload.images.filter((image) => image?.url); const chosenPrimary = images.findIndex((image) => image?.isPrimary); payload.images = images.map((image, index) => ({ url: image.url, ...(image.publicId ? { publicId: image.publicId } : {}), ...(image.altText ? { altText: image.altText } : {}), sortOrder: index, isPrimary: index === (chosenPrimary >= 0 ? chosenPrimary : 0) })); }
      if (payload.shippingChargePaise !== undefined && payload.shippingChargePaise !== '' && payload.shippingChargePaise !== null) payload.shippingChargePaise = Number(payload.shippingChargePaise);
      if (payload.shippingChargePaise === '') payload.shippingChargePaise = null;
      if (payload.socialLinks && typeof payload.socialLinks === 'string') { try { payload.socialLinks = JSON.parse(payload.socialLinks); } catch { throw new Error('Social links must be valid JSON.'); } }
      if (section === 'products' || section === 'categories') {
        if (editId) await api.patch(`${route}/${editId}`, payload); else await api.post(route, payload);
        toast(section === 'products' ? (editId ? 'Product updated.' : 'Product added to the catalogue.') : (editId ? 'Category updated.' : 'Category added.'));
      } else if (section === 'settings') { await api.patch(route, payload); toast('Settings saved.'); }
      else if (section === 'content') { const { key, title, content } = payload; await api.patch(route, { [key]: { title, content } }); toast('Page content saved.'); }
      else if (section === 'inventory') { await api.post(`${route}/adjust`, { productId: editId, change: Number(payload.change), reason: payload.reason }); toast('Stock adjusted.'); }
      else if (section === 'users') { const userPayload = { ...payload }; if (!userPayload.password) delete userPayload.password; if (editId) await api.patch(`${route}/${editId}`, userPayload); else await api.post(route, userPayload); toast(editId ? 'Administrator updated.' : 'Administrator created.'); }
      else if (['offers','banners','faqs','chatbot'].includes(section)) { const endpoint = section === 'chatbot' ? `${route}` : route; if (editId) await api.patch(`${endpoint}/${editId}`, payload); else await api.post(endpoint, payload); toast(editId ? 'Changes saved.' : 'Added successfully.'); }
      else { toast('This record can’t be edited from this screen.', 'error'); }
      closeEditor(); query.refetch();
    } catch (error) { toast(error.response?.data?.message || 'Could not save these changes.', 'error'); }
    finally { setSaving(false); }
  }
  async function deleteRecord(id) { if (!window.confirm('Archive this record?')) return; try { if (section === 'users') await api.delete(`${routes[section]}/${id}`); else await api.delete(`${routes[section]}/${id}`); toast(section === 'users' ? 'Administrator disabled.' : 'Record archived.'); query.refetch(); } catch { toast('Could not archive this record.', 'error'); } }
  async function setStatus(orderId, status) { try { await api.patch(`/admin/orders/${orderId}/status`, { status }); toast('Order status updated.'); query.refetch(); } catch { toast('Could not update order status.', 'error'); } }
  const closeEditor = () => { setFormOpen(false); setEditId(null); setFormData({}); };
  const openEditor = (record = {}) => {
    setEditId(record.id || null);
    setFormData(section === 'products' ? productForm(record) : { ...emptySectionForm(section), ...record });
    setFormOpen(true);
  };
  const beginStockAdjustment = (record) => { setEditId(record.id); setFormData({ change: 0, reason: '' }); setFormOpen(true); };
  const openNew = () => { setEditId(null); setFormData(emptySectionForm(section)); setFormOpen(true); };
  const addable = ['products','categories','offers','banners','faqs','chatbot','users'].includes(section);
  const editorFields = fieldDefinitions[section] || (section === 'settings' ? Object.keys(data || {}).map((key) => [key, key.replace(/([A-Z])/g,' $1')]) : Object.keys(formData).filter((key) => !['id','createdAt','updatedAt','lastLoginAt'].includes(key)).slice(0, 12).map((key) => [key,key.replace(/([A-Z])/g,' $1')]));
  const isOrderDetail = section === 'orders' && location.pathname.split('/').filter(Boolean).length > 2;
  if (isOrderDetail) return <AdminOrderDetail id={location.pathname.split('/').filter(Boolean).at(-1)} />;
  async function moderateReview(id, approved) { try { await api.patch(`/admin/reviews/${id}`, { approved, hidden: !approved }); toast(approved ? 'Review approved.' : 'Review hidden.'); query.refetch(); } catch { toast('Could not update the review.', 'error'); } }
  async function enquiryStatus(id, status) { try { await api.patch(`/admin/enquiries/${id}`, { status }); toast('Enquiry updated.'); query.refetch(); } catch { toast('Could not update enquiry.', 'error'); } }
  const downloadCsv = async (kind) => { try { const response = await api.get(`/admin/reports/${kind}?format=csv`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `mann-ki-mannat-${kind}.csv`; anchor.click(); URL.revokeObjectURL(url); } catch { toast('Report export is unavailable.', 'error'); } };
  return <div className="admin-content"><div className="admin-resource-toolbar"><div><div className="eyebrow"><span></span> Manage your store</div><h2>{columns}</h2><p>{section === 'orders' ? 'Enquiries remain separate from confirmed sales.' : section === 'reports' ? 'Reports count confirmed orders separately from enquiries.' : 'Keep the details accurate and ready for your customers.'}</p></div><div className="admin-resource-actions">{!['settings','content','reports'].includes(section) && <label className="admin-search"><Search size={15} /><input placeholder="Search records" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label>}{addable && <button className="button button--forest" onClick={openNew}><Plus size={15} /> Add {({products:'product',categories:'category',offers:'offer',banners:'banner',faqs:'FAQ',chatbot:'answer',users:'administrator'})[section]}</button>}{section === 'content' && <button className="button button--forest" onClick={() => openEditor({ key:'shipping', title:'Shipping', content:'' })}><Plus size={15} /> Add / edit a page</button>}{section === 'settings' && <button className="button button--forest" onClick={() => openEditor(Object.keys(data || {}).length ? data : { businessName:'', tagline:'', whatsappNumber:'', email:'', phone:'', address:'', announcementBar:'', shippingChargePaise:'', freeShippingThreshold:12, globalMinimumQuantity:3, mixedCartShippingPolicy:'eligible_items', promoText:'' })}>Edit settings <Settings size={15} /></button>}{section === 'reports' && <button className="button button--outline" onClick={() => downloadCsv('orders')}>Export orders CSV <ArrowUpRight size={14} /></button>}{section === 'newsletter' && <button className="button button--outline" onClick={() => downloadCsv('newsletter')}>Export subscribers <ArrowUpRight size={14} /></button>}</div></div>
    {formOpen && <form className="admin-edit-panel" onSubmit={save} autoComplete="off"><div className="admin-edit-heading"><div><span className="eyebrow"><span></span> {section === 'products' ? 'Catalogue editor' : 'Record editor'}</span><h3>{editId ? 'Edit' : 'Add'} {section === 'products' ? 'product' : section === 'categories' ? 'category' : section === 'inventory' ? 'stock adjustment' : section === 'settings' ? 'business settings' : section === 'content' ? 'page content' : section === 'users' ? 'administrator' : section === 'chatbot' ? 'assistant answer' : section.slice(0,-1)}</h3><p>{section === 'products' ? 'Fields marked * are required. Prices are entered in rupees and saved automatically.' : 'Empty fields are cleared each time you open a new record.'}</p></div><button type="button" onClick={closeEditor} aria-label="Close editor"><X size={18} /></button></div>
      {section === 'products' ? <ProductEditorFields formData={formData} setFormData={setFormData} categories={categoryOptions.data} /> : section === 'settings' ? <SettingsEditorFields formData={formData} setFormData={setFormData} /> : <div className="admin-form-grid admin-form-grid--full">
        {editorFields.map(([key,label]) => {
          const wide = ['content','answer','description','shortDescription','ingredients','usageInstructions','notes','value','subtitle','promoText','question'].includes(key);
          return <label className={`admin-form-field ${wide ? 'admin-form-field--wide' : ''} ${['active','featured','seasonal','shippingEligible','chatbotEnabled','consent'].includes(key) ? 'admin-form-field--check' : ''}`} key={key}><span>{label}</span>{key === 'categoryId' ? <select value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value || null })}><option value="">Choose category</option>{categoryOptions.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : key === 'discountType' || key === 'mixedCartShippingPolicy' || key === 'role' ? <select value={formData[key] || (key === 'role' ? 'ADMIN' : key === 'discountType' ? 'FIXED' : 'eligible_items')} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}>{(key === 'discountType' ? ['FIXED','PERCENT','FREE_SHIPPING'] : key === 'role' ? ['OWNER','ADMIN','EDITOR'] : ['eligible_items','all_items']).map((option) => <option key={option}>{option}</option>)}</select> : typeof formData[key] === 'boolean' || ['active','featured','seasonal','shippingEligible','chatbotEnabled'].includes(key) ? <input type="checkbox" checked={Boolean(formData[key])} onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })} /> : wide ? <textarea rows={key === 'content' ? 9 : 3} value={formData[key] ?? ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} placeholder={`Enter ${String(label).toLowerCase()}`} /> : <input type={key === 'password' ? 'password' : ['startsAt','endsAt'].includes(key) ? 'datetime-local' : ['discountValue','minimumOrderPaise','freeShippingThreshold','sortOrder','change'].includes(key) ? 'number' : 'text'} value={formData[key] == null ? '' : typeof formData[key] === 'object' ? JSON.stringify(formData[key]) : formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} placeholder={`Enter ${String(label).toLowerCase()}`} />}</label>;
        })}
      </div>}
      <div className="admin-edit-actions"><button type="button" className="button button--outline" onClick={closeEditor} disabled={saving}>Cancel</button><button className="button button--forest" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={15} /> Saving…</> : <>{section === 'products' ? 'Save product' : 'Save changes'} <Check size={15} /></>}</button></div></form>}
    {query.isLoading ? <div className="admin-table-loading"><LoaderCircle className="spin" /> Loading records…</div> : query.isError ? <ErrorNotice retry={() => query.refetch()} /> : records.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{tableFields.map(([, label]) => <th key={label}>{label}</th>)}<th>Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.id || record.key}>{tableFields.map(([field]) => { const value = field.split('.').reduce((current, part) => current?.[part], record); return <td key={field}>{section === 'products' && field === 'name' ? <span className="admin-product-cell"><img src={assetUrl(record.images?.[0]?.url || '/images/royal-sandal.png')} alt="" />{value}</span> : ['sellingPricePaise','mrpPaise','totalPaise','value'].includes(field) && section === 'products' ? money(value) : field === 'active' ? <span className={`status-pill status-pill--${value ? 'active' : 'inactive'}`}>{value ? 'Active' : 'Inactive'}</span> : field === 'approved' || field === 'consent' ? <span className={`status-pill status-pill--${value ? 'active' : 'inactive'}`}>{value ? 'Yes' : 'No'}</span> : ['createdAt','lastLoginAt','updatedAt','unsubscribedAt'].includes(field) ? value ? new Date(value).toLocaleDateString('en-IN') : '—' : ['orderStatus','status'].includes(field) ? section === 'orders' ? <select className="status-select" value={value} onChange={(e) => setStatus(record.id, e.target.value)}>{['ENQUIRY','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}</select> : section === 'enquiries' ? <select className="status-select" value={value} onChange={(e) => enquiryStatus(record.id, e.target.value)}>{['NEW','IN_PROGRESS','RESOLVED','SPAM'].map((s) => <option key={s}>{s}</option>)}</select> : value : field === 'rating' ? `${value}/5` : value && typeof value === 'object' ? value.name || JSON.stringify(value) : value ?? '—'}</td>; })}<td><div className="table-actions">{['products','categories','offers','banners','faqs','chatbot','users','content'].includes(section) && <button title="Edit" onClick={() => openEditor(record)}><Eye size={15} /></button>}{['products','categories','offers','banners','faqs','chatbot','users'].includes(section) && <button title={section === 'users' ? 'Disable' : 'Delete'} onClick={() => deleteRecord(record.id)}><Trash2 size={15} /></button>}{section === 'reviews' && <button title={record.approved ? 'Hide review' : 'Approve review'} onClick={() => moderateReview(record.id, !record.approved)}><Check size={15} /></button>}{section === 'inventory' && <button title="Adjust stock" onClick={() => beginStockAdjustment(record)}><Plus size={15} /></button>}{section === 'orders' && <Link to={`/admin/orders/${record.id}`} title="View order"><ArrowUpRight size={15} /></Link>}</div></td></tr>)}</tbody></table><div className="admin-pagination"><span>{data?.total ?? records.length} records</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={15} /></button><span>{page}</span><button disabled={data?.pageCount && page >= data.pageCount} onClick={() => setPage(page + 1)}><ChevronRight size={15} /></button></div></div></div> : <div className="admin-empty"><PackageCheck size={24} /><h3>No records yet</h3><p>When your store has {section === 'orders' ? 'customer enquiries' : section}, they will show up here.</p>{addable && <button className="button button--forest" onClick={openNew}><Plus size={15} /> Add the first record</button>}{section === 'settings' && <button className="button button--forest" onClick={() => openEditor({})}>Configure settings <Settings size={15} /></button>}</div>}
  </div>;
}

function AdminOrderDetail({ id }) {
  const toast = useToast();
  const query = useQuery({ queryKey: ['admin-order', id], queryFn: async () => (await api.get(`/admin/orders/${id}`)).data.data });
  const [notes, setNotes] = useState('');
  useEffect(() => { if (query.data) setNotes(query.data.internalNotes || ''); }, [query.data]);
  if (query.isLoading) return <div className="admin-content"><div className="admin-table-loading"><LoaderCircle className="spin" /> Loading order…</div></div>;
  if (query.isError || !query.data) return <div className="admin-content"><ErrorNotice retry={() => query.refetch()} /></div>;
  const order = query.data;
  async function updateStatus(status) { try { await api.patch(`/admin/orders/${id}/status`, { status }); toast('Order status updated.'); query.refetch(); } catch (error) { toast(error.response?.data?.message || 'Could not update order status.', 'error'); } }
  async function saveNotes() { try { await api.patch(`/admin/orders/${id}/notes`, { notes }); toast('Internal notes saved.'); } catch { toast('Could not save notes.', 'error'); } }
  async function updatePayment(status) { try { await api.patch(`/admin/orders/${id}/payment`, { status }); toast('Payment status updated.'); query.refetch(); } catch { toast('Could not update payment status.', 'error'); } }
  return <div className="admin-content"><div className="admin-detail-back"><Link to="/admin/orders"><ArrowLeft size={14} /> All enquiries</Link><span>{order.orderNumber}</span></div><div className="admin-order-detail-grid"><div className="admin-panel"><div className="admin-panel-heading"><div><span>Customer order enquiry</span><small>Received {new Date(order.createdAt).toLocaleString('en-IN')}</small></div><span className={`status-pill status-pill--${order.orderStatus.toLowerCase()}`}>{order.orderStatus}</span></div><div className="admin-detail-customer"><h2>{order.customerName}</h2><p>{order.customerPhone}{order.customerEmail ? ` · ${order.customerEmail}` : ''}</p><p>{order.addressSnapshot}, {order.city}, {order.state} {order.pinCode}</p>{order.deliveryInstructions && <p>Delivery note: {order.deliveryInstructions}</p>}</div><div className="admin-order-items">{order.items.map((item) => <div key={item.id}><span>{item.productName}<small>{item.sku} · {item.quantity} pieces × {money(item.sellingPricePaise)}</small></span><b>{money(item.lineTotalPaise)}</b></div>)}</div><div className="summary-line"><span>Subtotal</span><span>{money(order.subtotalPaise)}</span></div><div className="summary-line"><span>Shipping</span><span>{order.shippingPaise === 0 ? 'Free' : money(order.shippingPaise)}</span></div>{order.discountPaise > 0 && <div className="summary-line"><span>Discount</span><span>−{money(order.discountPaise)}</span></div>}<div className="summary-line summary-line--total"><span>Order total</span><strong>{money(order.totalPaise)}</strong></div></div><aside className="admin-panel admin-detail-actions"><h3>Update enquiry</h3><label>Order status<select value={order.orderStatus} onChange={(e) => updateStatus(e.target.value)}>{['ENQUIRY','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}</select></label><label>Payment status<select value={order.paymentStatus} onChange={(e) => updatePayment(e.target.value)}>{['UNPAID','PENDING','PAID','REFUNDED'].map((s) => <option key={s}>{s}</option>)}</select></label><label>Internal notes<textarea rows="5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible to your team only" /></label><button className="button button--forest button--wide" onClick={saveNotes}>Save notes <Check size={14} /></button></aside></div><section className="admin-panel admin-history"><h3>Status history</h3>{order.statusHistory.map((row) => <div key={row.id}><span>{row.toStatus}</span><small>{new Date(row.createdAt).toLocaleString('en-IN')}</small><em>{row.note || row.changedBy || 'Status updated'}</em></div>)}</section></div>;
}

function ErrorNotice({ retry }) { return <div className="error-notice"><AlertCircle size={22} /><h3>We couldn’t load this right now.</h3><p>Please check the connection and try again.</p><button onClick={retry}>Try again <ArrowRight size={14} /></button></div>; }

export default App;
