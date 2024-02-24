var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var Channel_1;
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, } from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { DateTime } from "luxon";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { CHANNEL_TYPES_TRANSLATIONS, RESOURCES_TRANSLATIONS } from "../data/constants";
import Database from "../database";
import { imageGifUrl } from "../schemas/utils";
import Utils from "../utils";
export const dismissButtonId = "dismiss";
export const infoButtonId = "info";
let Channel = Channel_1 = class Channel {
    static async manageChannelPlaceholder(channel) {
        const databaseChannelData = await Database.getChannel(channel.id);
        if (!databaseChannelData || channel.lastMessageId === databaseChannelData?.placeholderMessageId) {
            return;
        }
        if (!databaseChannelData.placeholderMessageId) {
            await this.generatePlaceholderMessage(channel, databaseChannelData);
            return;
        }
        const oldPlaceholderMessage = await channel.messages.fetch(databaseChannelData.placeholderMessageId).catch(() => null);
        if (!oldPlaceholderMessage) {
            await this.generatePlaceholderMessage(channel, databaseChannelData);
            return;
        }
        const hasBeenInactiveForFourHours = DateTime.fromJSDate(databaseChannelData?.lastActive ? new Date(databaseChannelData.lastActive) : new Date(oldPlaceholderMessage.createdAt))
            .diffNow()
            .as("hours") <= -4;
        if (!hasBeenInactiveForFourHours || oldPlaceholderMessage.channel.lastMessageId === oldPlaceholderMessage.id) {
            return;
        }
        await this.generatePlaceholderMessage(channel, databaseChannelData, oldPlaceholderMessage);
    }
    static makeInfoExpandMessage(channel) {
        const embed = new EmbedBuilder();
        embed.setTitle(lodash.startCase(channel.name));
        embed.addFields({ name: "Tipo", value: CHANNEL_TYPES_TRANSLATIONS[channel.channelType], inline: true }, { name: "Eficiência", value: `${channel.efficiency}%`, inline: true }, { name: "Recurso", value: RESOURCES_TRANSLATIONS[channel.resourceType], inline: true }, { name: "Nível", value: channel.level.toString(), inline: true });
        embed.setColor(lodash.sample(Object.values(Colors)));
        return { embeds: [embed] };
    }
    static async makePlaceholderMessage(channel) {
        const pinnedMessages = await channel.messages.fetchPinned();
        const channelMetadata = pinnedMessages.first();
        if (!channelMetadata || !channelMetadata.attachments.first())
            return;
        const actionsRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(dismissButtonId).setLabel("Fechar").setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId(infoButtonId).setLabel("Informações").setStyle(ButtonStyle.Primary));
        return {
            content: lodash.truncate(channelMetadata.content, { length: 1800, omission: ` (...) [Leia mais](${channelMetadata.url})` }),
            files: [channelMetadata.attachments.first()],
            components: [actionsRow],
        };
    }
    static async generatePlaceholderMessage(channel, databaseChannelData, oldPlaceholderMessage) {
        if (oldPlaceholderMessage)
            await Utils.scheduleMessageToDelete(oldPlaceholderMessage, 0);
        const placeholderMessageComponent = await Channel_1.makePlaceholderMessage(channel);
        if (!placeholderMessageComponent) {
            console.error(`Não foi possível gerar a mensagem de placeholder para o canal ${channel.id}.`);
            return;
        }
        const newPlaceholderMessage = await channel.send(placeholderMessageComponent);
        await Database.updateChannel(databaseChannelData.id, { placeholderMessageId: newPlaceholderMessage.id });
    }
    async createChannel(channel, name, description, image, type = "basic", resourceType = "food", efficiency = 0, interaction) {
        await interaction.deferReply({ ephemeral: true });
        if (!channel.isTextBased() || channel.isThread()) {
            await interaction.editReply({ content: "O canal precisa ser de texto e não pode ser um thread." });
            return;
        }
        const imageUrl = imageGifUrl.safeParse(image.url);
        if (!imageUrl.success) {
            await interaction.editReply({ content: "URL da imagem inválida." });
            return;
        }
        const channelExists = await Database.getChannel(channel.id);
        let createdUpdatedChannel = null;
        if (channelExists) {
            createdUpdatedChannel = await Database.updateChannel(channel.id, {
                name: lodash.kebabCase(name),
                description,
                imageUrl: imageUrl.data,
                channelType: type,
                efficiency,
                resourceType,
            });
        }
        else {
            createdUpdatedChannel = await Database.insertChannel({
                description,
                name: lodash.kebabCase(name),
                imageUrl: imageUrl.data,
                channelType: type,
                efficiency,
                id: channel.id,
                resourceType,
            });
        }
        if (!createdUpdatedChannel) {
            await interaction.editReply({ content: "Não foi possível criar o canal." });
            return;
        }
        await interaction.editReply({ content: "Canal criado com sucesso." });
        await Channel_1.manageChannelPlaceholder(channel);
    }
    async infoButtonListener(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const databaseChannelData = await Database.getChannel(interaction.channelId);
        if (!databaseChannelData) {
            await interaction.reply({ content: "Não foi possível encontrar o canal no banco de dados." });
            return;
        }
        await interaction.editReply(Channel_1.makeInfoExpandMessage(databaseChannelData));
    }
    async dismissButtonListener(interaction) {
        await Utils.scheduleMessageToDelete(interaction.message, 0);
    }
};
__decorate([
    Slash(COMMANDS.createChannel),
    __param(0, SlashOption(COMMAND_OPTIONS.createChannelChannel)),
    __param(1, SlashOption(COMMAND_OPTIONS.createChannelName)),
    __param(2, SlashOption(COMMAND_OPTIONS.createChannelDescription)),
    __param(3, SlashOption(COMMAND_OPTIONS.createChannelImage)),
    __param(4, SlashOption(COMMAND_OPTIONS.createChannelType)),
    __param(5, SlashOption(COMMAND_OPTIONS.createChannelResourceType)),
    __param(6, SlashOption(COMMAND_OPTIONS.createChannelEfficiency))
], Channel.prototype, "createChannel", null);
__decorate([
    ButtonComponent({ id: infoButtonId })
], Channel.prototype, "infoButtonListener", null);
__decorate([
    ButtonComponent({ id: dismissButtonId })
], Channel.prototype, "dismissButtonListener", null);
Channel = Channel_1 = __decorate([
    Discord()
], Channel);
export default Channel;
