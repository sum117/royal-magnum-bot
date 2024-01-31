import { PaginationType } from "@discordx/pagination";
import { ButtonStyle } from "discord.js";
import { Duration } from "luxon";
import { ChannelType, Profession } from "../schemas/enums";
import { ResourceType } from "../schemas/resourceSchema";

export const CHANNEL_IDS = {
  sheetWaitingRoom: "1189003168273674281",
  approvedSheetRoom: "1189023345669316608",
  characterStore: "1189378489862848633",
  generalStore: "1196400429878218833",
  familiesChannel: "1188557191280595085",
  announcementsChannel: "1189379467009855569",
  tutorialChannel: "1191551254908911676",
  askRoleplayChannel: "1197482727105105921",
  logChannel: "1202334869825261588",
  questionsChannel: "1189604243766788126",
} as const;

export const CATEGORY_IDS = {
  contentCategory: "1189365484748013579",
} as const;

export const ROLE_IDS = {
  storeCharacterAnnouncements: "1189380530999930990",
  member: "1197876266221715466",
  admin: "1187880364723687485",
  mentor: "1202336988800491613",
  pupil: "1202330746329501706",
} as const;

export const PROFESSION_CHANNELS: Record<ChannelType, Profession[]> = {
  royal: ["royal"],
  blacksmith: ["blacksmith"],
  market: ["merchant", "alchemist", "cook", "tailor", "mercenary"],
  barracks: ["soldier", "guard", "squire", "knight", "blacksmith", "mercenary"],
  training: ["soldier", "guard", "squire", "knight", "blacksmith", "mercenary"],
  tavern: ["musician", "writer", "courtier", "mercenary"],
  basic: ["farmer", "hunter", "fisherman", "miner", "lumberjack", "sailor", "mercenary"],
  clergy: ["priest", "doctor", "librarian"],
  health: ["doctor", "courtier"],
} as const;

export const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"] as const;

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
  mercenary: "Mercenário(a)",
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

export const ORGANIZATION_TRANSLATIONS: Record<string, string> = {
  vagabonds: "Vagabundos",
  hunters: "Caçadores de Dádivas",
  pagans: "Pagãos",
  resistance: "Resistência do Reino Central",
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
  mercenary: { male: "Carpinteiro", female: "Carpinteira" },
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
} as const;
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

export const ATTACHMENT_ICON_URL = "https://ik.imagekit.io/ez2m5kovtw/static_assets/attachment_icon_U867pKdxq.png" as const;
export const BASE_ITEM_IMAGE_URL = "https://ik.imagekit.io/ez2m5kovtw/static_assets/base_item_lVIZu2qyQ.png" as const;
export const SERVER_BANNER_URL = "https://ik.imagekit.io/ez2m5kovtw/static_assets/Royal_Magnum_7diXjysJd.png" as const;

export const PAGINATION_DEFAULT_OPTIONS = {
  type: PaginationType.Button,
  time: Duration.fromObject({ minutes: 10 }).as("milliseconds"),
  previous: { style: ButtonStyle.Primary, label: "Anterior", emoji: { name: "⬅️" } },
  next: { style: ButtonStyle.Primary, label: "Próximo", emoji: { name: "➡️" } },
  start: { style: ButtonStyle.Primary, label: "Início", emoji: { name: "⏪" } },
  end: { style: ButtonStyle.Primary, label: "Fim", emoji: { name: "⏩" } },
} as const;
export const ROLEPLAY_TYPE_TRANSLATION_MAP = {
  romance: "Romance",
  adventure: "Aventura",
  horror: "Terror",
  comedy: "Comédia",
  action: "Ação",
  drama: "Drama",
} as const;
