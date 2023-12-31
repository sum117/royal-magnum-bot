import {
  ActionRowBuilder,
  Attachment,
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
import { ChannelType } from "../schemas/channelSchema";
import { ResourceType } from "../schemas/resourceSchema";
import { imageGifUrl } from "../schemas/utils";
import Utils from "../utils";

export const dismissButtonId = "dismiss";

@Discord()
export default class Channel {
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

    const createdChannel = await Database.insertChannel({
      description,
      name: lodash.kebabCase(name),
      image: imageUrl.data,
      type,
      efficiency,
      id: channel.id,
      resourceType,
    });
    if (!createdChannel) {
      await interaction.editReply({ content: "Não foi possível criar o canal. Já há um canal registrado no banco de dados com esse ID." });
      return;
    }

    await interaction.editReply({ content: "Canal criado com sucesso." });
    await Channel.manageChannelPlaceholder(channel);
  }

  @ButtonComponent({ id: dismissButtonId })
  public async dismissButtonListener(interaction: ButtonInteraction) {
    Utils.scheduleMessageToDelete(interaction.message, 0);
  }

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
    if (!hasBeenInactiveForFourHours) {
      return;
    }

    await this.generatePlaceholderMessage(channel, databaseChannelData, oldPlaceholderMessage);
  }

  public static makePlaceholderMessage(channel: DatabaseChannel) {
    const embed = new EmbedBuilder();
    embed.setTitle(lodash.startCase(channel.name));
    embed.setDescription(channel.description);
    embed.addFields(
      { name: "Tipo", value: CHANNEL_TYPES_TRANSLATIONS[channel.type], inline: true },
      { name: "Eficiência", value: `${channel.efficiency}%`, inline: true },
      { name: "Recurso", value: RESOURCES_TRANSLATIONS[channel.resourceType], inline: true },
      { name: "Nível", value: channel.level.toString(), inline: true },
    );
    embed.setImage(channel.image);
    embed.setColor(lodash.sample(Object.values(Colors)) as ColorResolvable);
    const dismissButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(dismissButtonId).setLabel("Fechar").setStyle(ButtonStyle.Danger),
    );
    return { embeds: [embed], components: [dismissButton] };
  }

  private static async generatePlaceholderMessage(channel: TextChannel, databaseChannelData: DatabaseChannel, oldPlaceholderMessage?: Message) {
    if (oldPlaceholderMessage) await Utils.scheduleMessageToDelete(oldPlaceholderMessage, 0);
    const newPlaceholderMessage = await channel.send(Channel.makePlaceholderMessage(databaseChannelData));
    await Database.updateChannel(databaseChannelData.id, { placeholderMessageId: newPlaceholderMessage.id });
  }
}
