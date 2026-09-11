import mongoose from "mongoose";

mongoose.set("strictQuery", true);

// Serverless functions can reuse a warm instance across invocations, so the
// connection (and its promise, while pending) is cached on the global object
// to avoid reconnecting to MongoDB on every request.
const globalCache = globalThis;
if (!globalCache._mongooseCache) {
  globalCache._mongooseCache = { conn: null, promise: null };
}
const cache = globalCache._mongooseCache;

export async function connectDB() {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/progress_tracker";
    cache.promise = mongoose.connect(uri).then((mongooseInstance) => {
      console.log(`MongoDB connected: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
      return mongooseInstance;
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}
