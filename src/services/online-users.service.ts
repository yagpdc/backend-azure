import type { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { roomSocketService } from "./room-socket.service";
import { WordsUsersService } from "./words-users.service";

export class OnlineUsersService {
  private static instance: OnlineUsersService;
  private onlineUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId
  private lastActivity: Map<string, number> = new Map(); // userId -> timestamp
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Limpar usuários inativos a cada 30 segundos
    this.startCleanupInterval();
  }

  static getInstance(): OnlineUsersService {
    if (!OnlineUsersService.instance) {
      OnlineUsersService.instance = new OnlineUsersService();
    }
    return OnlineUsersService.instance;
  }

  private startCleanupInterval() {
    // Limpar usuários que não têm conexões ativas há mais de 2 minutos
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 120000; // 2 minutos

      for (const [userId, lastActive] of this.lastActivity.entries()) {
        if (now - lastActive > timeout && !this.onlineUsers.has(userId)) {
          this.lastActivity.delete(userId);
        }
      }
    }, 30000); // Rodar a cada 30 segundos
  }

  addUser(userId: string, socketId: string): void {
    // Adicionar socket ao conjunto de conexões do usuário
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(socketId);

    // Mapear socketId -> userId
    this.socketToUser.set(socketId, userId);

    // Atualizar timestamp de última atividade
    this.lastActivity.set(userId, Date.now());
  }

  removeUser(socketId: string): string | null {
    const userId = this.socketToUser.get(socketId);
    if (!userId) {
      return null;
    }

    // Remover socket do conjunto do usuário
    const userSockets = this.onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);

      // Se não há mais sockets, remover usuário completamente
      if (userSockets.size === 0) {
        this.onlineUsers.delete(userId);
        // Não remover lastActivity imediatamente - pode reconectar
      }
    }

    // Remover mapeamento
    this.socketToUser.delete(socketId);

    return userId;
  }

  // Força remoção completa de um usuário (útil para logout)
  forceRemoveUser(userId: string): void {
    // Remover todos os sockets do usuário
    const userSockets = this.onlineUsers.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        this.socketToUser.delete(socketId);
      }
      this.onlineUsers.delete(userId);
    }
    this.lastActivity.delete(userId);
  }

  // Atualizar atividade do usuário (heartbeat)
  updateActivity(userId: string): void {
    if (this.onlineUsers.has(userId)) {
      this.lastActivity.set(userId, Date.now());
    }
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  getOnlineCount(): number {
    return this.onlineUsers.size;
  }

  getConnectionCount(userId: string): number {
    return this.onlineUsers.get(userId)?.size ?? 0;
  }
}

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io: SocketIOServer = require("socket.io")(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://projeto-front-rho.vercel.app",
        "https://words-game-five.vercel.app",
      ],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
    connectTimeout: 10000,
    allowEIO3: true,
  });

  const onlineService = OnlineUsersService.getInstance();
  const usersService = new WordsUsersService();

  // Helper to emit users:online including both ids and names for compatibility
  async function emitUsersOnline() {
    try {
      const ids = onlineService.getOnlineUserIds();
      const total = onlineService.getOnlineCount();

      // Resolve names in parallel (fall back to id if not found)
      const lookups = await Promise.all(
        ids.map(async (id) => {
          try {
            const user = await usersService.findById(id);
            const name = user && (user as any).name ? (user as any).name : id;
            return { id, name };
          } catch (err) {
            return { id, name: id };
          }
        }),
      );

      io.emit("users:online", {
        onlineUsers: lookups,
        onlineUserIds: ids,
        totalOnline: total,
      });
    } catch (err) {
      console.error("Erro ao emitir users:online com nomes", err);
      // Fallback: emit ids only
      io.emit("users:online", {
        onlineUserIds: onlineService.getOnlineUserIds(),
        totalOnline: onlineService.getOnlineCount(),
      });
    }
  }

  // Inicializar serviço de salas com Socket.IO
  roomSocketService.setIO(io);

  io.on("connection", (socket) => {
    console.log(`🔌 Socket conectado: ${socket.id}`);

    // Tentar obter userId do handshake query
    const userIdFromQuery = socket.handshake.query.userId as string | undefined;
    let currentUserId: string | null = userIdFromQuery || null;

    // Se userId veio na query, registrar automaticamente
    if (currentUserId) {
      onlineService.addUser(currentUserId, socket.id);
      console.log(
        `✅ Usuário ${currentUserId} conectado automaticamente (${onlineService.getConnectionCount(currentUserId)} conexão(ões))`
      );

      // Notificar todos sobre a mudança de status (com nomes)
      void emitUsersOnline();
    }

    // Usuário se identifica ao conectar
    socket.on("user:online", (data: { userId: string }) => {
      const { userId } = data;

      if (!userId) {
        console.warn("⚠️  userId não fornecido");
        return;
      }

      currentUserId = userId;
      onlineService.addUser(userId, socket.id);
      console.log(
        `✅ Usuário ${userId} online (${onlineService.getConnectionCount(userId)} conexão(ões))`
      );

      // Notificar todos sobre a mudança de status (com nomes)
      void emitUsersOnline();
    });

    // Heartbeat para manter atividade
    socket.on("user:heartbeat", () => {
      if (currentUserId) {
        onlineService.updateActivity(currentUserId);
      }
    });

    // Usuário explicitamente se desconectando (antes de fechar aba)
    socket.on("user:offline", () => {
      if (currentUserId) {
        console.log(`👋 Usuário ${currentUserId} se desconectando explicitamente`);
        onlineService.forceRemoveUser(currentUserId);

        // Emitir atualização (com nomes)
        void emitUsersOnline();
      }
    });

    // Usuário se desconectou (aba fechada, refresh, etc)
    socket.on("disconnect", () => {
      const userId = onlineService.removeUser(socket.id);

      if (userId) {
        console.log(
          `👋 Usuário ${userId} desconectado (${onlineService.getConnectionCount(userId)} conexão(ões) restantes)`
        );

        // Se o usuário não tem mais conexões ativas, notificar todos
        if (!onlineService.isUserOnline(userId)) {
          // Emitir atualização (com nomes)
          void emitUsersOnline();
        }
      }

      console.log(`🔌 Socket desconectado: ${socket.id}`);
    });

    // Permitir que cliente solicite lista de usuários online
    socket.on("users:request", async () => {
      // Cliente pediu a lista; responder com nomes quando possível
      const ids = onlineService.getOnlineUserIds();
      const total = onlineService.getOnlineCount();
      try {
        const lookups = await Promise.all(
          ids.map(async (id) => {
            const user = await usersService.findById(id);
            const name = user && (user as any).name ? (user as any).name : id;
            return { id, name };
          }),
        );
        socket.emit("users:online", { onlineUsers: lookups, onlineUserIds: ids, totalOnline: total });
      } catch (err) {
        socket.emit("users:online", { onlineUserIds: ids, totalOnline: total });
      }
    });

    // ===== EVENTOS DE SALA =====

    // Cliente entra em uma sala específica
    socket.on("room:join", (data: { roomId: string }) => {
      const { roomId } = data;
      console.log(`📥 Socket ${socket.id} solicitou join na sala:`, roomId);
      if (roomId) {
        roomSocketService.joinRoom(socket, roomId);
        // Confirmar que entrou na sala
        socket.emit("room:joined", { roomId, socketId: socket.id });
        console.log(`✅ Socket ${socket.id} confirmado na sala ${roomId}`);
      } else {
        console.warn(`⚠️ Socket ${socket.id} tentou join sem roomId`);
      }
    });

    // Cliente sai de uma sala
    socket.on("room:leave", (data: { roomId: string }) => {
      const { roomId } = data;
      console.log(`📥 Socket ${socket.id} saindo da sala:`, roomId);
      if (roomId) {
        roomSocketService.leaveRoom(socket, roomId);
      }
    });

    // Cliente solicita rematch
    socket.on("room:rematch-request", async (data: { roomId: string }) => {
      const { roomId } = data;
      const userId = socket.handshake.query.userId as string;

      if (!userId) {
        console.error("❌ room:rematch-request sem userId");
        return;
      }

      console.log(`🔄 Socket ${socket.id} (user ${userId}) pedindo rematch na sala ${roomId}`);

      try {
        await roomSocketService.handleRematchRequest(roomId, userId);
      } catch (error: any) {
        console.error("❌ Erro ao processar rematch request:", error);
        socket.emit("error", { message: error.message });
      }
    });

    // Cliente responde ao rematch (aceita ou rejeita)
    socket.on("room:rematch-response", async (data: { roomId: string; accepted: boolean }) => {
      const { roomId, accepted } = data;
      const userId = socket.handshake.query.userId as string;

      if (!userId) {
        console.error("❌ room:rematch-response sem userId");
        return;
      }

      console.log(`${accepted ? '✅' : '❌'} Socket ${socket.id} (user ${userId}) ${accepted ? 'aceitou' : 'recusou'} rematch na sala ${roomId}`);

      try {
        await roomSocketService.handleRematchResponse(roomId, userId, accepted);
      } catch (error: any) {
        console.error("❌ Erro ao processar rematch response:", error);
        socket.emit("error", { message: error.message });
      }
    });

    // Limpar sala quando socket desconectar
    const originalDisconnect = socket.disconnect.bind(socket);
    socket.on("disconnecting", () => {
      console.log(`🔌 Socket ${socket.id} desconectando, limpando salas...`);
      // Socket.IO automaticamente remove de todas as salas, mas vamos limpar nosso mapa
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room !== socket.id && room.startsWith("room:")) {
          const roomId = room.replace("room:", "");
          console.log(`🚪 Limpando socket ${socket.id} da sala ${roomId}`);
        }
      });
    });
  });

  return io;
}
