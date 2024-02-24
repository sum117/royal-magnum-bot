var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var Character_1;
import { Pagination, PaginationResolver } from "@discordx/pagination";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, bold, channelMention, } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { ConfirmationPrompt } from "../components/ConfirmationPrompt";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { ORGANIZATION_TRANSLATIONS, PAGINATION_DEFAULT_OPTIONS, PROFESSIONS_PRONOUNS_TRANSLATIONS } from "../data/constants";
import Database from "../database";
import { resourcesSchema } from "../schemas/resourceSchema";
import Utils from "../utils";
export const characterDetailsButtonIdPrefix = "characterDetails";
export const getCharacterDetailsButtonId = (userId, characterId, preview = false, isStoreSheet = true) => `${characterDetailsButtonIdPrefix}_${userId}_${characterId}_${preview ? "true" : "false"}_${isStoreSheet ? "store" : "user"}`;
let Character = Character_1 = class Character {
    static getCharacterDetailsButton(userId, characterId, label, preview, isStoreSheet = true) {
        return new ActionRowBuilder().setComponents(new ButtonBuilder()
            .setCustomId(getCharacterDetailsButtonId(userId, characterId, preview, isStoreSheet))
            .setLabel(label ?? "Detalhes")
            .setStyle(ButtonStyle.Primary));
    }
    static async getCharacterRPEmbed(message, character) {
        const embed = new EmbedBuilder().setTimestamp().setThumbnail(character.imageUrl).setColor(Colors.Blurple).setDescription(message.content);
        const professionPronoun = PROFESSIONS_PRONOUNS_TRANSLATIONS[character.profession][character.gender];
        embed.setTitle(`${professionPronoun} ${character.name}`);
        const originData = (await Utils.fetchOrigins()).find((origin) => origin.id === character.origin);
        if (originData) {
            embed.setAuthor({ name: `${originData?.name}` });
        }
        if (character.type === "royal" && character.familySlug) {
            const family = await Database.getFamily(character.familySlug);
            embed.setTitle(`${character.royalTitle} ${character.name}`);
            embed.setAuthor({ name: family?.title ?? "Família não encontrada" });
        }
        return embed;
    }
    static async getCharacterPreviewEmbed(sheet) {
        const embed = new EmbedBuilder();
        if (sheet.type === "royal" && sheet.familySlug) {
            const family = await Database.getFamily(sheet.familySlug);
            embed.setTitle(`${sheet.royalTitle} ${sheet.name} de ${family?.title}`);
        }
        else {
            embed.setTitle(sheet.name);
        }
        const { progressBar } = Character_1.getCharacterLevelDetails(sheet);
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
    static getCharacterLevelDetails({ level, xp }) {
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
            willLevelUp: (xp) => xp >= expRequiredForNextLevel && level < MAX_LEVEL,
        };
    }
    static async handleCharacterDetailsButton(buttonInteraction, isStoreSheet = false) {
        if (buttonInteraction.customId.startsWith(characterDetailsButtonIdPrefix)) {
            await buttonInteraction.deferReply({ ephemeral: true });
            // export const characterDetailsButtonIdPrefix = "characterDetails";
            //export const getCharacterDetailsButtonId = (userId: string, characterId: string, preview: boolean = false, isStoreSheet = true) =>
            // `${characterDetailsButtonIdPrefix}_${userId}_${characterId}_${preview ? "true" : "false"}_${isStoreSheet ? "store" : "user"}`;
            const [userId, characterId, preview] = buttonInteraction.customId.split("_").slice(1);
            const sheet = isStoreSheet ? await Database.getStoreSheet(characterId) : await Database.getSheet(userId, characterId);
            const embed = new EmbedBuilder().setColor(Colors.Blurple);
            if (sheet?.type === "royal") {
                embed.setDescription(`# História \n${sheet.backstory}\n# Dádiva / Transformação \n${sheet.transformation}`);
            }
            else {
                embed.setDescription(`# História \n${sheet?.backstory}`);
            }
            const messageOptions = { embeds: [embed] };
            if (preview === "true" && sheet?.type === "character") {
                const previewEmbed = await Character_1.getCharacterPreviewEmbed(sheet);
                messageOptions.embeds = [previewEmbed];
            }
            await buttonInteraction.editReply(messageOptions);
        }
    }
    async setNoEmbedRoleplay(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const user = await Database.getUser(interaction.user.id);
        await Database.updateUser(interaction.user.id, { doesNotUseEmbeds: !user?.doesNotUseEmbeds });
        await interaction.editReply({ content: `Modo de roleplay sem embed ${user?.doesNotUseEmbeds ? "ativado" : "desativado"}.` });
    }
    async characterList(user, interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sheets = await Database.getSheets(user.id);
        if (!sheets.length) {
            await interaction.editReply({ content: "Este usuário não possui fichas." });
            return;
        }
        const randomColor = lodash.sample(Object.values(Colors));
        const formatSheetListString = (sheet, isCurrentPage) => {
            const isActive = sheet.isActive ? "✅" : "";
            return `${isActive} ${isCurrentPage ? bold(sheet.name) : sheet.name}`;
        };
        const generatePages = new PaginationResolver(async (page) => {
            const pages = [];
            for (const sheet of sheets) {
                const embed = await Character_1.getCharacterPreviewEmbed(sheet);
                embed.setAuthor({
                    name: `Fichas de ${user.displayName}`,
                    iconURL: user.user.avatarURL({ forceStatic: true }) ?? undefined,
                });
                embed.setDescription(sheets.map((sheet, index) => formatSheetListString(sheet, index === page)).join("\n"));
                embed.setColor(randomColor ?? Colors.Blurple);
                pages.push({
                    embeds: [embed],
                    components: [Character_1.getCharacterDetailsButton(user.id, sheet.id)],
                });
            }
            return pages[page];
        }, sheets.length);
        const pagination = new Pagination(interaction, generatePages, PAGINATION_DEFAULT_OPTIONS);
        const paginationMessage = await pagination.send();
        paginationMessage.collector.on("collect", Character_1.handleCharacterDetailsButton);
    }
    async setCharacter(characterId, interaction) {
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
    async deleteCharacter(characterId, interaction) {
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
                    await Database.updateUser(interaction.user.id, { royalTokens: { increment: 1 } });
                    await promptInteraction.followUp({ content: `Você recebeu 1 token real de volta por deletar ${bold(sheet.name)}.` });
                }
            }
            else if (promptInteraction.customId === confirmationPrompt.cancelButtonId) {
                await promptInteraction.editReply({ content: "Operação cancelada." });
            }
        });
        await new Promise((resolve) => sentPrompt.collector.on("end", resolve));
        await interaction.editReply({ content: "Fim da interação." });
    }
    async changeCharacterAvatar(characterId, attachment, interaction) {
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
    async showFamilyDetails(familySlug, interaction) {
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
        embed.setThumbnail(family.imageUrl);
        embed.setColor(Colors.Blurple);
        embed.setDescription(`# Descrição\n${family.description}\n# Recursos\n${Utils.getResourcesString(resources)}\n# Jogadores\n${playersString} e mais ${bold(playerRest.toString())}.`);
        embed.addFields([
            {
                name: "👥 População",
                value: `${family.population}/${family.populationCap} (${family.populationGrowth}/ano)`,
                inline: true,
            },
        ]);
        await interaction.editReply({ embeds: [embed] });
    }
    async setProfession(user, profession, interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sheet = await Database.getActiveSheet(user.id);
        if (!sheet?.profession || sheet.profession === "royal")
            return;
        sheet.profession = profession;
        await Database.updateSheet(user.id, sheet.id, sheet);
        await interaction.editReply({ content: `Profissão de ${user.displayName} alterada para ${profession}.` });
    }
};
__decorate([
    Slash(COMMANDS.setNoEmbedRoleplay)
], Character.prototype, "setNoEmbedRoleplay", null);
__decorate([
    Slash(COMMANDS.characterList),
    __param(0, SlashOption(COMMAND_OPTIONS.characterList))
], Character.prototype, "characterList", null);
__decorate([
    Slash(COMMANDS.setCharacter),
    __param(0, SlashOption(COMMAND_OPTIONS.setCharacter))
], Character.prototype, "setCharacter", null);
__decorate([
    Slash(COMMANDS.deleteCharacter),
    __param(0, SlashOption(COMMAND_OPTIONS.deleteCharacterCharacter))
], Character.prototype, "deleteCharacter", null);
__decorate([
    Slash(COMMANDS.changeCharacterAvatar),
    __param(0, SlashOption(COMMAND_OPTIONS.changeCharacterAvatarCharacter)),
    __param(1, SlashOption(COMMAND_OPTIONS.changeCharacterAvatarAttachment))
], Character.prototype, "changeCharacterAvatar", null);
__decorate([
    Slash(COMMANDS.showFamilyDetails),
    __param(0, SlashOption(COMMAND_OPTIONS.showFamilyDetails))
], Character.prototype, "showFamilyDetails", null);
__decorate([
    Slash(COMMANDS.setCharacterProfession),
    __param(0, SlashOption(COMMAND_OPTIONS.setProfessionUser)),
    __param(1, SlashOption(COMMAND_OPTIONS.setProfessionProfession))
], Character.prototype, "setProfession", null);
Character = Character_1 = __decorate([
    Discord()
], Character);
export default Character;
