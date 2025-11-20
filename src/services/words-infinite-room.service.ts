import { WordsInfiniteRoomModel, WordsInfiniteRoom } from "../models/words-infinite-room";
import { WordsUserModel } from "../models/words-user";
import { nanoid } from "nanoid";

export class WordsInfiniteRoomService {
  /**
   * Criar uma nova sala multiplayer
   */
  async createRoom(
    userId: string,
    mode: "coop" | "versus" = "coop"
  ): Promise<WordsInfiniteRoom> {
    // Buscar username do usuário
    const user = await WordsUserModel.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Gerar ID único para a sala (6 caracteres, fácil de compartilhar)
    const roomId = nanoid(6).toUpperCase();

    const room = await WordsInfiniteRoomModel.create({
      roomId,
      mode,
      players: [
        {
          userId,
          username: user.name,
          joinedAt: new Date(),
        },
      ],
      maxPlayers: 2,
      status: "waiting",
      createdBy: userId,
      gamesPlayed: 0,
    });

    return room;
  }

  /**
   * Entrar em uma sala existente
   */
  async joinRoom(userId: string, roomId: string): Promise<WordsInfiniteRoom> {
    // Buscar sala
    const room = await WordsInfiniteRoomModel.findOne({ roomId });
    if (!room) {
      throw new Error("Sala não encontrada");
    }

    // Verificar se sala está disponível
    if (room.status !== "waiting") {
      throw new Error("Sala não está mais disponível");
    }

    // Verificar se sala está cheia
    if (room.players.length >= room.maxPlayers) {
      throw new Error("Sala está cheia");
    }

    // Verificar se usuário já está na sala
    if (room.players.some((p) => p.userId === userId)) {
      throw new Error("Você já está nesta sala");
    }

    // Buscar username do usuário
    const user = await WordsUserModel.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Adicionar jogador à sala
    room.players.push({
      userId,
      username: user.name,
      joinedAt: new Date(),
    });

    // Se atingiu o número máximo de jogadores, mudar status para playing
    if (room.players.length === room.maxPlayers) {
      room.status = "playing";
    }

    await room.save();
    return room;
  }

  /**
   * Buscar sala por ID
   */
  async getRoom(roomId: string): Promise<WordsInfiniteRoom | null> {
    return WordsInfiniteRoomModel.findOne({ roomId });
  }

  /**
   * Buscar sala ativa do usuário (waiting ou playing)
   */
  async getUserActiveRoom(userId: string): Promise<WordsInfiniteRoom | null> {
    return WordsInfiniteRoomModel.findOne({
      "players.userId": userId,
      status: { $in: ["waiting", "playing"] },
    });
  }

  /**
   * Atualizar run atual da sala
   */
  async updateCurrentRun(roomId: string, runId: string): Promise<void> {
    await WordsInfiniteRoomModel.updateOne(
      { roomId },
      { currentRunId: runId }
    );
  }

  /**
   * Incrementar contador de jogos
   */
  async incrementGamesPlayed(roomId: string): Promise<void> {
    await WordsInfiniteRoomModel.updateOne(
      { roomId },
      { $inc: { gamesPlayed: 1 } }
    );
  }

  /**
   * Finalizar sala
   */
  async finishRoom(roomId: string): Promise<void> {
    await WordsInfiniteRoomModel.updateOne(
      { roomId },
      { status: "finished" }
    );
  }

  /**
   * Sair da sala (antes de começar o jogo)
   */
  async leaveRoom(userId: string, roomId: string): Promise<WordsInfiniteRoom> {
    const room = await WordsInfiniteRoomModel.findOne({ roomId });
    if (!room) {
      throw new Error("Sala não encontrada");
    }

    // Remover jogador
    room.players = room.players.filter((p) => p.userId !== userId);

    // Se ficou vazia, deletar sala
    if (room.players.length === 0) {
      await WordsInfiniteRoomModel.deleteOne({ roomId });
      throw new Error("Sala removida - todos os jogadores saíram");
    }

    await room.save();
    return room;
  }

  /**
   * Calcular de quem é o turno atual
   * Lógica:
   * - Jogo 1 (gamesPlayed = 0): p1, p2, p1, p2, p1
   * - Jogo 2 (gamesPlayed = 1): p2, p1, p2, p1, p2
   * - Jogo 3 (gamesPlayed = 2): p1, p2, p1, p2, p1
   * etc.
   */
  getCurrentTurnPlayer(
    room: WordsInfiniteRoom,
    attemptNumber: number
  ): string {
    if (room.players.length !== 2) {
      throw new Error("Sala deve ter exatamente 2 jogadores");
    }

    const player1 = room.players[0].userId;
    const player2 = room.players[1].userId;

    // Determinar quem inicia baseado em gamesPlayed (par = p1, ímpar = p2)
    const gameStartsWithPlayer1 = room.gamesPlayed % 2 === 0;

    // attemptNumber vai de 1 a 5
    // Se p1 inicia: 1=p1, 2=p2, 3=p1, 4=p2, 5=p1
    // Se p2 inicia: 1=p2, 2=p1, 3=p2, 4=p1, 5=p2
    const attemptIsOdd = attemptNumber % 2 === 1;

    const result = (gameStartsWithPlayer1 && attemptIsOdd) || (!gameStartsWithPlayer1 && !attemptIsOdd)
      ? player1
      : player2;

    console.log("🎯 [ROOM] getCurrentTurnPlayer:", {
      attemptNumber,
      gamesPlayed: room.gamesPlayed,
      gameStartsWithPlayer1,
      attemptIsOdd,
      result,
      player1,
      player2,
    });

    return result;
  }

  /**
   * Validar se é o turno do jogador
   */
  isPlayerTurn(
    room: WordsInfiniteRoom,
    attemptNumber: number,
    userId: string
  ): boolean {
    const expectedPlayer = this.getCurrentTurnPlayer(room, attemptNumber);
    return expectedPlayer === userId;
  }

  /**
   * Obter próximo jogador
   */
  getNextPlayer(room: WordsInfiniteRoom, currentAttemptNumber: number): string {
    const nextAttemptNumber = currentAttemptNumber + 1;
    return this.getCurrentTurnPlayer(room, nextAttemptNumber);
  }

  /**
   * Buscar todas as salas que contêm um usuário
   */
  async findAllRoomsByUser(userId: string): Promise<WordsInfiniteRoom[]> {
    return WordsInfiniteRoomModel.find({
      "players.userId": userId,
    });
  }

  /**
   * Forçar remoção de um jogador de uma sala específica ou todas
   */
  async forceRemovePlayer(userId: string, roomId: string): Promise<void> {
    if (roomId === "ANY") {
      // Remove de todas as salas
      await WordsInfiniteRoomModel.updateMany(
        { "players.userId": userId },
        { $pull: { players: { userId } } }
      );

      // Deletar salas que ficaram vazias
      await WordsInfiniteRoomModel.deleteMany({ players: { $size: 0 } });
    } else {
      // Remove de uma sala específica
      const room = await WordsInfiniteRoomModel.findOne({ roomId });
      if (room) {
        room.players = room.players.filter((p) => p.userId !== userId);

        if (room.players.length === 0) {
          await WordsInfiniteRoomModel.deleteOne({ roomId });
        } else {
          await room.save();
        }
      }
    }
  }

  /**
   * Marcar que um jogador quer rematch
   */
  async setRematchRequest(roomId: string, userId: string, wantsRematch: boolean): Promise<void> {
    await WordsInfiniteRoomModel.updateOne(
      { roomId, "players.userId": userId },
      { $set: { "players.$.wantsRematch": wantsRematch } }
    );
  }

  /**
   * Limpar todas as flags de rematch
   */
  async clearRematchRequests(roomId: string): Promise<void> {
    await WordsInfiniteRoomModel.updateOne(
      { roomId },
      { $set: { "players.$[].wantsRematch": false } }
    );
  }

  /**
   * Verificar se ambos jogadores querem rematch
   */
  async checkBothWantRematch(roomId: string): Promise<boolean> {
    const room = await WordsInfiniteRoomModel.findOne({ roomId });
    if (!room || room.players.length !== 2) {
      return false;
    }

    return room.players.every(p => p.wantsRematch === true);
  }

  /**
   * Criar nova sala para rematch com os mesmos jogadores
   */
  async createRematchRoom(oldRoom: WordsInfiniteRoom): Promise<WordsInfiniteRoom> {
    // Gerar novo código
    const newRoomId = await this.generateRoomCode();

    // Criar nova sala com mesmos jogadores (inverter ordem para alternar quem começa)
    const newRoom = await WordsInfiniteRoomModel.create({
      roomId: newRoomId,
      mode: oldRoom.mode,
      players: [
        {
          userId: oldRoom.players[1].userId, // Inverter: player 2 vira player 1
          username: oldRoom.players[1].username,
          joinedAt: new Date(),
          wantsRematch: false,
        },
        {
          userId: oldRoom.players[0].userId, // Inverter: player 1 vira player 2
          username: oldRoom.players[0].username,
          joinedAt: new Date(),
          wantsRematch: false,
        },
      ],
      maxPlayers: 2,
      status: "playing", // Já começa jogando
      createdBy: oldRoom.players[1].userId, // Novo "criador" é o que era player 2
      gamesPlayed: 0,
    });

    // Marcar sala antiga como finished
    await WordsInfiniteRoomModel.updateOne(
      { roomId: oldRoom.roomId },
      { $set: { status: "finished" } }
    );

    return newRoom;
  }

  /**
   * Gerar um código de sala único (6 caracteres) usando `nanoid`.
   */
  private async generateRoomCode(): Promise<string> {
    // Tenta gerar um código e garantir unicidade no banco
    for (let i = 0; i < 5; i++) {
      const candidate = nanoid(6).toUpperCase();
      const exists = await WordsInfiniteRoomModel.exists({ roomId: candidate });
      if (!exists) return candidate;
    }
    // Fallback: gerar com timestamp
    return (`R${Date.now().toString(36)}`).toUpperCase().slice(0, 6);
  }
}

export const wordsInfiniteRoomService = new WordsInfiniteRoomService();
