import { Pagination, PaginationResolver } from "@discordx/pagination";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { PAGINATION_DEFAULT_OPTIONS } from "../data/constants";
import Database from "../database";
import { CharacterSheet, CharacterSheetType, royalCharacterSchema } from "../schemas/characterSheetSchema";
import { resourcesSchema } from "../schemas/resourceSchema";
import Utils from "../utils";

export const characterDetailsButtonIdPrefix = "character-details";
export const getCharacterDetailsButtonId = (userId: string, characterId: string) => `${characterDetailsButtonIdPrefix}-${userId}-${characterId}`;
@Discord()
export default class Character {
  public static getCharacterDetailsButton(userId: string, characterId: string) {
    return new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setCustomId(getCharacterDetailsButtonId(userId, characterId)).setLabel("Detalhes").setStyle(ButtonStyle.Primary),
    );
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
    embed.addFields([
      { name: "🏷️ Profissão", value: sheet.profession, inline: true },
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
      const [userId, characterId] = buttonInteraction.customId.split("-").slice(2);

      const sheet = isStoreSheet ? await Database.getStoreSheet(characterId) : await Database.getSheet(userId, characterId);

      const embed = new EmbedBuilder().setColor(Colors.Blurple);

      const royalSheet = royalCharacterSchema.safeParse(sheet);
      if (royalSheet.success) {
        embed.setDescription(`# História \n${royalSheet.data.backstory}\n# Dádiva / Transformação \n${royalSheet.data.transformation}`);
      } else {
        embed.setDescription(`# História \n${sheet?.backstory}`);
      }
      await buttonInteraction.editReply({ embeds: [embed] });
    }
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
    const formatSheetListString = (sheet: CharacterSheet, isCurrentPage: boolean) => {
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
}
