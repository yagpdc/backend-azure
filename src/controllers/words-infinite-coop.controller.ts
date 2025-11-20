import type { Request, Response } from "express";
import { wordsInfiniteRoomService } from "../services/words-infinite-room.service";
import { wordsInfiniteCoopService } from "../services/words-infinite-coop.service";
import { WordsInfiniteRunError } from "../services/words-infinite-run.service";
import { roomSocketService } from "../services/room-socket.service";
import { WordsUsersService } from "../services/words-users.service";
import { normalizeAvatarConfig } from "../utils/words-avatar";
import type { WordsInfiniteRoom } from "../models/words-infinite-room";

export class WordsInfiniteCoopController {
  private readonly usersService = new WordsUsersService();

  /**
   * Enriquecer dados dos jogadores com avatares
   */
  private async enrichPlayersWithAvatars(players: any[]) {
    const enrichedPlayers = await Promise.all(
      players.map(async (player) => {
        const user = await this.usersService.findById(player.userId);
        
        // Avatar está em config.avatar, não em config diretamente
        const avatarValue = user?.config && typeof user.config === "object"
          ? (user.config as { avatar?: unknown }).avatar
          : undefined;
        
        return {
          userId: player.userId,
          username: player.username,
          joinedAt: player.joinedAt,
          avatar: normalizeAvatarConfig(avatarValue),
        };
      })
    );
    return enrichedPlayers;
  }

  /**
   * GET /words/infinity/coop/my-room
   * Buscar sala ativa do usuário
   */
  async getMyRoom(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

      const room = await wordsInfiniteRoomService.getUserActiveRoom(userId);
      if (!room) {
        return res.status(404).json({ error: "Você não está em nenhuma sala" });
      }

      // Buscar run se estiver jogando
      let run = null;
      let currentTurnPlayer = null;

      if (room.status === "playing" && room.currentRunId) {
        run = await wordsInfiniteCoopService.getCoopRun(room.roomId);
        if (run) {
          const nextAttempt = run.attemptsUsed + 1;
          currentTurnPlayer = wordsInfiniteRoomService.getCurrentTurnPlayer(
            room,
            nextAttempt
          );
        }
      }

      // Enriquecer jogadores com avatares
      const enrichedPlayers = await this.enrichPlayersWithAvatars(room.players);

      return res.status(200).json({
        roomId: room.roomId,
        status: room.status,
        players: enrichedPlayers,
        maxPlayers: room.maxPlayers,
        gamesPlayed: room.gamesPlayed,
        currentTurnPlayer,
        // Campos adicionais para facilitar UI (endpoint /my-room)
        isWaiting: room.status === "waiting",
        isPlaying: room.status === "playing",
        isFinished: room.status === "finished",
        playersCount: room.players.length,
        needsPlayers: room.maxPlayers - room.players.length,
        canStart: room.players.length === room.maxPlayers,
        shareUrl: `${req.protocol}://${req.get('host')}/words/infinity/coop/join-room/${room.roomId}`,
        run: run ? {
          id: run._id,
          currentScore: run.currentScore,
          attemptsUsed: run.attemptsUsed,
          maxAttempts: run.maxAttempts,
          currentGuesses: run.currentGuesses,
          status: run.status,
        } : null,
      });
    } catch (error: any) {
      console.error("Erro ao buscar sala ativa:", error);
      return res.status(error.statusCode || 500).json({
        error: error.message || "Erro ao buscar sala ativa",
      });
    }
  }

  /**
   * POST /words/infinity/coop/create-room
   * Criar uma nova sala co-op
   * Se já estiver em uma sala, retorna a sala existente
   */
  async createRoom(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

      // Verificar se já está em uma sala ativa
      const existingRoom = await wordsInfiniteRoomService.getUserActiveRoom(userId);
      
      if (existingRoom) {
        // Já está em uma sala - retornar a sala existente
        console.log(`⚠️  Usuário ${userId} já está na sala ${existingRoom.roomId}, retornando sala existente`);
        
        // Buscar run se estiver jogando
        let run = null;
        let currentTurnPlayer = null;

        if (existingRoom.status === "playing" && existingRoom.currentRunId) {
          run = await wordsInfiniteCoopService.getCoopRun(existingRoom.roomId);
          if (run) {
            const nextAttempt = run.attemptsUsed + 1;
            currentTurnPlayer = wordsInfiniteRoomService.getCurrentTurnPlayer(
              existingRoom,
              nextAttempt
            );
          }
        }

        return res.status(200).json({
          roomId: existingRoom.roomId,
          status: existingRoom.status,
          players: existingRoom.players,
          createdBy: existingRoom.createdBy,
          maxPlayers: existingRoom.maxPlayers,
          gamesPlayed: existingRoom.gamesPlayed,
          currentTurnPlayer,
          alreadyInRoom: true, // Flag para o frontend saber que é sala existente
          // Campos adicionais para facilitar UI
          isWaiting: existingRoom.status === "waiting",
          playersCount: existingRoom.players.length,
          needsPlayers: existingRoom.maxPlayers - existingRoom.players.length,
          canStart: existingRoom.players.length === existingRoom.maxPlayers,
          shareUrl: `${req.protocol}://${req.get('host')}/words/infinity/coop/join-room/${existingRoom.roomId}`,
          run: run ? {
            id: run._id,
            currentScore: run.currentScore,
            attemptsUsed: run.attemptsUsed,
            maxAttempts: run.maxAttempts,
            currentGuesses: run.currentGuesses,
            status: run.status,
          } : null,
        });
      }

      // Criar nova sala
      const room = await wordsInfiniteRoomService.createRoom(userId, "coop");

      // Enriquecer jogadores com avatares
      const enrichedPlayers = await this.enrichPlayersWithAvatars(room.players);

      return res.status(201).json({
        roomId: room.roomId,
        status: room.status,
        players: enrichedPlayers,
        createdBy: room.createdBy,
        maxPlayers: room.maxPlayers,
        alreadyInRoom: false,
        // Campos adicionais para facilitar UI
        isWaiting: true,
        playersCount: room.players.length,
        needsPlayers: room.maxPlayers - room.players.length,
        canStart: false,
        shareUrl: `${req.protocol}://${req.get('host')}/words/infinity/coop/join-room/${room.roomId}`,
      });
    } catch (error: any) {
      console.error("Erro ao criar sala:", error);
      return res.status(error.statusCode || 500).json({
        error: error.message || "Erro ao criar sala",
      });
    }
  }

  /**
   * POST /words/infinity/coop/join-room/:roomId
   * Entrar em uma sala existente
   */
  async joinRoom(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

      const { roomId } = req.params;
      const room = await wordsInfiniteRoomService.joinRoom(userId, roomId);

      // Notificar outros jogadores que alguém entrou
      const joiningPlayer = room.players.find(p => p.userId === userId);
      if (joiningPlayer) {
        roomSocketService.notifyPlayerJoined(room.roomId, {
          userId: joiningPlayer.userId,
          username: joiningPlayer.username,
        });
      }

      // Se a sala ficou cheia, iniciar o jogo
      let gameStarted = false;
      let run = null;
      let currentTurnPlayer = null;

      if (room.status === "playing") {
        const result = await wordsInfiniteCoopService.startCoopRun(room);
        run = result.run;
        currentTurnPlayer = result.currentTurnPlayer;
        gameStarted = true;

        // Notificar que o jogo começou
        roomSocketService.notifyGameStarted(room.roomId, {
          currentTurnPlayer,
          firstWord: "?????", // Esconder palavra
        });
      }

      // Enriquecer jogadores com avatares
      const enrichedPlayers = await this.enrichPlayersWithAvatars(room.players);

      return res.status(200).json({
        roomId: room.roomId,
        status: room.status,
        players: enrichedPlayers,
        maxPlayers: room.maxPlayers,
        gameStarted,
        currentTurnPlayer,
        // Campos adicionais para facilitar UI
        isWaiting: room.status === "waiting",
        isPlaying: room.status === "playing",
        playersCount: room.players.length,
        needsPlayers: room.maxPlayers - room.players.length,
        canStart: room.players.length === room.maxPlayers,
        shareUrl: `${req.protocol}://${req.get('host')}/words/infinity/coop/join-room/${room.roomId}`,
        run: run ? {
          id: run._id,
          currentScore: run.currentScore,
          nextWord: run.nextWord ? "?????".repeat(run.nextWord.length / 5) : null, // Esconder palavra
          attemptsUsed: run.attemptsUsed,
          maxAttempts: run.maxAttempts,
        } : null,
      });
    } catch (error: any) {
      console.error("Erro ao entrar na sala:", error);
      return res.status(error.statusCode || 500).json({
        error: error.message || "Erro ao entrar na sala",
      });
    }
  }

  /**
   * GET /words/infinity/coop/room/:roomId
   * Buscar informações da sala
   */
  async getRoom(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

      const { roomId } = req.params;
      const room = await wordsInfiniteRoomService.getRoom(roomId);

      if (!room) {
        return res.status(404).json({ error: "Sala não encontrada" });
      }

      // Verificar se usuário está na sala
      const isInRoom = room.players.some((p) => p.userId === userId);
      if (!isInRoom) {
        return res.status(403).json({ error: "Você não está nesta sala" });
      }

      // Buscar run se estiver jogando
      let run = null;
      let currentTurnPlayer = null;

      if (room.status === "playing" && room.currentRunId) {
        run = await wordsInfiniteCoopService.getCoopRun(room.roomId);
        if (run) {
          const nextAttempt = run.attemptsUsed + 1;
          currentTurnPlayer = wordsInfiniteRoomService.getCurrentTurnPlayer(
            room,
            nextAttempt
          );
        }
      }

      // Enriquecer jogadores com avatares
      const enrichedPlayers = await this.enrichPlayersWithAvatars(room.players);

      return res.status(200).json({
        roomId: room.roomId,
        status: room.status,
        players: enrichedPlayers,
        maxPlayers: room.maxPlayers,
        gamesPlayed: room.gamesPlayed,
        currentTurnPlayer,
        // Campos adicionais para facilitar UI (endpoint /room/:roomId)
        isWaiting: room.status === "waiting",
        isPlaying: room.status === "playing",
        isFinished: room.status === "finished",
        playersCount: room.players.length,
        needsPlayers: room.maxPlayers - room.players.length,
        canStart: room.players.length === room.maxPlayers,
        shareUrl: `${req.protocol}://${req.get('host')}/words/infinity/coop/join-room/${room.roomId}`,
        run: run ? {
          id: run._id,
          currentScore: run.currentScore,
          attemptsUsed: run.attemptsUsed,
          maxAttempts: run.maxAttempts,
          currentGuesses: run.currentGuesses,
          status: run.status,
        } : null,
      });
    } catch (error: any) {
      console.error("Erro ao buscar sala:", error);
      return res.status(error.statusCode || 500).json({
        error: error.message || "Erro ao buscar sala",
      });
    }
  }

  /**
   * POST /words/infinity/coop/guess
   * Enviar palpite no modo co-op
   */
  async submitGuess(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

      const { guess } = req.body;
      if (!guess) {
        return res.status(400).json({ error: "Palpite não fornecido" });
      }

      // Buscar sala ativa do usuário
      const room = await wordsInfiniteRoomService.getUserActiveRoom(userId);
      if (!room) {
        return res.status(404).json({ error: "Você não está em uma sala ativa" });
      }

      // Submit guess
      const result = await wordsInfiniteCoopService.submitCoopGuess(
        room,
        userId,
        guess
      );

      // Buscar dados do jogador
      const player = room.players.find(p => p.userId === userId);
      const playerName = player?.username || "Jogador";

      // Notificar sobre o palpite
      const guessData = result.result.guess || { pattern: "CCCCC", guessWord: guess };
      roomSocketService.notifyGuessMade(room.roomId, {
        playerId: userId,
        playerName,
        guess: guessData.guessWord,
        pattern: guessData.pattern,
        isCorrect: result.result.isCorrect || false,
        attemptsUsed: result.run.attemptsUsed,
        maxAttempts: result.run.maxAttempts,
      });

      // Se vitória (palavra completada)
      if (result.result.isCorrect && !result.isGameOver) {
        roomSocketService.notifyWordCompleted(room.roomId, {
          word: guessData.guessWord,
          currentScore: result.run.currentScore,
          nextTurnPlayer: result.nextTurnPlayer || "",
        });
      }

      // Se derrota (game over)
      if (result.isGameOver) {
        roomSocketService.notifyGameOver(room.roomId, {
          finalScore: result.result.finalScore || result.run.currentScore,
          correctWord: result.result.correctWord || "",
        });
      }

      // Se apenas mudou de turno
      if (!result.result.isCorrect && !result.isGameOver && result.nextTurnPlayer) {
        roomSocketService.notifyTurnChanged(room.roomId, {
          nextTurnPlayer: result.nextTurnPlayer,
          attemptNumber: result.run.attemptsUsed + 1,
        });
      }

      return res.status(200).json({
        pattern: result.result.guess?.pattern || result.result.isCorrect ? "CCCCC" : null,
        isCorrect: result.result.isCorrect,
        isGameOver: result.isGameOver,
        nextTurnPlayer: result.nextTurnPlayer,
        currentScore: result.run.currentScore,
        attemptsUsed: result.run.attemptsUsed,
        maxAttempts: result.run.maxAttempts,
        currentGuesses: result.run.currentGuesses,
        // Se acabou o jogo
        finalScore: result.result.finalScore,
        correctWord: result.result.correctWord,
      });
    } catch (error: any) {
      console.error("Erro ao enviar palpite:", error);
      
      if (error instanceof WordsInfiniteRunError) {
        return res.status(error.statusCode).json({
          error: error.message,
        });
      }

      return res.status(500).json({
        error: error.message || "Erro ao processar palpite",
      });
    }
  }

  /**
   * POST /words/infinity/coop/abandon
   * Abandonar run co-op
   */
  async abandonRun(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

      // Buscar sala ativa do usuário
      const room = await wordsInfiniteRoomService.getUserActiveRoom(userId);
      if (!room) {
        return res.status(404).json({ error: "Você não está em uma sala ativa" });
      }

      const player = room.players.find(p => p.userId === userId);
      const result = await wordsInfiniteCoopService.abandonCoopRun(room, userId);

      // Notificar que jogador abandonou
      if (player) {
        roomSocketService.notifyPlayerAbandoned(room.roomId, {
          playerId: userId,
          playerName: player.username,
        });
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro ao abandonar run:", error);
      return res.status(error.statusCode || 500).json({
        error: error.message || "Erro ao abandonar run",
      });
    }
  }

  /**
   * POST /words/infinity/coop/leave-room
   * Sair da sala (antes de começar o jogo)
   */
  async leaveRoom(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

      const room = await wordsInfiniteRoomService.getUserActiveRoom(userId);
      if (!room) {
        return res.status(404).json({ error: "Você não está em uma sala" });
      }

      if (room.status !== "waiting") {
        return res.status(400).json({
          error: "Não é possível sair de uma sala em andamento. Use /abandon para abandonar o jogo.",
        });
      }

      const player = room.players.find(p => p.userId === userId);
      const updatedRoom = await wordsInfiniteRoomService.leaveRoom(userId, room.roomId);

      // Notificar que jogador saiu
      if (player) {
        roomSocketService.notifyPlayerLeft(room.roomId, {
          playerId: userId,
          playerName: player.username,
          remainingPlayers: updatedRoom.players.length,
        });
      }

      return res.status(200).json({
        message: "Você saiu da sala",
      });
    } catch (error: any) {
      console.error("Erro ao sair da sala:", error);
      return res.status(error.statusCode || 500).json({
        error: error.message || "Erro ao sair da sala",
      });
    }
  }

  /**
   * POST /words/infinity/coop/force-leave
   * Forçar saída de qualquer sala (waiting ou playing)
   * Útil quando usuário está preso em uma sala
   */
  async forceLeave(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

      const room = await wordsInfiniteRoomService.getUserActiveRoom(userId);
      if (!room) {
        return res.status(404).json({ error: "Você não está em uma sala" });
      }

      const player = room.players.find(p => p.userId === userId);

      // Se sala está em jogo, abandonar
      if (room.status === "playing") {
        await wordsInfiniteCoopService.abandonCoopRun(room, userId);
        
        if (player) {
          roomSocketService.notifyPlayerAbandoned(room.roomId, {
            playerId: userId,
            playerName: player.username,
          });
        }

        return res.status(200).json({
          message: "Você abandonou o jogo e saiu da sala",
        });
      }

      // Se sala está esperando, apenas sair
      const updatedRoom = await wordsInfiniteRoomService.leaveRoom(userId, room.roomId);
      
      if (player) {
        roomSocketService.notifyPlayerLeft(room.roomId, {
          playerId: userId,
          playerName: player.username,
          remainingPlayers: updatedRoom.players.length,
        });
      }

      return res.status(200).json({
        message: "Você saiu da sala",
      });
    } catch (error: any) {
      console.error("Erro ao forçar saída:", error);
      return res.status(error.statusCode || 500).json({
        error: error.message || "Erro ao forçar saída",
      });
    }
  }

  private getUserId(req: Request): string {
    if (!req.wordsUser) {
      throw new Error("Words user missing in request");
    }
    return req.wordsUser.id;
  }
}

export const wordsInfiniteCoopController = new WordsInfiniteCoopController();
