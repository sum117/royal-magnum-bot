import {
  ActionRowBuilder,
  AttachmentBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ColorResolvable,
  Colors,
  EmbedBuilder,
  User,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { readFile } from "fs/promises";
import lodash from "lodash";
import path from "path";
import sharp from "sharp";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { NUMBER_EMOJIS } from "../data/constants";
import ScriptParser, { Character, Choice, Dialogue } from "../scriptParser";
import Utils from "../utils";

export const continueButtonId = "continue";
@Discord()
export default class VisualNovelPlayer {
  public static async getVisualPlayerComponent(
    dialogue: Dialogue,
    character: Character,
    background: string,
    sprite: string,
    choices?: Choice[],
    to?: User,
  ): Promise<BaseMessageOptions> {
    const spritePath = path.join(Utils.getProjectRootDir(), "assets", "sprites", sprite);
    const backgroundPath = path.join(Utils.getProjectRootDir(), "assets", "backgrounds", background);

    const embed = new EmbedBuilder()
      .setTitle(lodash.startCase(dialogue.characterName))
      .setDescription(dialogue.text)
      .setColor(lodash.sample(Object.values(Colors)) as ColorResolvable);
    const pngBuffer = await sharp(backgroundPath)
      .composite([{ input: spritePath, gravity: character.position }])
      .png()
      .toBuffer();

    const attachment = new AttachmentBuilder(pngBuffer).setName(`${character.name}.png`);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setCustomId(continueButtonId).setLabel("Continuar").setStyle(ButtonStyle.Primary),
    );

    if (choices) {
      const choiceStrings = choices.map((choice, index) => `${NUMBER_EMOJIS[index]} - ${choice.label}`);
      embed.setDescription(`${embed.data.description}\n\n${choiceStrings.join("\n")}`);
      buttonRow.setComponents(
        choices.map((choice, index) => {
          return new ButtonBuilder().setCustomId(choice.targetChapterId).setEmoji(NUMBER_EMOJIS[index]).setStyle(ButtonStyle.Primary);
        }),
      );
    }

    return {
      content: to ? to.toString() : undefined,
      files: [attachment],
      embeds: [embed],
      components: [buttonRow],
    };
  }

  @Slash(COMMANDS.playVisualNovel)
  public async playVisualNovel(@SlashOption(COMMAND_OPTIONS.playVisualNovelName) filePath: string, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const rawScript = await readFile(path.join(Utils.getProjectRootDir(), "assets", filePath), "utf-8");
    const parsedScript = new ScriptParser(rawScript).parse();

    const firstChapter = parsedScript.chapters[0];
    const firstDialogue = firstChapter.dialogues[0];
    const firstCharacter = firstChapter.characters[0];

    const firstCharacterDeclaration = parsedScript.declarations.find((declaration) => declaration.characterName === firstCharacter.name);

    const firstSprite = firstCharacterDeclaration?.sprites[firstCharacter.sprite.name];
    if (!firstSprite) {
      await interaction.editReply(
        "Não foi possível encontrar o sprite do personagem da primeira cena. Isso é um erro de script. Por favor, reporte para o desenvolvedor.",
      );
      return;
    }

    const firstBackground = firstChapter.backgrounds?.[0];
    if (!firstBackground) {
      await interaction.editReply(
        "Não foi possível encontrar o background da primeira cena. Isso é um erro de script. Por favor, reporte para o desenvolvedor.",
      );
      return;
    }

    await interaction.editReply(
      await VisualNovelPlayer.getVisualPlayerComponent(firstDialogue, firstCharacter, firstBackground, firstSprite, firstChapter.choices),
    );
  }
}
