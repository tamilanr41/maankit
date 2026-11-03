import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
});

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
