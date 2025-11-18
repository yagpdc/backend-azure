export interface WordsAvatarConfig {
  frogType: string | null;
  hat: string | null;
  body: string | null;
  background: string | null;
}

export interface WordsAvatarFrogOption {
  id: string;
  label: string;
  allowAccessories: boolean;
}

export interface WordsAvatarAccessoryOption {
  id: string;
  label: string;
}

export const WORDS_FROG_OPTIONS = [
  { id: "frog_classic", label: "Frogo Classic", allowAccessories: true },
  { id: "frog_dark", label: "Frogo Noturno", allowAccessories: true },
  { id: "frog_sage", label: "Sábio Sage", allowAccessories: false },
  { id: "frog_cyber", label: "Cyber Frog", allowAccessories: true },
  { id: "frog_kiara", label: "Kiara", allowAccessories: true },
  { id: "frog_aurora", label: "Aurora", allowAccessories: true },
  { id: "frog_toxic", label: "Tóxico Neon", allowAccessories: false },
  { id: "frog_moon", label: "Moonlight", allowAccessories: true },
  { id: "frog_solar", label: "Solar", allowAccessories: true },
  { id: "frog_pixel", label: "Pixel", allowAccessories: true },
  { id: "frog_crystal", label: "Crystal", allowAccessories: false },
  { id: "frog_blaze", label: "Blaze", allowAccessories: true },
  { id: "frog_bloom", label: "Bloom", allowAccessories: true },
  { id: "frog_spectrum", label: "Spectrum", allowAccessories: true },
  { id: "frog_frost", label: "Frost", allowAccessories: true },
  { id: "frog_coral", label: "Coral", allowAccessories: true },
  { id: "frog_shadow", label: "Shadow", allowAccessories: true },
  { id: "frog_tropic", label: "Tropic", allowAccessories: true },
  { id: "frog_plasma", label: "Plasma", allowAccessories: false },
  { id: "frog_galaxy", label: "Galaxy", allowAccessories: true },
] as const satisfies readonly WordsAvatarFrogOption[];

export const WORDS_HAT_OPTIONS = [
  { id: "hat_01", label: "Boné Vermelho" },
  { id: "hat_02", label: "Chapéu Azul" },
  { id: "hat_03", label: "Coroa Dourada" },
  { id: "hat_04", label: "Boina Verde" },
  { id: "hat_05", label: "Elmo Viking" },
  { id: "hat_06", label: "Tiara Cósmica" },
  { id: "hat_07", label: "Capuz Pixelado" },
  { id: "hat_08", label: "Cartola Clássica" },
  { id: "hat_09", label: "Chapéu de Palha" },
  { id: "hat_10", label: "Capacete Futurista" },
  { id: "hat_11", label: "Tiara de Flores" },
  { id: "hat_12", label: "Boné Retrô" },
  { id: "hat_13", label: "Elmo Samurai" },
  { id: "hat_14", label: "Gorro Neon" },
  { id: "hat_15", label: "Capuz Rebel" },
  { id: "hat_16", label: "Coroa Prateada" },
  { id: "hat_17", label: "Tiara Lunar" },
  { id: "hat_18", label: "Chapéu Cowboy" },
  { id: "hat_19", label: "Boné Street" },
  { id: "hat_20", label: "Capacete Racing" },
] as const satisfies readonly WordsAvatarAccessoryOption[];

export const WORDS_BODY_OPTIONS = [
  { id: "body_01", label: "Jaqueta Denim" },
  { id: "body_02", label: "Moletom Verde" },
  { id: "body_03", label: "Colete Galáctico" },
  { id: "body_04", label: "Capa Solar" },
  { id: "body_05", label: "Armadura Neon" },
  { id: "body_06", label: "Camisa Retrô" },
  { id: "body_07", label: "Macacão Futuro" },
  { id: "body_08", label: "Colete Pixel" },
  { id: "body_09", label: "Jaqueta Tropical" },
  { id: "body_10", label: "Kimono Sakura" },
  { id: "body_11", label: "Colete Viking" },
  { id: "body_12", label: "Moletom Noturno" },
  { id: "body_13", label: "Armadura Samurai" },
  { id: "body_14", label: "Capa Lunar" },
  { id: "body_15", label: "Jaqueta Street" },
  { id: "body_16", label: "Colete Racing" },
  { id: "body_17", label: "Camisa Coral" },
  { id: "body_18", label: "Jaqueta Plasma" },
  { id: "body_19", label: "Moletom Shadow" },
  { id: "body_20", label: "Colete Aurora" },
] as const satisfies readonly WordsAvatarAccessoryOption[];

export const WORDS_BACKGROUND_OPTIONS = [
  { id: "bg_forest", label: "Floresta" },
  { id: "bg_ocean", label: "Oceano" },
  { id: "bg_night", label: "Noite Estrelada" },
  { id: "bg_city", label: "Cidade Neon" },
  { id: "bg_sunset", label: "Pôr do Sol" },
  { id: "bg_space", label: "Espaço" },
  { id: "bg_desert", label: "Deserto" },
  { id: "bg_mountain", label: "Montanhas" },
  { id: "bg_rainbow", label: "Arco-íris" },
  { id: "bg_studio", label: "Estúdio Retro" },
  { id: "bg_arcade", label: "Arcade" },
  { id: "bg_galaxy", label: "Galáxia" },
  { id: "bg_library", label: "Biblioteca" },
  { id: "bg_garden", label: "Jardim" },
  { id: "bg_tropical", label: "Praia Tropical" },
  { id: "bg_cyber", label: "Cyber Grid" },
  { id: "bg_lava", label: "Vulcão" },
  { id: "bg_aurora", label: "Aurora Boreal" },
  { id: "bg_coral", label: "Recife de Coral" },
  { id: "bg_cloud", label: "Entre Nuvens" },
] as const satisfies readonly WordsAvatarAccessoryOption[];

export const DEFAULT_AVATAR: WordsAvatarConfig = {
  frogType: WORDS_FROG_OPTIONS[0].id,
  hat: null,
  body: null,
  background: null,
};
