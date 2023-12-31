import { Pagination, PaginationResolver } from "@discordx/pagination";
import { bold, ChatInputCommandInteraction, Colors, EmbedBuilder, GuildMember } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { PAGINATION_DEFAULT_OPTIONS, RESOURCES_EMOJIS, RESOURCES_TRANSLATIONS } from "../data/constants";
import Database from "../database";
import { CharacterSheet } from "../schemas/characterSheetSchema";
import { resourcesSchema } from "../schemas/resourceSchema";
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
        embed.setAuthor({
          name: `Fichas de ${user.displayName}`,
          iconURL: user.user.avatarURL({ forceStatic: true }) ?? undefined,
        });
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

  @Slash(COMMANDS.showFamilyDetails)
  public async showFamilyDetails(@SlashOption(COMMAND_OPTIONS.showFamilyDetails) familySlug: string, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const family = await Database.getFamily(familySlug);
    if (!family) {
      await interaction.editReply({ content: "Família não encontrada." });
      return;
    }

    const resources = resourcesSchema.parse(family);
    const resourcesString = Object.entries(resources)
      .map(([key, value]) => {
        type ResourceName = keyof typeof resources;
        const emoji = RESOURCES_EMOJIS[key as ResourceName];
        const translation = RESOURCES_TRANSLATIONS[key as ResourceName];
        return `${emoji} ${bold(translation)}: ${value}`;
      })
      .join("\n");

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
      `# Descrição\n${family.description}\n# Recursos\n${resourcesString}\n# Jogadores\n${playersString} e mais ${bold(playerRest.toString())}.`,
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
