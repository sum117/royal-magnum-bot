import { Attachment, ChatInputCommandInteraction, CommandInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { imageGifUrl } from "../schemas/utils";

@Discord()
export default class Utils {
  @Slash(COMMANDS.changePicture)
  public async changePicture(@SlashOption(COMMAND_OPTIONS.changePictureURL) url: string, interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const isImage = imageGifUrl.safeParse(url).success;
    if (!isImage) {
      await interaction.editReply("URL inválida");
      return;
    }
    await interaction.guild?.setIcon(url);
    await interaction.client.user?.setAvatar(url);
    await interaction.editReply("Imagem alterada com sucesso.");
  }

  @Slash(COMMANDS.avatar)
  public async avatar(@SlashOption(COMMAND_OPTIONS.avatarTarget) target: GuildMember, interaction: CommandInteraction) {
    await interaction.deferReply();
    const user = await interaction.client.users.fetch(target);
    await interaction.editReply(user.displayAvatarURL());
  }

  @Slash(COMMANDS.serverInfo)
  public async serverInfo(interaction: CommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply();
    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL() ?? null)
      .setDescription(
        `${guild.name} é um servidor de Roleplay Medieval que mistura geopolítica e alta fantasia em um mundo dominado por entidades divinas e seus humanos escolhidos. Seja um príncipe ou uma princesa de uma das famílias reais ou um plebeu que busca fama e fortuna.`,
      )
      .addFields([
        { name: "ID", value: guild.id, inline: true },
        { name: "Dono", value: `<@${guild.ownerId}>`, inline: true },
        { name: "Criado em", value: guild.createdAt.toUTCString(), inline: true },
        { name: "Membros", value: guild.memberCount.toString(), inline: true },
        { name: "Cargos", value: guild.roles.cache.size.toString(), inline: true },
        { name: "Canais", value: guild.channels.cache.size.toString(), inline: true },
        { name: "Emojis", value: guild.emojis.cache.size.toString(), inline: true },
        { name: "Boosts", value: guild?.premiumSubscriptionCount?.toString() ?? "0", inline: true },
      ]);
    await interaction.editReply({ embeds: [embed], content: "https://discord.gg/8rtKfrgVFy" });
  }

  @Slash(COMMANDS.addEmoji)
  public async addEmoji(
    @SlashOption(COMMAND_OPTIONS.addEmojiName) name: string,
    @SlashOption(COMMAND_OPTIONS.addEmojiAttachment) attachment: Attachment,
    interaction: ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: true });
    const emoji = await interaction.guild?.emojis.create({ attachment: attachment.url, name: lodash.snakeCase(name) });
    await interaction.editReply(`Emoji ${emoji} adicionado com sucesso.`);
  }
}
