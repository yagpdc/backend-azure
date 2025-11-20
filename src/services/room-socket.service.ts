import type { Server as SocketIOServer, Socket } from "socket.io";

export class RoomSocketService {
  private static instance: RoomSocketService;
  private io: SocketIOServer | null = null;
  
  // Mapear socketId -> roomId para saber quem está em qual sala
  private socketToRoom: Map<string, string> = new Map();

  static getInstance(): RoomSocketService {
    if (!RoomSocketService.instance) {
      RoomSocketService.instance = new RoomSocketService();
    }
    return RoomSocketService.instance;
  }

  setIO(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Usuário entra em uma sala (join Socket.IO room)
   */
  joinRoom(socket: Socket, roomId: string) {
    socket.join(`room:${roomId}`);
    this.socketToRoom.set(socket.id, roomId);
    console.log(`🚪 Socket ${socket.id} entrou na sala ${roomId}`);
  }

  /**
   * Usuário sai de uma sala
   */
  leaveRoom(socket: Socket, roomId: string) {
    socket.leave(`room:${roomId}`);
    this.socketToRoom.delete(socket.id);
    console.log(`🚪 Socket ${socket.id} saiu da sala ${roomId}`);
  }

  /**
   * Notificar todos na sala sobre um evento
   */
  emitToRoom(roomId: string, event: string, data: any) {
    if (!this.io) {
      console.warn("⚠️  Socket.IO não inicializado");
      return;
    }
    
    this.io.to(`room:${roomId}`).emit(event, data);
    console.log(`📢 Evento '${event}' enviado para sala ${roomId}`);
  }

  /**
   * Notificar um usuário específico
   */
  emitToSocket(socketId: string, event: string, data: any) {
    if (!this.io) {
      console.warn("⚠️  Socket.IO não inicializado");
      return;
    }

    this.io.to(socketId).emit(event, data);
  }

  // ===== EVENTOS DE SALA =====

  /**
   * Notificar que um jogador entrou na sala
   */
  notifyPlayerJoined(roomId: string, player: { userId: string; username: string }) {
    this.emitToRoom(roomId, "room:player-joined", {
      roomId,
      player,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar que o jogo começou
   */
  notifyGameStarted(roomId: string, data: {
    currentTurnPlayer: string;
    firstWord: string; // Escondido como "?????"
  }) {
    this.emitToRoom(roomId, "room:game-started", {
      roomId,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar sobre um palpite feito
   */
  notifyGuessMade(roomId: string, data: {
    playerId: string;
    playerName: string;
    guess: string;
    pattern: string;
    isCorrect: boolean;
    attemptsUsed: number;
    maxAttempts: number;
  }) {
    this.emitToRoom(roomId, "room:guess-made", {
      roomId,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar mudança de turno
   */
  notifyTurnChanged(roomId: string, data: {
    nextTurnPlayer: string;
    attemptNumber: number;
  }) {
    this.emitToRoom(roomId, "room:turn-changed", {
      roomId,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar que uma palavra foi completada (vitória)
   */
  notifyWordCompleted(roomId: string, data: {
    word: string;
    currentScore: number;
    nextTurnPlayer: string;
  }) {
    this.emitToRoom(roomId, "room:word-completed", {
      roomId,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar que o jogo acabou (derrota)
   */
  notifyGameOver(roomId: string, data: {
    finalScore: number;
    correctWord: string;
  }) {
    this.emitToRoom(roomId, "room:game-over", {
      roomId,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar que um jogador abandonou
   */
  notifyPlayerAbandoned(roomId: string, data: {
    playerId: string;
    playerName: string;
  }) {
    this.emitToRoom(roomId, "room:player-abandoned", {
      roomId,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar que um jogador saiu da sala (antes de começar)
   */
  notifyPlayerLeft(roomId: string, data: {
    playerId: string;
    playerName: string;
    remainingPlayers: number;
  }) {
    this.emitToRoom(roomId, "room:player-left", {
      roomId,
      ...data,
      timestamp: new Date(),
    });
  }
}

export const roomSocketService = RoomSocketService.getInstance();
