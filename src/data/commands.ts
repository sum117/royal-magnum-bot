import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { ApplicationCommandOptions, SlashOptionOptions } from "discordx";
import Database from "../database";

type CommandData = Record<string, ApplicationCommandOptions<Lowercase<string>, string>>;
type CommandOptionData = Record<string, SlashOptionOptions<Lowercase<string>, string>>;

export const COMMANDS: CommandData = {
  spawnSheet: { name: "spawn-sheet", description: "Cria um componente de criação de ficha", defaultMemberPermissions: [PermissionFlagsBits.Administrator] },
  characterList: { name: "character-list", description: "Lista as fichas de um usuário" },
  setCharacter: { name: "set-character", description: "Define uma ficha como ativa" },
  addStoreCharacter: { name: "add-store-character", description: "Adiciona uma ficha à loja", defaultMemberPermissions: [PermissionFlagsBits.Administrator] },
  giveRoyalToken: { name: "give-royal-token", description: "Dá uma ficha real a um usuário", defaultMemberPermissions: [PermissionFlagsBits.Administrator] },
} as const;

export const COMMAND_OPTIONS: CommandOptionData = {
  giveRoyalTokenUser: { name: "user", description: "Usuário para dar a ficha real", required: true, type: ApplicationCommandOptionType.User },
  setCharacter: {
    name: "character",
    description: "Ficha para definir como ativa",
    required: true,
    type: ApplicationCommandOptionType.String,
    autocomplete: async (interaction) => {
      const userSheets = await Database.getUserSheetsByName(interaction.user.id, interaction.options.getFocused());
      await interaction.respond(userSheets.map((sheet) => ({ name: sheet.name, value: sheet.characterId })));
    },
  },
  addStoreCharacterFamily: {
    name: "family",
    description: "Família da ficha",
    required: true,
    type: ApplicationCommandOptionType.String,
    autocomplete: async (interaction) => {
      const families = await Database.getFamilies();
      await interaction.respond(families.map((family) => ({ name: family.title, value: family.slug })));
    },
  },
  addStoreCharacterPrice: { name: "price", description: "Preço da ficha", required: true, type: ApplicationCommandOptionType.Integer },
  addStoreCharacterImageURL: { name: "image-url", description: "URL da imagem da ficha", required: false, type: ApplicationCommandOptionType.String },
  characterList: { name: "user", description: "Usuário para listar as fichas", required: true, type: ApplicationCommandOptionType.User },
} as const;
