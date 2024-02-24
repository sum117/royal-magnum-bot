import {
  Attachment,
  bold,
  Channel,
  ChannelType,
  ChatInputCommandInteraction,
  Collection,
  Colors,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  inlineCode,
  Message,
  PermissionFlagsBits,
  roleMention,
  ThreadAutoArchiveDuration,
  userMention,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { Duration } from "luxon";
import readingTime from "reading-time";
import AskRoleplayForm from "../components/AskRoleplayForm";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { CATEGORY_IDS, CHANNEL_IDS, ROLE_IDS, SERVER_BANNER_URL } from "../data/constants";
import Database from "../database";
import { bot } from "../main";
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

  @Slash(COMMANDS.readingTime)
  public async readingTime(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    let messageCol = new Collection<string, Message>();

    const fetchMessages = async (channel: Channel, onlyPinned: boolean = false) => {
      if (channel.isTextBased() && !channel.isThread()) {
        return onlyPinned ? await channel.messages.fetchPinned() : await channel.messages.fetch({ limit: 100 });
      }
    };

    if (!interaction.inCachedGuild()) {
      return;
    }

    for (const [_channelId, channel] of interaction.guild.channels.cache) {
      if (channel.type !== ChannelType.GuildCategory) {
        continue;
      }

      if (channel.name.startsWith("RP |")) {
        const apiMessageCols = await Promise.all(channel.children.cache.map((channel) => fetchMessages(channel, true)));
        apiMessageCols.forEach((col) => {
          if (col) messageCol = messageCol.concat(col);
        });
      } else if (channel.id === CATEGORY_IDS.contentCategory) {
        const apiMessageCols = await Promise.all(channel.children.cache.map((channel) => fetchMessages(channel)));
        apiMessageCols.forEach((col) => {
          if (col) messageCol = messageCol.concat(col);
        });
      }
    }

    const content = messageCol.map((message) => message.content).join("\n\n");

    const readingMetadata = readingTime(content);

    await interaction.editReply({
      content: `O servidor possui aproximadamente ${bold(
        Duration.fromMillis(Math.floor(readingMetadata.minutes) * 60 * 1000).toFormat(`hh 'horas e' mm 'minutos'`),
      )} de leitura, considerando a velocidade de leitura de um adulto médio.\n Isso equivale a ${bold(readingMetadata.words.toString())} palavra(s) ou ${
        content.length
      } caractere(s).`,
      files: [{ attachment: Buffer.from(content), name: "content.txt" }],
    });
  }

  @Slash(COMMANDS.help)
  public async help(interaction: CommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply();
    const commandDataToDisplay = Object.values(COMMANDS)
      .filter((command) => {
        const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
        if (isAdmin) return true;
        else return !("defaultMemberPermissions" in command);
      })
      .map((command) => {
        return `- ${inlineCode("/" + command.name)}: ${command.description}`;
      })
      .join("\n");

    const message = `# Comandos do Royal Magnum Bot\n*Esse comando só mostra os que você pode acessar!*\n\n${commandDataToDisplay}`;

    const chunks = lodash.chunk(message.split(""), 2000);
    for (const chunk of chunks) {
      await interaction.channel?.send(chunk.join(""));
    }
    await interaction.deleteReply();
  }

  @Slash(COMMANDS.rpPing)
  public async rpPing(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;

    const askRoleplayForm = new AskRoleplayForm(interaction);

    const result = await askRoleplayForm.send();
    if (!result) return;

    const embed = await AskRoleplayForm.getEmbed({ ...result, user: interaction.user });
    if (!embed) return;

    const targetUser = result.roleplayUser ? await interaction.guild?.members.fetch(result.roleplayUser) : undefined;
    const message = await bot.systemChannels.get(CHANNEL_IDS.askRoleplayChannel)?.send({
      content: targetUser ? targetUser.toString() : roleMention(ROLE_IDS.roleplayPing),
      embeds: [embed],
    });

    const thread = await message?.startThread({
      name: `Converse com ${interaction.user.username} aqui!`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
    });

    let notice = `${interaction.user.toString()},aqui está a sua thread para discutir seu futuro roleplay!`;

    await thread?.members.add(interaction.user.id);

    if (targetUser) {
      await thread?.members.add(targetUser.id);
      notice = `${targetUser.toString()}, ${interaction.user.toString()} está te chamando para um roleplay!`;
    }

    await thread?.send(notice);
  }

  @Slash(COMMANDS.top)
  public async top(interaction: CommandInteraction) {
    await interaction.deferReply();
    const users = await Database.getUsersWithMessageCount();

    const usersString = users.map((user, index) => {
      const letterAveragePerPost = 1250;
      const wordsPerMinute = 200;
      const letterAveragePerWord = 5;
      const readingMinutes = (Number(user.messageCount) * (letterAveragePerPost / letterAveragePerWord)) / wordsPerMinute;
      const readingTimeString = Duration.fromObject({ minutes: Math.floor(readingMinutes) })
        .toFormat("h 'horas e' m 'minutos'")
        .replace("0 horas e ", "");
      const position = index + 1;
      return `${bold(position.toString())}. ${userMention(user.id)} | ${Number(user.messageCount)} posts, aproximadamente ${readingTimeString} de leitura.`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`👑 Top 10 do Royal Magnum.`)
      .setDescription(usersString.join("\n\n"))
      .setColor(Colors.Gold)
      .setThumbnail(SERVER_BANNER_URL)
      .setFooter({ text: "💗 Obrigado por fazer parte do nosso servidor!" });

    await interaction.editReply({ embeds: [embed] });
  }
  // TODO: Doesn't work. Will remake.
  // @SimpleCommand({ name: "clear" })
  // public async delete(
  //   @SimpleCommandOption({ name: "user", type: SimpleCommandOptionType.User }) user: GuildMember | null,
  //   @SimpleCommandOption({ name: "amount", type: SimpleCommandOptionType.Number }) amount: number = 100,
  //   @SimpleCommandOption({ name: "to", type: SimpleCommandOptionType.String }) to: string | null,
  //   @SimpleCommandOption({ name: "regex", type: SimpleCommandOptionType.String }) regex: string | null,
  //   command: SimpleCommandMessage,
  // ) {
  //   if (!command.message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
  //     await command.message.reply("Você não tem permissão para usar esse comando.");
  //     return;
  //   }
  //   if (!user && !regex && !to) {
  //     await command.sendUsageSyntax();
  //   }
  //   const FETCH_LIMIT_MAX = 100;
  //   const FETCH_LIMIT_MIN = 1;
  //   const BULK_DELETE_THRESHOLD_DAYS = 14;
  //   const fetchOptions: Record<string, string | number> = { limit: amount < FETCH_LIMIT_MAX && amount >= FETCH_LIMIT_MIN ? amount : FETCH_LIMIT_MAX };
  //   if (to) {
  //     fetchOptions.after = to;
  //   }
  //   const messages = await command.message.channel.messages.fetch(fetchOptions);
  //   const messagesToDelete = messages.filter((message) => {
  //     const isSameUser = user ? message.author.id === user.id : true;
  //     const isOld = DateTime.fromISO(message.createdAt.toISOString()).diffNow("days").days > BULK_DELETE_THRESHOLD_DAYS;
  //     const isMatchingRegex = regex ? new RegExp(regex).test(message.content) : true;
  //     return isSameUser && isOld && isMatchingRegex;
  //   });

  //   if (command.message.channel.type === ChannelType.GuildText) {
  //     await command.message.channel.bulkDelete(messagesToDelete);
  //   }
  // }
}
