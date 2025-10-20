// TODO: Implement business logic for Game entity
import { GamesRepository } from "../repositories/games.repository";

export class GamesService {
  private readonly repo = new GamesRepository();

  async create(/* dto: CreateGameDto */) {
    // TODO: validate dto and call repo.create
    return this.repo.create();
  }

  async list(/* params?: { limit?: number } */) {
    // TODO: implement list rules and call repo.list
    return this.repo.list();
  }
}
