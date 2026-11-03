import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const apiOrigin = apiBaseUrl.replace(/\/api\/v1\/?$/, '');

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  // Do not set Content-Type here: axios picks JSON for objects and lets the
  // browser set the multipart boundary for FormData uploads.
  headers: { 'X-CSRF-Protection': '1' },
});

// Images uploaded to the media library are stored as API-relative paths so the
// backend host can change without rewriting the database.
export function assetUrl(url) {
  if (typeof url !== 'string' || !url) return '';
  if (url.startsWith('/api/v1/')) return `${apiOrigin}${url}`;
  return url;
}

export async function getProducts(params = {}) {
  const { data } = await api.get('/products', { params });
  return data.data;
}
export async function getProduct(slug) {
  const { data } = await api.get(`/products/${encodeURIComponent(slug)}`);
  return data.data;
}
export async function getCategories() {
  const { data } = await api.get('/categories');
  return data.data;
}
export async function getPublicSettings() {
  const { data } = await api.get('/settings/public');
  return data.data;
}
export async function getFaqs() {
  const { data } = await api.get('/faqs');
  return data.data;
}
export default api;
