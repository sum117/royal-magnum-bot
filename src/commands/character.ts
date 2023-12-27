import { Pagination, PaginationResolver } from "@discordx/pagination";
import { ChatInputCommandInteraction, Colors, GuildMember, bold } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { PAGINATION_DEFAULT_OPTIONS } from "../data/constants";
import Database from "../database";
import { CharacterSheet } from "../schemas/characterSheetSchema";
import Utils from "../utils";

export const characterDetailsButtonIdPrefix = "character-details";
export const getCharacterDetailsButtonId = (userId: string, characterId: string) => `${characterDetailsButtonIdPrefix}-${userId}-${characterId}`;
@Discord()
export default class Character {
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
        const embed = await Utils.getCharacterPreviewEmbed(sheet);
        embed.setAuthor({ name: `Fichas de ${user.displayName}`, iconURL: user.user.avatarURL({ forceStatic: true }) ?? undefined });
        embed.setDescription(sheets.map((sheet, index) => formatSheetListString(sheet, index === page)).join("\n"));
        embed.setColor(randomColor ?? Colors.Blurple);
        pages.push({
          embeds: [embed],
          components: [Utils.getCharacterDetailsButton(user.id, sheet.characterId)],
        });
      }
      return pages[page];
    }, sheets.length);

    const pagination = new Pagination(interaction, generatePages, PAGINATION_DEFAULT_OPTIONS);
    const paginationMessage = await pagination.send();

    paginationMessage.collector.on("collect", Utils.handleCharacterDetailsButton);
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
}
