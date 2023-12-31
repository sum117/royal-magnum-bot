import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { ApplicationCommandOptions, SlashOptionOptions } from "discordx";
import Database from "../database";

type CommandData = Record<string, ApplicationCommandOptions<Lowercase<string>, string>>;
type CommandOptionData = Record<string, SlashOptionOptions<Lowercase<string>, string>>;

export const COMMANDS: CommandData = {
  createChannel: { name: "create-channel", description: "Cria um canal no servidor ou na categoria da sua familia." },
  spawnSheet: {
    name: "spawn-sheet",
    description: "Cria um componente de criação de ficha",
    defaultMemberPermissions: [PermissionFlagsBits.Administrator]
  },
  characterList: { name: "character-list", description: "Lista as fichas de um usuário" },
  setCharacter: { name: "set-character", description: "Define uma ficha como ativa" },
  showFamilyDetails: { name: "show-family-details", description: "Mostra os detalhes de uma família" },
  addStoreCharacter: {
    name: "add-store-character",
    description: "Adiciona uma ficha à loja",
    defaultMemberPermissions: [PermissionFlagsBits.Administrator]
  },
  giveRoyalToken: {
    name: "give-royal-token",
    description: "Dá uma ficha real a um usuário",
    defaultMemberPermissions: [PermissionFlagsBits.Administrator]
  },
  changePicture: {
    name: "change-picture",
    description: "Muda a imagem do bot e do servidor ao mesmo tempo.",
    defaultMemberPermissions: [PermissionFlagsBits.Administrator]
  },
  avatar: { name: "avatar", description: "Inspeciona o avatar de um usuário" },
  serverInfo: { name: "server-info", description: "Mostra informações do servidor" },
  addEmoji: {
    name: "add-emoji",
    description: "Adiciona um emoji ao servidor",
    defaultMemberPermissions: [PermissionFlagsBits.Administrator]
  },
  giveFamilyToken: {
    name: "give-family-token",
    description: "Dá uma ficha de família a um usuário",
    defaultMemberPermissions: [PermissionFlagsBits.Administrator]
  }
} as const;

export const COMMAND_OPTIONS: CommandOptionData = {
  giveFamilyTokenUser: {
    name: "user",
    description: "Usuário para dar a ficha de família",
    required: true,
    type: ApplicationCommandOptionType.User
  },
  addEmojiName: {
    name: "name",
    description: "Nome do emoji",
    required: true,
    type: ApplicationCommandOptionType.String
  },
  addEmojiAttachment: {
    name: "attachment",
    description: "Arquivo para adicionar como emoji",
    required: true,
    type: ApplicationCommandOptionType.Attachment
  },
  avatarTarget: {
    name: "target",
    description: "Usuário para inspecionar o avatar",
    required: true,
    type: ApplicationCommandOptionType.User
  },
  changePictureURL: {
    name: "url",
    description: "URL da imagem",
    required: true,
    type: ApplicationCommandOptionType.String
  },
  giveRoyalTokenUser: {
    name: "user",
    description: "Usuário para dar a ficha real",
    required: true,
    type: ApplicationCommandOptionType.User
  },
  setCharacter: {
    name: "character",
    description: "Ficha para definir como ativa",
    required: true,
    type: ApplicationCommandOptionType.String,
    autocomplete: async (interaction) => {
      const userSheets = await Database.getUserSheetsByName(interaction.user.id, interaction.options.getFocused());
      await interaction.respond(userSheets.map((sheet) => ({ name: sheet.name, value: sheet.characterId })));
    }
  },
  showFamilyDetails: {
    name: "family",
    description: "Família para mostrar os detalhes",
    required: true,
    type: ApplicationCommandOptionType.String,
    autocomplete: async (interaction) => {
      const families = await Database.getFamilies();
      await interaction.respond(families.map((family) => ({ name: family.title, value: family.slug })));
    }
  },
  addStoreCharacterFamily: {
    name: "family",
    description: "Família da ficha",
    required: true,
    type: ApplicationCommandOptionType.String,
    autocomplete: async (interaction) => {
      const families = await Database.getFamilies();
      await interaction.respond(families.map((family) => ({ name: family.title, value: family.slug })));
    }
  },
  addStoreCharacterPrice: {
    name: "price",
    description: "Preço da ficha",
    required: true,
    type: ApplicationCommandOptionType.Integer
  },
  addStoreCharacterImageURL: {
    name: "image-url",
    description: "URL da imagem da ficha",
    required: false,
    type: ApplicationCommandOptionType.String
  },
  characterList: {
    name: "user",
    description: "Usuário para listar as fichas",
    required: true,
    type: ApplicationCommandOptionType.User
  },
  createChannelChannel: {
    name: "channel",
    description: "Canal para criar o canal",
    required: true,
    type: ApplicationCommandOptionType.Channel
  },
  createChannelName: {
    name: "name",
    description: "Nome do canal",
    required: true,
    type: ApplicationCommandOptionType.String
  },
  createChannelDescription: {
    name: "description",
    description: "Descrição do canal",
    required: true,
    type: ApplicationCommandOptionType.String
  },
  createChannelImage: {
    name: "image-url",
    description: "URL da imagem do canal",
    required: true,
    type: ApplicationCommandOptionType.Attachment
  },
  createChannelType: {
    name: "type",
    description: "Tipo do canal",
    required: false,
    type: ApplicationCommandOptionType.String,
    autocomplete(interaction) {
      const options = [
        { name: "Básico", value: "basic" },
        { name: "Mercado", value: "market" },
        { name: "Taberna", value: "tavern" },
        { name: "Treino", value: "training" },
        { name: "Ferreiro", value: "blacksmith" },
        { name: "Quartel", value: "barracks" },
        { name: "Real", value: "royal" }
      ];
      return interaction.respond(options);
    }
  },
  createChannelResourceType: {
    name: "resource-type",
    description: "Tipo de recurso",
    required: false,
    type: ApplicationCommandOptionType.String,
    autocomplete(interaction) {
      const options = [
        { name: "Madeira", value: "wood" },
        { name: "Pedra", value: "stone" },
        { name: "Ferro", value: "iron" },
        { name: "Comida", value: "food" },
        { name: "Ouro", value: "gold" }
      ];
      return interaction.respond(options);
    }
  },
  createChannelEfficiency: {
    name: "efficiency",
    description: "Eficiência do canal",
    required: false,
    type: ApplicationCommandOptionType.Integer
  }
} as const;
