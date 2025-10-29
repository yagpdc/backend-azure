import mongoose from "mongoose";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "backend-azure-dev";

let isConnected = false;

export async function connectDb(): Promise<typeof mongoose> {
  if (isConnected) return mongoose;
  await mongoose.connect(uri, { dbName });
  console.log("DB:", mongoose.connection.name);
  console.log("URI Host:", mongoose.connection.host);

  isConnected = true;
  console.log("✅ MongoDB conectado via Mongoose");
  console.log("DB:", mongoose.connection.name);
  return mongoose;
}

export async function closeDb() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log("🔌 MongoDB desconectado");
}
