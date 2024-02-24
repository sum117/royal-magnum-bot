var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VisualNovelPlayer_1;
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { readFile } from "fs/promises";
import lodash from "lodash";
import path from "path";
import sharp from "sharp";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { NUMBER_EMOJIS } from "../data/constants";
import ScriptParser from "../scriptParser";
import Utils from "../utils";
export const continueButtonId = "continue";
let VisualNovelPlayer = VisualNovelPlayer_1 = class VisualNovelPlayer {
    static async getVisualPlayerComponent(dialogue, character, background, sprite, choices, to) {
        const spritePath = path.join(Utils.getProjectRootDir(), "assets", "sprites", sprite);
        const backgroundPath = path.join(Utils.getProjectRootDir(), "assets", "backgrounds", background);
        const embed = new EmbedBuilder()
            .setTitle(lodash.startCase(dialogue.characterName))
            .setDescription(dialogue.text)
            .setColor(lodash.sample(Object.values(Colors)));
        const pngBuffer = await sharp(backgroundPath)
            .composite([{ input: spritePath, gravity: character.position }])
            .png()
            .toBuffer();
        const attachment = new AttachmentBuilder(pngBuffer).setName(`${character.name}.png`);
        const buttonRow = new ActionRowBuilder().setComponents(new ButtonBuilder().setCustomId(continueButtonId).setLabel("Continuar").setStyle(ButtonStyle.Primary));
        if (choices) {
            const choiceStrings = choices.map((choice, index) => `${NUMBER_EMOJIS[index]} - ${choice.label}`);
            embed.setDescription(`${embed.data.description}\n\n${choiceStrings.join("\n")}`);
            buttonRow.setComponents(choices.map((choice, index) => {
                return new ButtonBuilder().setCustomId(choice.targetChapterId).setEmoji(NUMBER_EMOJIS[index]).setStyle(ButtonStyle.Primary);
            }));
        }
        return {
            content: to ? to.toString() : undefined,
            files: [attachment],
            embeds: [embed],
            components: [buttonRow],
        };
    }
    async playVisualNovel(filePath, interaction) {
        await interaction.deferReply();
        const rawScript = await readFile(path.join(Utils.getProjectRootDir(), "assets", filePath), "utf-8");
        const parsedScript = new ScriptParser(rawScript).parse();
        const firstChapter = parsedScript.chapters[0];
        const firstDialogue = firstChapter.dialogues[0];
        const firstCharacter = firstChapter.characters[0];
        const firstCharacterDeclaration = parsedScript.declarations.find((declaration) => declaration.characterName === firstCharacter.name);
        const firstSprite = firstCharacterDeclaration?.sprites[firstCharacter.sprite.name];
        if (!firstSprite) {
            await interaction.editReply("Não foi possível encontrar o sprite do personagem da primeira cena. Isso é um erro de script. Por favor, reporte para o desenvolvedor.");
            return;
        }
        const firstBackground = firstChapter.backgrounds?.[0];
        if (!firstBackground) {
            await interaction.editReply("Não foi possível encontrar o background da primeira cena. Isso é um erro de script. Por favor, reporte para o desenvolvedor.");
            return;
        }
        await interaction.editReply(await VisualNovelPlayer_1.getVisualPlayerComponent(firstDialogue, firstCharacter, firstBackground, firstSprite, firstChapter.choices));
    }
};
__decorate([
    Slash(COMMANDS.playVisualNovel),
    __param(0, SlashOption(COMMAND_OPTIONS.playVisualNovelName))
], VisualNovelPlayer.prototype, "playVisualNovel", null);
VisualNovelPlayer = VisualNovelPlayer_1 = __decorate([
    Discord()
], VisualNovelPlayer);
export default VisualNovelPlayer;
