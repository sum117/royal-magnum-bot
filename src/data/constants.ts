import { PaginationType } from "@discordx/pagination";
import { ButtonStyle } from "discord.js";
import { Duration } from "luxon";

export const CHANNEL_IDS = {
  sheetWaitingRoom: "1189003168273674281",
  approvedSheetRoom: "1189023345669316608",
  characterStore: "1189378489862848633",
  familiesChannel: "1188557191280595085",
  announcementsChannel: "1189379467009855569",
} as const;

export const ROLE_IDS = {
  storeCharacterAnnouncements: "1189380530999930990",
};

export const RESOURCES_EMOJIS = {
  wood: "🪵",
  stone: "🪨",
  iron: "⛏️",
  food: "🍞",
  gold: "💰",
} as const;

export const RESOURCES_TRANSLATIONS = {
  wood: "Madeira",
  stone: "Pedra",
  iron: "Ferro",
  food: "Comida",
  gold: "Ouro",
} as const;

export const PROFESSIONS_TRANSLATIONS = {
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
} as const;

export const PROFESSIONS_PRONOUNS_TRANSLATIONS = {
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

export const CHANNEL_TYPES_TRANSLATIONS = {
  basic: "Básico",
  tavern: "Taberna",
  barracks: "Quartel",
  blacksmith: "Ferreiro",
  market: "Mercado",
  training: "Treinamento",
  royal: "Real",
} as const;
export const GENDER_TRANSLATIONS_MAP = {
  male: "Masculino",
  female: "Feminino",
};
export const CRON_EXPRESSIONS = {
  EveryFourHours: "0 */4 * * *",
};

export const ATTACHMENT_ICON_URL = "https://i.imgur.com/VL4nI3f.png";

export const PAGINATION_DEFAULT_OPTIONS = {
  type: PaginationType.Button,
  time: Duration.fromObject({ minutes: 10 }).as("milliseconds"),
  previous: { style: ButtonStyle.Primary, label: "Anterior", emoji: { name: "⬅️" } },
  next: { style: ButtonStyle.Primary, label: "Próximo", emoji: { name: "➡️" } },
  start: { style: ButtonStyle.Primary, label: "Início", emoji: { name: "⏪" } },
  end: { style: ButtonStyle.Primary, label: "Fim", emoji: { name: "⏩" } },
};
