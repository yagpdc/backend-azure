import type { Request, Response } from "express";
import { OnlineUsersService } from "../services/online-users.service";
import { WordsUsersService } from "../services/words-users.service";

export class OnlineController {
  getOnlineUsers = (_req: Request, res: Response) => {
    const onlineService = OnlineUsersService.getInstance();

    return res.json({
      onlineUserIds: onlineService.getOnlineUserIds(),
      totalOnline: onlineService.getOnlineCount(),
    });
  };

  // Endpoint temporário para marcar usuário como online via HTTP (para debug)
  // Em produção, usar apenas Socket.IO
  markUserOnline = async (req: Request, res: Response) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    // Criar uma "conexão fake" para simular o socket
    const fakeSocketId = `http-${userId}-${Date.now()}`;
    const onlineService = OnlineUsersService.getInstance();
    onlineService.addUser(userId, fakeSocketId);

    // Try to resolve user's name
    const usersService = new WordsUsersService();
    let name = userId;
    try {
      const user = await usersService.findById(userId);
      if (user && (user as any).name) name = (user as any).name;
    } catch (_) {
      // ignore and fallback to id
    }

    return res.json({
      message: "Usuário marcado como online (simulado)",
      userId,
      name,
      isOnline: onlineService.isUserOnline(userId),
      totalOnline: onlineService.getOnlineCount(),
    });
  };
}
