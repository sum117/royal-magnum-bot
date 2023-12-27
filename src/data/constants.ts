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

export const ATTACHMENT_ICON_URL = "https://i.imgur.com/VL4nI3f.png";

export const PAGINATION_DEFAULT_OPTIONS = {
  type: PaginationType.Button,
  time: Duration.fromObject({ minutes: 10 }).as("milliseconds"),
  previous: { style: ButtonStyle.Primary, label: "Anterior", emoji: { name: "⬅️" } },
  next: { style: ButtonStyle.Primary, label: "Próximo", emoji: { name: "➡️" } },
  start: { style: ButtonStyle.Primary, label: "Início", emoji: { name: "⏪" } },
  end: { style: ButtonStyle.Primary, label: "Fim", emoji: { name: "⏩" } },
};
