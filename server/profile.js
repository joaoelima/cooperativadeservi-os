export function installProfile(app, { store, requireUser, publicUser }) {
  app.post('/api/profile', requireUser, async (req, res) => {
    const { name, phone = '', address = '' } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100
      || typeof phone !== 'string' || phone.length > 30 || (phone && !/^[+()\d\s.-]{8,30}$/.test(phone))
      || typeof address !== 'string' || address.length > 500) {
      return res.status(400).json({ error: 'Confira nome, telefone e endereço.' });
    }
    const user = await store.updateProfile(String(req.user._id), { name: name.trim(), phone: phone.trim(), address: address.trim() });
    res.json({ user: publicUser(user) });
  });
}
