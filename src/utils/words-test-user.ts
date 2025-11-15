import type { IWordsUser } from "../models/words-user";

const resolvedTestUserName = (() => {
  const candidates = [
    process.env.WORDS_TEST_USER,
    process.env.WORDS_ADMIN_USER,
    "admin",
  ];

  const match = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return match ? match.trim().toLowerCase() : null;
})();

export function getTestUserName() {
  return resolvedTestUserName;
}

export function isTestUserName(name?: string | null): boolean {
  if (!resolvedTestUserName || !name) {
    return false;
  }
  return name.trim().toLowerCase() === resolvedTestUserName;
}

export function isTestWordsUser(user?: Pick<IWordsUser, "name"> | null) {
  return isTestUserName(user?.name ?? null);
}
