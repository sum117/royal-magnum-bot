import { PaginationType } from "@discordx/pagination";
import { ButtonStyle } from "discord.js";
import { Duration } from "luxon";
import { ChannelType } from "../schemas/channelSchema";
import { Profession } from "../schemas/characterSheetSchema";
import { ResourceType } from "../schemas/resourceSchema";

export const CHANNEL_IDS = {
  sheetWaitingRoom: "1189003168273674281",
  approvedSheetRoom: "1189023345669316608",
  characterStore: "1189378489862848633",
  familiesChannel: "1188557191280595085",
  announcementsChannel: "1189379467009855569",
  tutorialChannel: "1191551254908911676",
} as const;

export const CATEGORY_IDS = {
  contentCategory: "1189365484748013579",
} as const;

export const ROLE_IDS = {
  storeCharacterAnnouncements: "1189380530999930990",
} as const;

export const PROFESSION_CHANNELS: Record<ChannelType, Profession[]> = {
  royal: ["royal"],
  blacksmith: ["blacksmith"],
  market: ["merchant", "alchemist", "cook", "tailor", "carpenter"],
  barracks: ["soldier", "guard", "squire", "knight", "blacksmith"],
  training: ["soldier", "guard", "squire", "knight", "blacksmith"],
  tavern: ["musician", "writer", "courtier"],
  basic: ["farmer", "hunter", "fisherman", "miner", "lumberjack", "sailor"],
  clergy: ["priest", "doctor", "librarian"],
  health: ["doctor"],
} as const;

export const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export const RESOURCES_EMOJIS: Record<ResourceType, string> = {
  wood: "🪵",
  stone: "🪨",
  iron: "⛏️",
  food: "🍞",
  gold: "💰",
} as const;

export const RESOURCES_TRANSLATIONS: Record<ResourceType, string> = {
  wood: "Madeira",
  stone: "Pedra",
  iron: "Ferro",
  food: "Comida",
  gold: "Ouro",
} as const;

export const PROFESSIONS_TRANSLATIONS: Record<Profession, string> = {
  other: "Outro",
  blacksmith: "Ferreiro(a)",
  merchant: "Mercador(a)",
  farmer: "Fazendeiro(a)",
  hunter: "Caçador(a)",
  fisherman: "Pescador(a)",
  miner: "Mineiro(a)",
  lumberjack: "Lenhador(a)",
  alchemist: "Alquimista",
  cook: "Cozinheiro(a)",
  tailor: "Costureiro(a)",
  carpenter: "Carpinteiro(a)",
  librarian: "Bibliotecário(a)",
  musician: "Músico(a)",
  writer: "Escrivã(o)",
  priest: "Sacerdote",
  doctor: "Médico(a)",
  sailor: "Marinheiro(a)",
  soldier: "Soldado",
  guard: "Guarda",
  servant: "Servo(a)",
  slave: "Escravo(a)",
  knight: "Cavaleiro(a)",
  squire: "Escudeiro(a)",
  courtier: "Cortesã(o)",
  royal: "Nobre",
} as const;

export const PROFESSIONS_PRONOUNS_TRANSLATIONS: Record<Profession, { male: string; female: string }> = {
  royal: { male: "Principe", female: "Princesa" },
  other: { male: "Camponês", female: "Camponesa" },
  blacksmith: { male: "Ferreiro", female: "Ferreira" },
  merchant: { male: "Mercador", female: "Mercadora" },
  farmer: { male: "Fazendeiro", female: "Fazendeira" },
  hunter: { male: "Caçador", female: "Caçadora" },
  fisherman: { male: "Pescador", female: "Pescadora" },
  miner: { male: "Mineiro", female: "Mineira" },
  lumberjack: { male: "Lenhador", female: "Lenhadora" },
  alchemist: { male: "Alquimista", female: "Alquimista" },
  cook: { male: "Cozinheiro", female: "Cozinheira" },
  tailor: { male: "Costureiro", female: "Costureira" },
  carpenter: { male: "Carpinteiro", female: "Carpinteira" },
  librarian: { male: "Bibliotecário", female: "Bibliotecária" },
  musician: { male: "Músico", female: "Música" },
  writer: { male: "Escrivão", female: "Escrivã" },
  priest: { male: "Sacerdote", female: "Sacerdotisa" },
  doctor: { male: "Médico", female: "Médica" },
  sailor: { male: "Marinheiro", female: "Marinheira" },
  soldier: { male: "Soldado", female: "Soldada" },
  guard: { male: "Guarda", female: "Guarda" },
  servant: { male: "Servo", female: "Serva" },
  slave: { male: "Escravo", female: "Escrava" },
  knight: { male: "Cavaleiro", female: "Cavaleira" },
  squire: { male: "Escudeiro", female: "Escudeira" },
  courtier: { male: "Cortesão", female: "Cortesã" },
} as const;

export const CHANNEL_TYPES_TRANSLATIONS: Record<ChannelType, string> = {
  basic: "Básico",
  tavern: "Taberna",
  barracks: "Quartel",
  blacksmith: "Ferreiro",
  market: "Mercado",
  training: "Treinamento",
  royal: "Real",
  clergy: "Clero",
  health: "Saúde",
} as const;

export const EQUIPMENT_STATS_TRANSLATIONS: Record<string, string> = {
  attack: "Ataque",
  defense: "Defesa",
  health: "Vida",
  speed: "Velocidade",
  range: "Alcance",
} as const;

export const CONSUMABLE_STATS_TRANSLATIONS: Record<string, string> = {
  hunger: "Fome",
  thirst: "Sede",
  health: "Vida",
  stamina: "Energia",
  duration: "Duração",
};
export const GENDER_TRANSLATIONS_MAP = {
  male: "Masculino",
  female: "Feminino",
} as const;

export const ITEM_STAT_RANGES = {
  common: { min: 1, max: 5 },
  uncommon: { min: 6, max: 10 },
  rare: { min: 11, max: 15 },
  epic: { min: 16, max: 20 },
  legendary: { min: 21, max: 25 },
} as const;

export const RARITY_COLORS = {
  common: "#ffffff",
  uncommon: "#00ff00",
  rare: "#0000ff",
  epic: "#ff00ff",
  legendary: "#ffff00",
} as const;

export const DISCORD_AUTOCOMPLETE_LIMIT = 25 as const;
export const CRON_EXPRESSIONS = {
  EveryFourHours: "0 */4 * * *",
} as const;

export const ATTACHMENT_ICON_URL = "https://i.imgur.com/VL4nI3f.png" as const;
export const BASE_ITEM_IMAGE_URL = "https://i.imgur.com/YkGY5Mm.png" as const;

export const PAGINATION_DEFAULT_OPTIONS = {
  type: PaginationType.Button,
  time: Duration.fromObject({ minutes: 10 }).as("milliseconds"),
  previous: { style: ButtonStyle.Primary, label: "Anterior", emoji: { name: "⬅️" } },
  next: { style: ButtonStyle.Primary, label: "Próximo", emoji: { name: "➡️" } },
  start: { style: ButtonStyle.Primary, label: "Início", emoji: { name: "⏪" } },
  end: { style: ButtonStyle.Primary, label: "Fim", emoji: { name: "⏩" } },
} as const;
