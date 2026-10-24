import { MongoClient } from 'mongodb';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !process.env.MONGODB_URI) {
  throw new Error('Uso: MONGODB_URI no ambiente; node scripts/promote-admin.js EMAIL_EXATO');
}
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'coopserve');
  const users = db.collection('users');
  const user = await users.findOne({ email });
  if (!user) throw new Error('Conta não encontrada. Cadastre a conta antes de promover.');
  if (user.role === 'admin') { console.log('Conta já possui acesso administrativo.'); }
  else {
    const result = await users.updateOne({ _id: user._id, email, role: 'client' },
      { $set: { role: 'admin', adminGrantedAt: new Date() }, $inc: { passwordVersion: 1 } });
    if (result.modifiedCount !== 1) throw new Error('Conta mudou. Revise antes de tentar novamente.');
    await db.collection('sessions').deleteMany({ userId: String(user._id) });
    console.log('Conta promovida a administradora. É necessário entrar novamente.');
  }
} finally { await client.close(); }
