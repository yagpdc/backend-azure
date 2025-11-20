import mongoose, { Schema, Document } from "mongoose";

export interface WordsInfiniteRoomPlayer {
  userId: string;
  username: string;
  joinedAt: Date;
}

export interface WordsInfiniteRoom extends Document {
  roomId: string;
  mode: "coop" | "versus"; // Para futuro modo versus
  players: WordsInfiniteRoomPlayer[];
  maxPlayers: number;
  status: "waiting" | "playing" | "finished";
  createdBy: string; // userId do criador (player 1)
  currentRunId?: string; // ID do run atual em andamento
  gamesPlayed: number; // Quantas palavras já foram jogadas
  createdAt: Date;
  updatedAt: Date;
}

const WordsInfiniteRoomSchema = new Schema<WordsInfiniteRoom>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["coop", "versus"],
      required: true,
      default: "coop",
    },
    players: [
      {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    maxPlayers: {
      type: Number,
      required: true,
      default: 2,
    },
    status: {
      type: String,
      enum: ["waiting", "playing", "finished"],
      required: true,
      default: "waiting",
    },
    createdBy: {
      type: String,
      required: true,
    },
    currentRunId: {
      type: String,
      required: false,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para buscar salas ativas
WordsInfiniteRoomSchema.index({ status: 1, createdAt: -1 });
WordsInfiniteRoomSchema.index({ "players.userId": 1 });

export const WordsInfiniteRoomModel = mongoose.model<WordsInfiniteRoom>(
  "WordsInfiniteRoom",
  WordsInfiniteRoomSchema
);
