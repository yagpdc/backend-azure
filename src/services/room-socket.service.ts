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
    run: any; // Run completo
    currentTurnPlayerId: string;
  }) {
    this.emitToRoom(roomId, "room:game-started", {
      roomId,
      run: data.run,
      currentTurnPlayerId: data.currentTurnPlayerId,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar sobre um palpite feito
   */
  notifyGuessMade(roomId: string, data: {
    playerId: string;
    playerName: string;
    guess: {
      guessWord: string;
      pattern: string;
    };
    attemptNumber: number;
  }) {
    this.emitToRoom(roomId, "room:guess-made", {
      roomId,
      playerId: data.playerId,
      playerName: data.playerName,
      guess: data.guess,
      attemptNumber: data.attemptNumber,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar mudança de turno
   */
  notifyTurnChanged(roomId: string, data: {
    currentTurnPlayerId: string;
    currentTurnPlayerName: string;
  }) {
    this.emitToRoom(roomId, "room:turn-changed", {
      roomId,
      currentTurnPlayerId: data.currentTurnPlayerId,
      currentTurnPlayerName: data.currentTurnPlayerName,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar que uma palavra foi completada (vitória)
   */
  notifyWordCompleted(roomId: string, data: {
    word: string;
    currentScore: number;
    nextWord: any | null; // Próxima palavra (escondida)
  }) {
    this.emitToRoom(roomId, "room:word-completed", {
      roomId,
      word: data.word,
      currentScore: data.currentScore,
      nextWord: data.nextWord,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar que o jogo acabou (derrota)
   */
  notifyGameOver(roomId: string, data: {
    finalScore: number;
    wordsCompleted: number;
    reason: "failed" | "abandoned";
  }) {
    this.emitToRoom(roomId, "room:game-over", {
      roomId,
      finalScore: data.finalScore,
      wordsCompleted: data.wordsCompleted,
      reason: data.reason,
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

  /**
   * Lidar com pedido de rematch
   */
  async handleRematchRequest(roomId: string, requesterId: string) {
    const { wordsInfiniteRoomService } = await import("./words-infinite-room.service");

    const room = await wordsInfiniteRoomService.getRoom(roomId);
    if (!room) {
      throw new Error("Sala não encontrada");
    }

    const requester = room.players.find(p => p.userId === requesterId);
    if (!requester) {
      throw new Error("Jogador não encontrado na sala");
    }

    // Marcar que este jogador quer rematch
    await wordsInfiniteRoomService.setRematchRequest(roomId, requesterId, true);

    // Notificar o outro jogador
    this.emitToRoom(roomId, "room:rematch-request", {
      roomId,
      requesterId,
      requesterName: requester.username,
    });

    console.log(`🔄 [REMATCH] ${requester.username} pediu rematch na sala ${roomId}`);
  }

  /**
   * Lidar com resposta ao rematch
   */
  async handleRematchResponse(roomId: string, responderId: string, accepted: boolean) {
    const { wordsInfiniteRoomService } = await import("./words-infinite-room.service");

    const room = await wordsInfiniteRoomService.getRoom(roomId);
    if (!room) {
      throw new Error("Sala não encontrada");
    }

    const responder = room.players.find(p => p.userId === responderId);
    if (!responder) {
      throw new Error("Jogador não encontrado na sala");
    }

    if (!accepted) {
      // Recusou - limpar flags de rematch e notificar
      await wordsInfiniteRoomService.clearRematchRequests(roomId);

      this.emitToRoom(roomId, "room:rematch-response", {
        roomId,
        accepted: false,
        responderId,
        responderName: responder.username,
      });

      console.log(`❌ [REMATCH] ${responder.username} recusou rematch na sala ${roomId}`);
      return;
    }

    // Aceitou - verificar se ambos querem rematch
    await wordsInfiniteRoomService.setRematchRequest(roomId, responderId, true);
    const bothWantRematch = await wordsInfiniteRoomService.checkBothWantRematch(roomId);

    if (bothWantRematch) {
      // Criar nova sala com os mesmos jogadores
      const newRoom = await wordsInfiniteRoomService.createRematchRoom(room);

      // Iniciar run automaticamente
      const { wordsInfiniteCoopService } = await import("./words-infinite-coop.service");
      // wordsInfiniteCoopService is exported as an instance; use it directly
      const { run, currentTurnPlayer } = await wordsInfiniteCoopService.startCoopRun(newRoom);

      // Atualizar sala com o run
      // run._id can be an ObjectId - cast to string safely
      await wordsInfiniteRoomService.updateCurrentRun(newRoom.roomId, String((run as any)._id));

      this.emitToRoom(roomId, "room:rematch-response", {
        roomId,
        accepted: true,
        responderId,
        responderName: responder.username,
        newRoomId: newRoom.roomId,
      });

      console.log(`✅ [REMATCH] Nova sala criada: ${newRoom.roomId} com run iniciado`);
    } else {
      // Marcou que aceita, mas o outro ainda não pediu
      this.emitToRoom(roomId, "room:rematch-response", {
        roomId,
        accepted: true,
        responderId,
        responderName: responder.username,
      });

      console.log(`⏳ [REMATCH] ${responder.username} aceitou, aguardando outro jogador`);
    }
  }
}

export const roomSocketService = RoomSocketService.getInstance();
