import {
  DEFAULT_AVATAR,
  WORDS_BACKGROUND_OPTIONS,
  WORDS_BODY_OPTIONS,
  WORDS_FROG_OPTIONS,
  WORDS_HAT_OPTIONS,
  type WordsAvatarConfig,
} from "../config/words-avatar";

export function normalizeAvatarConfig(value?: unknown): WordsAvatarConfig {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_AVATAR };
  }

  const raw = value as Partial<WordsAvatarConfig>;
  return {
    frogType: sanitizePrimary(raw.frogType),
    hat: sanitizeAccessory(raw.hat),
    body: sanitizeAccessory(raw.body),
    background: sanitizeAccessory(raw.background),
  };
}

export function normalizeAvatarPayload(
  value: Pick<WordsAvatarConfig, "frogType" | "hat" | "body" | "background">,
): WordsAvatarConfig {
  return {
    frogType: sanitizePrimary(value.frogType),
    hat: sanitizeAccessory(value.hat),
    body: sanitizeAccessory(value.body),
    background: sanitizeAccessory(value.background),
  };
}

export function getWordsAvatarOptions() {
  return {
    frogs: WORDS_FROG_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      allowAccessories: option.allowAccessories,
    })),
    hats: WORDS_HAT_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    bodies: WORDS_BODY_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    backgrounds: WORDS_BACKGROUND_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })),
  };
}

function sanitizePrimary(value?: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return DEFAULT_AVATAR.frogType;
}

function sanitizeAccessory(value?: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
}
