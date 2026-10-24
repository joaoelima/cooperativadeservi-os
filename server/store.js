import { ObjectId } from 'mongodb';

export async function createStore(db) {
  const users = db.collection('users');
  const sessions = db.collection('sessions');
  const orders = db.collection('orders');
  await users.createIndex({ email: 1 }, { unique: true });
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await orders.createIndex({ reference: 1 }, { unique: true });
  await orders.createIndex({ customerId: 1, createdAt: -1 });
  await orders.createIndex({ status: 1, createdAt: -1 });
  return {
    findUserByEmail: email => users.findOne({ email }),
    findUserById: id => ObjectId.isValid(id) ? users.findOne({ _id: new ObjectId(id) }) : null,
    async createUser(user) {
      try {
        const result = await users.insertOne(user);
        return { ...user, _id: result.insertedId };
      } catch (error) {
        if (error.code === 11000) return null;
        throw error;
      }
    },
    createSession: session => sessions.insertOne(session),
    findSession: tokenHash => sessions.findOne({ tokenHash, expiresAt: { $gt: new Date() } }),

    deleteSession: tokenHash => sessions.deleteOne({ tokenHash }),
    deleteUserSessions: userId => sessions.deleteMany({ userId }),
    async changePassword(userId, previousHash, passwordHash) {
      const result = await users.updateOne({ _id: new ObjectId(userId), passwordHash: previousHash },
        { $set: { passwordHash, passwordChangedAt: new Date() }, $inc: { passwordVersion: 1 } });
      return result.modifiedCount === 1;
    },
    async createOrder(order) {
      const result = await orders.insertOne(order);
      return { ...order, _id: result.insertedId };
    },
    listOrders: ({ customerId, status, page = 1, limit = 100 }) => orders.find({
      ...(customerId ? { customerId } : {}), ...(status ? { status } : {})
    }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    countOrders: ({ status }) => orders.countDocuments(status ? { status } : {}),
    findOrder: (id, customerId) => ObjectId.isValid(id) ? orders.findOne({ _id: new ObjectId(id), customerId }) : null,
    beginReview: (id, actorId) => ObjectId.isValid(id) ? orders.findOneAndUpdate(
      { _id: new ObjectId(id), status: 'received' },
      { $set: { status: 'in_review', updatedAt: new Date() }, $push: { history: { status: 'in_review', at: new Date(), actorId } } },
      { returnDocument: 'after' }) : null,

  };
}
