import { Pagination, PaginationResolver } from "@discordx/pagination";
import {
  ActionRowBuilder,
  Attachment,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  GuildMember,
  Message,
  bold,
  channelMention,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { ConfirmationPrompt } from "../components/ConfirmationPrompt";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { ORGANIZATION_TRANSLATIONS, PAGINATION_DEFAULT_OPTIONS, PROFESSIONS_PRONOUNS_TRANSLATIONS } from "../data/constants";
import Database from "../database";
import { CharacterSheetType, characterTypeSchema, royalCharacterSchema, storeCharacterSheetSchema } from "../schemas/characterSheetSchema";
import { resourcesSchema } from "../schemas/resourceSchema";
import Utils from "../utils";

export const characterDetailsButtonIdPrefix = "character_details";
export const getCharacterDetailsButtonId = (userId: string, characterId: string, preview: boolean = false, isStoreSheet = true) =>
  `${characterDetailsButtonIdPrefix}-${userId}-${characterId}-${preview ? "true" : "false"}-${isStoreSheet ? "store" : "user"}`;
@Discord()
export default class Character {
  public static getCharacterDetailsButton(userId: string, characterId: string, label?: string, preview?: boolean, isStoreSheet = true) {
    return new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(getCharacterDetailsButtonId(userId, characterId, preview, isStoreSheet))
        .setLabel(label ?? "Detalhes")
        .setStyle(ButtonStyle.Primary),
    );
  }

  public static async getCharacterRPEmbed(message: Message, character: CharacterSheetType) {
    const embed = new EmbedBuilder().setTimestamp().setThumbnail(character.imageUrl).setColor(Colors.Blurple).setDescription(message.content);
    const professionPronoun = PROFESSIONS_PRONOUNS_TRANSLATIONS[character.profession][character.gender];

    embed.setTitle(`${professionPronoun} ${character.name}`);

    const originData = (await Utils.fetchOrigins()).find((origin) => origin.id === character.origin);
    if (originData) {
      embed.setAuthor({ name: `${originData?.name}` });
    }

    const royalCharacter = royalCharacterSchema.safeParse(character);
    if (royalCharacter.success) {
      const family = await Database.getFamily(royalCharacter.data.familySlug);
      embed.setTitle(`${royalCharacter.data.royalTitle} ${royalCharacter.data.name}`);
      embed.setAuthor({ name: family?.title ?? "Família não encontrada" });
    }

    return embed;
  }

  public static async getCharacterPreviewEmbed(sheet: CharacterSheetType) {
    const embed = new EmbedBuilder();
    const royalSheet = royalCharacterSchema.safeParse(sheet);
    if (royalSheet.success) {
      const family = await Database.getFamily(royalSheet.data.familySlug);
      embed.setTitle(`${royalSheet.data.royalTitle} ${royalSheet.data.name} de ${family?.title}`);
    } else {
      embed.setTitle(sheet.name);
    }
    const { progressBar } = Character.getCharacterLevelDetails(sheet);

    embed.setImage(sheet.imageUrl);
    embed.setColor(Colors.Blurple);
    const professionPronoun = PROFESSIONS_PRONOUNS_TRANSLATIONS[sheet.profession][sheet.gender];

    const originData = (await Utils.fetchOrigins()).find((origin) => origin.id === sheet.origin);
    if (originData) {
      embed.addFields([{ name: "🌎 Origem", value: `${channelMention(originData.channelId)}\n${bold(originData.name)}`, inline: true }]);
      if (originData.organization) {
        embed.addFields([{ name: "👥 Organização", value: ORGANIZATION_TRANSLATIONS[originData.organization], inline: true }]);
      }
    }

    embed.addFields([
      { name: "🏷️ Profissão", value: professionPronoun, inline: true },
      { name: "📜 Nível", value: `${sheet.level}`, inline: true },
      { name: "📖 Progresso de Nivelação", value: progressBar, inline: true },
    ]);
    return embed;
  }

  public static getCharacterLevelDetails({ level, xp }: { level: number; xp: number }) {
    const MAX_LEVEL = 100;
    const LEVEL_QUOTIENT = 1.3735;

    const expRequiredForNextLevel = Math.floor(Math.pow(level, LEVEL_QUOTIENT));
    const percentage = Math.floor((xp / expRequiredForNextLevel) * 100);

    const filledBar = "🟩";
    const emptyBar = "⬛";
    const barLength = 10;
    const barFill = Math.floor((percentage / 100) * barLength);
    const barEmpty = barLength - barFill;
    return {
      progressBar: `${filledBar.repeat(barFill)}${emptyBar.repeat(barEmpty)} ${percentage}%`,
      expRequiredForNextLevel,
      willLevelUp: (xp: number) => xp >= expRequiredForNextLevel && level < MAX_LEVEL,
    };
  }

  public static async handleCharacterDetailsButton(buttonInteraction: ButtonInteraction, isStoreSheet: boolean = false) {
    if (buttonInteraction.customId.startsWith(characterDetailsButtonIdPrefix)) {
      await buttonInteraction.deferReply({ ephemeral: true });
      const [userId, characterId, preview] = buttonInteraction.customId.split("-").slice(1);

      const sheet = isStoreSheet ? await Database.getStoreSheet(characterId) : await Database.getSheet(userId, characterId);

      const embed = new EmbedBuilder().setColor(Colors.Blurple);

      const royalSheet = royalCharacterSchema.safeParse(sheet);
      const storeSheet = storeCharacterSheetSchema.safeParse(sheet);
      const regularSheetParse = characterTypeSchema.safeParse(sheet);
      if (isStoreSheet && storeSheet.success) {
        embed.setDescription(`# História \n${storeSheet.data.backstory}\n# Dádiva / Transformação \n${storeSheet.data.transformation}`);
      } else if (royalSheet.success) {
        embed.setDescription(`# História \n${royalSheet.data.backstory}\n# Dádiva / Transformação \n${royalSheet.data.transformation}`);
      } else {
        embed.setDescription(`# História \n${sheet?.backstory}`);
      }
      const messageOptions = { embeds: [embed] };
      if (preview === "true" && regularSheetParse.success) {
        const previewEmbed = await Character.getCharacterPreviewEmbed(regularSheetParse.data);
        messageOptions.embeds = [previewEmbed];
      }
      await buttonInteraction.editReply(messageOptions);
    }
  }

  @Slash(COMMANDS.setNoEmbedRoleplay)
  public async setNoEmbedRoleplay(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const user = await Database.getUser(interaction.user.id);
    await Database.updateUser(interaction.user.id, { doesNotUseEmbed: !user.doesNotUseEmbed });
    await interaction.editReply({ content: `Modo de roleplay sem embed ${user.doesNotUseEmbed ? "ativado" : "desativado"}.` });
  }

  @Slash(COMMANDS.characterList)
  public async characterList(@SlashOption(COMMAND_OPTIONS.characterList) user: GuildMember, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sheets = await Database.getSheets(user.id);
    if (!sheets.length) {
      await interaction.editReply({ content: "Este usuário não possui fichas." });
      return;
    }
    const randomColor = lodash.sample(Object.values(Colors));
    const formatSheetListString = (sheet: CharacterSheetType, isCurrentPage: boolean) => {
      const isActive = sheet.isActive ? "✅" : "";
      return `${isActive} ${isCurrentPage ? bold(sheet.name) : sheet.name}`;
    };

    const generatePages = new PaginationResolver(async (page) => {
      const pages = [];
      for (const sheet of sheets) {
        const embed = await Character.getCharacterPreviewEmbed(sheet);
        embed.setAuthor({
          name: `Fichas de ${user.displayName}`,
          iconURL: user.user.avatarURL({ forceStatic: true }) ?? undefined,
        });
        embed.setDescription(sheets.map((sheet, index) => formatSheetListString(sheet, index === page)).join("\n"));
        embed.setColor(randomColor ?? Colors.Blurple);
        pages.push({
          embeds: [embed],
          components: [Character.getCharacterDetailsButton(user.id, sheet.characterId)],
        });
      }
      return pages[page];
    }, sheets.length);

    const pagination = new Pagination(interaction, generatePages, PAGINATION_DEFAULT_OPTIONS);
    const paginationMessage = await pagination.send();

    paginationMessage.collector.on("collect", Character.handleCharacterDetailsButton);
  }

  @Slash(COMMANDS.setCharacter)
  public async setCharacter(@SlashOption(COMMAND_OPTIONS.setCharacter) characterId: string, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sheet = await Database.getSheet(interaction.user.id, characterId);
    if (!sheet) {
      await interaction.editReply({ content: "Ficha não encontrada no seu nome de usuário." });
      return;
    }
    await Database.setActiveSheet(interaction.user.id, characterId);
    await interaction.editReply({
      content: `${bold(sheet.name)} definida como personagem ativo(a).`,
      files: [{ name: `${lodash.kebabCase(sheet.name)}.jpg`, attachment: sheet.imageUrl }],
    });
  }

  @Slash(COMMANDS.deleteCharacter)
  public async deleteCharacter(@SlashOption(COMMAND_OPTIONS.deleteCharacterCharacter) characterId: string, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sheet = await Database.getSheet(interaction.user.id, characterId);
    if (!sheet) {
      await interaction.editReply({ content: "Ficha não encontrada no seu nome de usuário." });
      return;
    }

    const confirmationPrompt = new ConfirmationPrompt({ promptMessage: `Tem certeza que deseja deletar ${bold(sheet.name)}?` });
    const sentPrompt = await confirmationPrompt.send(interaction);
    sentPrompt.collector.on("collect", async (promptInteraction) => {
      await promptInteraction.deferUpdate();
      if (promptInteraction.customId === confirmationPrompt.confirmButtonId) {
        await Database.deleteSheet(interaction.user.id, characterId);
        await promptInteraction.editReply({ content: `Ficha ${bold(sheet.name)} deletada.` });

        const lostTokenTreshold = 20;
        if (sheet.level <= lostTokenTreshold && sheet.type === "royal") {
          const user = await Database.getUser(interaction.user.id);
          await Database.updateUser(interaction.user.id, { royalTokens: 1 + user.royalTokens });
          await promptInteraction.followUp({ content: `Você recebeu 1 token real de volta por deletar ${bold(sheet.name)}.` });
        }
      } else if (promptInteraction.customId === confirmationPrompt.cancelButtonId) {
        await promptInteraction.editReply({ content: "Operação cancelada." });
      }
    });

    await new Promise((resolve) => sentPrompt.collector.on("end", resolve));
    await interaction.editReply({ content: "Fim da interação." });
  }

  @Slash(COMMANDS.changeCharacterAvatar)
  public async changeCharacterAvatar(
    @SlashOption(COMMAND_OPTIONS.changeCharacterAvatarCharacter) characterId: string,
    @SlashOption(COMMAND_OPTIONS.changeCharacterAvatarAttachment) attachment: Attachment,
    interaction: ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: true });
    const sheet = await Database.getSheet(interaction.user.id, characterId);
    if (!sheet) {
      await interaction.editReply({ content: "Ficha não encontrada no seu nome de usuário." });
      return;
    }
    const imageUrl = await Utils.uploadToImageKit(attachment.url);
    await Database.updateSheet(interaction.user.id, characterId, { imageUrl });
    await interaction.editReply({ content: `Avatar de ${bold(sheet.name)} alterado.` });
  }

  @Slash(COMMANDS.showFamilyDetails)
  public async showFamilyDetails(@SlashOption(COMMAND_OPTIONS.showFamilyDetails) familySlug: string, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const family = await Database.getFamily(familySlug);
    if (!family) {
      await interaction.editReply({ content: "Família não encontrada." });
      return;
    }

    const resources = resourcesSchema.parse(family);

    const playersInFamily = lodash.shuffle(await Database.getSheetsByFamily(familySlug));

    const playerLimit = 10;
    const playerRest = Math.max(playersInFamily.length - playerLimit, 0);
    const playersString = playersInFamily
      .map((sheet) => `${sheet.royalTitle} ${sheet.name}`)
      .slice(0, playerLimit)
      .join("\n");

    const embed = new EmbedBuilder();
    embed.setTitle(family.title);
    embed.setThumbnail(family.image);
    embed.setColor(Colors.Blurple);
    embed.setDescription(
      `# Descrição\n${family.description}\n# Recursos\n${Utils.getResourcesString(resources)}\n# Jogadores\n${playersString} e mais ${bold(
        playerRest.toString(),
      )}.`,
    );
    embed.addFields([
      {
        name: "👥 População",
        value: `${family.population}/${family.populationCap} (${family.populationGrowth}/ano)`,
        inline: true,
      },
    ]);
    await interaction.editReply({ embeds: [embed] });
  }

  @Slash(COMMANDS.setCharacterProfession)
  public async setProfession(
    @SlashOption(COMMAND_OPTIONS.setProfessionUser) user: GuildMember,
    @SlashOption(COMMAND_OPTIONS.setProfessionProfession) profession: keyof typeof PROFESSIONS_PRONOUNS_TRANSLATIONS,
    interaction: ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const sheet = await Database.getActiveSheet(user.id);
    if (!sheet?.profession || sheet.profession === "royal") return;
    sheet.profession = profession;

    await Database.updateSheet(user.id, sheet.characterId, sheet);

    await interaction.editReply({ content: `Profissão de ${user.displayName} alterada para ${profession}.` });
  }
}
