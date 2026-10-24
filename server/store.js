import { ObjectId } from 'mongodb';

export async function createStore(db) {
  const users = db.collection('users');
  const sessions = db.collection('sessions');
  await users.createIndex({ email: 1 }, { unique: true });
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
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
  };
}
