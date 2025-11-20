import type { Request, Response } from "express";
import { OnlineUsersService } from "../services/online-users.service";

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
  markUserOnline = (req: Request, res: Response) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    // Criar uma "conexão fake" para simular o socket
    const fakeSocketId = `http-${userId}-${Date.now()}`;
    const onlineService = OnlineUsersService.getInstance();
    onlineService.addUser(userId, fakeSocketId);

    return res.json({
      message: "Usuário marcado como online (simulado)",
      userId,
      isOnline: onlineService.isUserOnline(userId),
      totalOnline: onlineService.getOnlineCount(),
    });
  };
}
