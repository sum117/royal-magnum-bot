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
export const CHANNEL_TYPES_TRANSLATIONS = {
  basic: "Básico",
  tavern: "Taberna",
  barracks: "Quartel",
  blacksmith: "Ferreiro",
  market: "Mercado",
  training: "Treinamento",
  royal: "Real",
} as const;

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
