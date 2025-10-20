import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

let isConnected = false;

export async function connectDb(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  try {
    await mongoose.connect(uri!);
    isConnected = true;
    console.log("✅ MongoDB conectado via Mongoose");
    return mongoose;
  } catch (error) {
    console.error("❌ Erro ao conectar MongoDB:", error);
    throw error;
  }
}

export async function closeDb() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("🔌 MongoDB desconectado");
  }
}
