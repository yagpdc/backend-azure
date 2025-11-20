import type { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

export class OnlineUsersService {
  private static instance: OnlineUsersService;
  private onlineUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId

  private constructor() {}

  static getInstance(): OnlineUsersService {
    if (!OnlineUsersService.instance) {
      OnlineUsersService.instance = new OnlineUsersService();
    }
    return OnlineUsersService.instance;
  }

  addUser(userId: string, socketId: string): void {
    // Adicionar socket ao conjunto de conexões do usuário
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(socketId);

    // Mapear socketId -> userId
    this.socketToUser.set(socketId, userId);
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
      }
    }

    // Remover mapeamento
    this.socketToUser.delete(socketId);

    return userId;
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
      credentials: false,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const onlineService = OnlineUsersService.getInstance();

  io.on("connection", (socket) => {
    console.log(`🔌 Socket conectado: ${socket.id}`);

    // Usuário se identifica ao conectar
    socket.on("user:online", (data: { userId: string }) => {
      const { userId } = data;

      if (!userId) {
        console.warn("⚠️  userId não fornecido");
        return;
      }

      onlineService.addUser(userId, socket.id);
      console.log(`✅ Usuário ${userId} online (${onlineService.getConnectionCount(userId)} conexão(ões))`);

      // Notificar todos sobre a mudança de status
      io.emit("users:online", {
        onlineUserIds: onlineService.getOnlineUserIds(),
        totalOnline: onlineService.getOnlineCount(),
      });
    });

    // Usuário se desconectou
    socket.on("disconnect", () => {
      const userId = onlineService.removeUser(socket.id);

      if (userId) {
        console.log(`👋 Usuário ${userId} desconectado (${onlineService.getConnectionCount(userId)} conexão(ões) restantes)`);

        // Se o usuário não tem mais conexões ativas, notificar todos
        if (!onlineService.isUserOnline(userId)) {
          io.emit("users:online", {
            onlineUserIds: onlineService.getOnlineUserIds(),
            totalOnline: onlineService.getOnlineCount(),
          });
        }
      }

      console.log(`🔌 Socket desconectado: ${socket.id}`);
    });

    // Permitir que cliente solicite lista de usuários online
    socket.on("users:request", () => {
      socket.emit("users:online", {
        onlineUserIds: onlineService.getOnlineUserIds(),
        totalOnline: onlineService.getOnlineCount(),
      });
    });
  });

  return io;
}
