import type { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { roomSocketService } from "./room-socket.service";

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
  });

  const onlineService = OnlineUsersService.getInstance();
  
  // Inicializar serviço de salas com Socket.IO
  roomSocketService.setIO(io);

  io.on("connection", (socket) => {
    console.log(`🔌 Socket conectado: ${socket.id}`);
    let currentUserId: string | null = null;

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

      // Notificar todos sobre a mudança de status
      io.emit("users:online", {
        onlineUserIds: onlineService.getOnlineUserIds(),
        totalOnline: onlineService.getOnlineCount(),
      });
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

        io.emit("users:online", {
          onlineUserIds: onlineService.getOnlineUserIds(),
          totalOnline: onlineService.getOnlineCount(),
        });
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

    // ===== EVENTOS DE SALA =====

    // Cliente entra em uma sala específica
    socket.on("room:join", (data: { roomId: string }) => {
      const { roomId } = data;
      if (roomId) {
        roomSocketService.joinRoom(socket, roomId);
      }
    });

    // Cliente sai de uma sala
    socket.on("room:leave", (data: { roomId: string }) => {
      const { roomId } = data;
      if (roomId) {
        roomSocketService.leaveRoom(socket, roomId);
      }
    });
  });

  return io;
}
