import { randomUUID } from 'node:crypto';
import { statusLabels, eventLabels } from '../shared/order-status.js';

const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.length <= max;
export function validQuote(body) {
  if (!body || !Number.isSafeInteger(body.amountCents) || body.amountCents < 1 || body.amountCents > 100000000
    || !text(body.description, 10, 3000) || !text(body.estimatedDuration, 2, 120)
    || (body.conditions !== undefined && !text(body.conditions, 0, 2000))) return null;
  return { id: randomUUID(), amountCents: body.amountCents, description: body.description.trim(),
    estimatedDuration: body.estimatedDuration.trim(), conditions: (body.conditions || '').trim(), sentAt: new Date() };
}
export function installLifecycle(app, { store, requireUser, requireAdmin, presentOrder }) {
  async function change(req, res, guards, fields, status, kind) {
    const order = await store.transitionOrder(req.params.id, guards, fields,
      { status, kind: kind || status, at: new Date(), actorId: String(req.user._id), ...(fields.quote ? { quoteSnapshot: fields.quote } : {}), ...(guards.quoteId ? { quoteId: guards.quoteId } : {}) });
    if (!order) return res.status(409).json({ error: 'O pedido mudou ou esta ação não é permitida. Atualize os dados antes de continuar.' });
    res.json({ order: presentOrder(order) });
  }
  app.post('/api/admin/orders/:id/quote', requireUser, requireAdmin, async (req, res) => {
    const quote = validQuote(req.body);
    if (!quote) return res.status(400).json({ error: 'Informe valor positivo, descrição, prazo e condições válidos.' });
    return change(req, res, { statuses: ['in_review', 'rejected'] }, { quote, status: 'awaiting_approval' }, 'awaiting_approval', 'quote_sent');
  });
  app.post('/api/orders/:id/decision', requireUser, async (req, res) => {
    const { decision, quoteId } = req.body || {};
    if (!['approve', 'reject'].includes(decision) || !text(quoteId, 1, 64)) return res.status(400).json({ error: 'Decisão ou orçamento inválido.' });
    const own = await store.findOrder(req.params.id, String(req.user._id));
    if (!own) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    const status = decision === 'approve' ? 'approved' : 'rejected';
    return change(req, res, { customerId: String(req.user._id), statuses: ['awaiting_approval'], quoteId },
      { status, decision: { value: decision, quoteId, at: new Date() } }, status);
  });
  app.post('/api/admin/orders/:id/schedule', requireUser, requireAdmin, async (req, res) => {
    const { at, professional, notes = '' } = req.body || {};
    if (!text(at, 20, 40) || !/(Z|[+-]\d{2}:\d{2})$/.test(at) || !Number.isFinite(Date.parse(at))
      || Date.parse(at) <= Date.now() || !text(professional, 2, 100) || !text(notes, 0, 1000)) {
      return res.status(400).json({ error: 'Informe uma data futura com horário e o profissional responsável.' });
    }
    return change(req, res, { statuses: ['approved'] }, {
      status: 'scheduled', schedule: { at: new Date(at), professional: professional.trim(), notes: notes.trim() }
    }, 'scheduled');
  });
  for (const [action, from, status] of [['start', 'scheduled', 'in_progress'], ['complete', 'in_progress', 'completed']]) {
    app.post('/api/admin/orders/:id/' + action, requireUser, requireAdmin,
      (req, res) => change(req, res, { statuses: [from] }, { status }, status));
  }
  app.post('/api/orders/:id/review', requireUser, async (req, res) => {
    const { rating, comment = '' } = req.body || {};
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !text(comment, 0, 2000)) return res.status(400).json({ error: 'Escolha uma nota de 1 a 5. O comentário pode ter até 2000 caracteres.' });
    const own = await store.findOrder(req.params.id, String(req.user._id));
    if (!own) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    return change(req, res, { statuses: ['completed'], customerId: String(req.user._id), noReview: true },
      { review: { rating, comment: comment.trim(), at: new Date() } }, 'completed', 'review_submitted');
  });
  app.post('/api/admin/orders/:id/reply', requireUser, requireAdmin, async (req, res) => {
    const { reply } = req.body || {};
    if (!text(reply, 2, 1000)) return res.status(400).json({ error: 'Escreva uma resposta de 2 a 1000 caracteres.' });
    return change(req, res, { statuses: ['completed'], hasReview: true, noReply: true },
      { 'review.reply': { text: reply.trim(), at: new Date() } }, 'completed', 'review_reply');
  });
  app.post('/api/orders/:id/cancel', requireUser, async (req, res) => {
    const own = await store.findOrder(req.params.id, String(req.user._id));
    if (!own) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    return change(req, res, { customerId: String(req.user._id), statuses: ['received', 'in_review', 'awaiting_approval'] },
      { status: 'cancelled' }, 'cancelled');
  });
  app.get('/api/notifications', requireUser, async (req, res) => {
    const generatedAt = new Date().toISOString();
    const orders = await store.listOrders({ customerId: String(req.user._id) });
    const notifications = orders.flatMap(order => (order.history || []).map((event, index) => ({
      id: String(order._id) + '-' + index, orderId: String(order._id), reference: order.reference, at: event.at,
      message: eventLabels[event.kind] || statusLabels[event.status], unread: new Date(event.at) > new Date(req.user.notificationsReadAt || 0),
    }))).sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0, 100);
    res.json({ notifications, generatedAt });
  });
  app.post('/api/notifications/read', requireUser, async (req, res) => {
    const through = req.body?.through;
    if (typeof through !== 'string' || !Number.isFinite(Date.parse(through)) || Date.parse(through) > Date.now()) return res.status(400).json({ error: 'Data inválida.' });
    await store.markNotificationsRead(String(req.user._id), new Date(through));
    res.json({ marked: true });
  });
}
