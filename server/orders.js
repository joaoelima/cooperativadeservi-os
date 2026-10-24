import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { catalog } from '../shared/catalog.js';

export const statusLabels = { received: 'Solicitação recebida', in_review: 'Em análise pela central' };
export function validateOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { category, service, description, address, preferredDate = '' } = body;
  if (typeof category !== 'string' || !Object.hasOwn(catalog, category) || typeof service !== 'string' || !catalog[category].some(item => item[0] === service)) return null;
  if (typeof description !== 'string' || description.trim().length < 10 || description.length > 3000) return null;
  if (typeof address !== 'string' || address.trim().length < 10 || address.length > 500) return null;
  if (typeof preferredDate !== 'string' || (preferredDate && (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || Number.isNaN(Date.parse(preferredDate)) || new Date(preferredDate).toISOString().slice(0, 10) !== preferredDate))) return null;
  return { category, service, description: description.trim(), address: address.trim(), preferredDate };
}
export function presentOrder(order) {
  return { id: String(order._id), reference: order.reference, category: order.category, service: order.service,
    description: order.description, address: order.address, preferredDate: order.preferredDate,
    status: order.status, createdAt: order.createdAt, updatedAt: order.updatedAt,
    history: (order.history || []).map(({ status, at }) => ({ status, at })),
    customer: { name: order.customer.name, email: order.customer.email } };
}
export function installOrders(app, { store, requireUser, requireAdmin }) {
  const createLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10,
    keyGenerator: req => String(req.user._id), standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Limite de solicitações atingido. Tente novamente mais tarde.' } });
  app.post('/api/orders', requireUser, createLimit, async (req, res) => {
    const data = validateOrder(req.body);
    if (!data) return res.status(400).json({ error: 'Escolha um serviço válido e preencha descrição e endereço com pelo menos 10 caracteres. Confira a data.' });
    const now = new Date();
    const order = await store.createOrder({ ...data, reference: 'CS-' + randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase(),
      customerId: String(req.user._id), customer: { name: req.user.name, email: req.user.email },
      status: 'received', createdAt: now, updatedAt: now,
      history: [{ status: 'received', at: now, actorId: String(req.user._id) }] });
    res.status(201).json({ order: presentOrder(order) });
  });
  app.get('/api/orders', requireUser, async (req, res) => res.json({ orders: (await store.listOrders({ customerId: String(req.user._id) })).map(presentOrder) }));
  app.get('/api/orders/:id', requireUser, async (req, res) => {
    const order = await store.findOrder(req.params.id, String(req.user._id));
    if (!order) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    res.json({ order: presentOrder(order) });
  });
  app.get('/api/admin/orders', requireUser, requireAdmin, async (req, res) => {
    const status = req.query.status;
    const rawPage = req.query.page || '1';
    if ((status !== undefined && !Object.hasOwn(statusLabels, status)) || typeof rawPage !== 'string' || !/^[1-9]\d{0,4}$/.test(rawPage)) return res.status(400).json({ error: 'Filtro inválido.' });
    const page = Number(rawPage), limit = 25;
    const [orders, total] = await Promise.all([store.listOrders({ status, page, limit }), store.countOrders({ status })]);
    res.json({ orders: orders.map(presentOrder), page, total, limit });
  });
  app.post('/api/admin/orders/:id/review', requireUser, requireAdmin, async (req, res) => {
    const order = await store.beginReview(req.params.id, String(req.user._id));
    if (!order) return res.status(409).json({ error: 'O pedido não está disponível para iniciar análise. Atualize a lista.' });
    res.json({ order: presentOrder(order) });
  });
}
