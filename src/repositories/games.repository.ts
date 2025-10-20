// TODO: Implement data access for Game entity (MongoDB operations)
// Example methods:
// - create
// - findById
// - list
// - update
// - delete

export class GamesRepository {
  // TODO: Inject or access DB connection (e.g., via getDb())

  async create(/* dto: CreateGameDto */) {
    // TODO: Implement insert logic
    throw new Error("Not implemented");
  }

  async findById(/* id: string */) {
    // TODO: Implement find by id logic
    throw new Error("Not implemented");
  }

  async list(/* query?: any */) {
    // TODO: Implement list logic
    return [];
  }

  async update(/* id: string, dto: Partial<CreateGameDto> */) {
    // TODO: Implement update logic
    throw new Error("Not implemented");
  }

  async delete(/* id: string */) {
    // TODO: Implement delete logic
    throw new Error("Not implemented");
  }
}
