import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { WordsUsersService } from '../services/words-users.service';
import { WordsUserModel } from '../models/words-user';

const usersService = new WordsUsersService();

export class AuthController {
  async signup(req: Request, res: Response) {
    const { name, password } = req.body as { name?: string; password?: string };

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nome (username) é obrigatório' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Senha é obrigatória (mínimo 6 caracteres)' });
    }

    const normalized = name.trim();

    // check uniqueness (case-insensitive)
    const exists = await usersService.findByName(normalized);
    if (exists) {
      return res.status(409).json({ error: 'Nome de usuário já existe' });
    }

    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);

    const user = await WordsUserModel.create({
      name: normalized,
      passwordHash: hash,
    });

    return res.status(201).json({ id: user.id, name: user.name });
  }
}
