import {
  ActionRowBuilder,
  Attachment,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ColorResolvable,
  Colors,
  EmbedBuilder,
  Message,
  TextChannel,
} from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { DateTime } from "luxon";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { CHANNEL_TYPES_TRANSLATIONS, RESOURCES_TRANSLATIONS } from "../data/constants";
import Database from "../database";
import type { Channel as DatabaseChannel } from "../schemas/channelSchema";
import { ChannelType } from "../schemas/enums";
import { ResourceType } from "../schemas/resourceSchema";
import { imageGifUrl } from "../schemas/utils";
import Utils from "../utils";

export const dismissButtonId = "dismiss";
export const infoButtonId = "info";

@Discord()
export default class Channel {
  public static async manageChannelPlaceholder(channel: TextChannel) {
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

    const hasBeenInactiveForFourHours =
      DateTime.fromJSDate(databaseChannelData?.lastActive ? new Date(databaseChannelData.lastActive) : new Date(oldPlaceholderMessage.createdAt))
        .diffNow()
        .as("hours") <= -4;
    if (!hasBeenInactiveForFourHours || oldPlaceholderMessage.channel.lastMessageId === oldPlaceholderMessage.id) {
      return;
    }

    await this.generatePlaceholderMessage(channel, databaseChannelData, oldPlaceholderMessage);
  }

  public static makeInfoExpandMessage(channel: DatabaseChannel) {
    const embed = new EmbedBuilder();
    embed.setTitle(lodash.startCase(channel.name));
    embed.addFields(
      { name: "Tipo", value: CHANNEL_TYPES_TRANSLATIONS[channel.type], inline: true },
      { name: "Eficiência", value: `${channel.efficiency}%`, inline: true },
      { name: "Recurso", value: RESOURCES_TRANSLATIONS[channel.resourceType], inline: true },
      { name: "Nível", value: channel.level.toString(), inline: true },
    );
    embed.setColor(lodash.sample(Object.values(Colors)) as ColorResolvable);

    return { embeds: [embed] };
  }

  public static async makePlaceholderMessage(channel: TextChannel) {
    const pinnedMessages = await channel.messages.fetchPinned();

    const channelMetadata = pinnedMessages.first();
    if (!channelMetadata || !channelMetadata.attachments.first()) return;

    const actionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(dismissButtonId).setLabel("Fechar").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(infoButtonId).setLabel("Informações").setStyle(ButtonStyle.Primary),
    );

    return {
      content: lodash.truncate(channelMetadata.content, { length: 1800, omission: `\n(...) [Leia mais](${channelMetadata.url})` }),
      files: [channelMetadata.attachments.first()!],
      components: [actionsRow],
    } satisfies BaseMessageOptions;
  }

  private static async generatePlaceholderMessage(channel: TextChannel, databaseChannelData: DatabaseChannel, oldPlaceholderMessage?: Message) {
    if (oldPlaceholderMessage) await Utils.scheduleMessageToDelete(oldPlaceholderMessage, 0);

    const placeholderMessageComponent = await Channel.makePlaceholderMessage(channel);
    if (!placeholderMessageComponent) {
      console.error(`Não foi possível gerar a mensagem de placeholder para o canal ${channel.id}.`);
      return;
    }

    const newPlaceholderMessage = await channel.send(placeholderMessageComponent);
    await Database.updateChannel(databaseChannelData.id, { placeholderMessageId: newPlaceholderMessage.id });
  }

  @Slash(COMMANDS.createChannel)
  public async createChannel(
    @SlashOption(COMMAND_OPTIONS.createChannelChannel) channel: TextChannel,
    @SlashOption(COMMAND_OPTIONS.createChannelName) name: string,
    @SlashOption(COMMAND_OPTIONS.createChannelDescription) description: string,
    @SlashOption(COMMAND_OPTIONS.createChannelImage) image: Attachment,
    @SlashOption(COMMAND_OPTIONS.createChannelType) type: ChannelType = "basic",
    @SlashOption(COMMAND_OPTIONS.createChannelResourceType) resourceType: ResourceType = "food",
    @SlashOption(COMMAND_OPTIONS.createChannelEfficiency) efficiency: number = 0,
    interaction: ChatInputCommandInteraction,
  ) {
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
        image: imageUrl.data,
        type,
        efficiency,
        resourceType,
      });
    } else {
      createdUpdatedChannel = await Database.insertChannel({
        description,
        name: lodash.kebabCase(name),
        image: imageUrl.data,
        type,
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
    await Channel.manageChannelPlaceholder(channel);
  }

  @ButtonComponent({ id: infoButtonId })
  public async infoButtonListener(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const databaseChannelData = await Database.getChannel(interaction.channelId);
    if (!databaseChannelData) {
      await interaction.reply({ content: "Não foi possível encontrar o canal no banco de dados." });
      return;
    }

    await interaction.editReply(Channel.makeInfoExpandMessage(databaseChannelData));
  }

  @ButtonComponent({ id: dismissButtonId })
  public async dismissButtonListener(interaction: ButtonInteraction) {
    Utils.scheduleMessageToDelete(interaction.message, 0);
  }
}
