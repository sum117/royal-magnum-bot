var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { bold, ChannelType, Collection, Colors, EmbedBuilder, inlineCode, PermissionFlagsBits, roleMention, ThreadAutoArchiveDuration, userMention, } from "discord.js";
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
let Utils = class Utils {
    async changePicture(url, interaction) {
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
    async avatar(target, interaction) {
        await interaction.deferReply();
        const user = await interaction.client.users.fetch(target);
        await interaction.editReply(user.displayAvatarURL());
    }
    async serverInfo(interaction) {
        if (!interaction.inCachedGuild())
            return;
        await interaction.deferReply();
        const guild = await interaction.client.guilds.fetch(interaction.guildId);
        const embed = new EmbedBuilder()
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL() ?? null)
            .setDescription(`${guild.name} é um servidor de Roleplay Medieval que mistura geopolítica e alta fantasia em um mundo dominado por entidades divinas e seus humanos escolhidos. Seja um príncipe ou uma princesa de uma das famílias reais ou um plebeu que busca fama e fortuna.`)
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
    async addEmoji(name, attachment, interaction) {
        await interaction.deferReply({ ephemeral: true });
        const emoji = await interaction.guild?.emojis.create({ attachment: attachment.url, name: lodash.snakeCase(name) });
        await interaction.editReply(`Emoji ${emoji} adicionado com sucesso.`);
    }
    async readingTime(interaction) {
        await interaction.deferReply();
        let messageCol = new Collection();
        const fetchMessages = async (channel, onlyPinned = false) => {
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
                    if (col)
                        messageCol = messageCol.concat(col);
                });
            }
            else if (channel.id === CATEGORY_IDS.contentCategory) {
                const apiMessageCols = await Promise.all(channel.children.cache.map((channel) => fetchMessages(channel)));
                apiMessageCols.forEach((col) => {
                    if (col)
                        messageCol = messageCol.concat(col);
                });
            }
        }
        const content = messageCol.map((message) => message.content).join("\n\n");
        const readingMetadata = readingTime(content);
        await interaction.editReply({
            content: `O servidor possui aproximadamente ${bold(Duration.fromMillis(Math.floor(readingMetadata.minutes) * 60 * 1000).toFormat(`hh 'horas e' mm 'minutos'`))} de leitura, considerando a velocidade de leitura de um adulto médio.\n Isso equivale a ${bold(readingMetadata.words.toString())} palavra(s) ou ${content.length} caractere(s).`,
            files: [{ attachment: Buffer.from(content), name: "content.txt" }],
        });
    }
    async help(interaction) {
        if (!interaction.inCachedGuild())
            return;
        await interaction.deferReply();
        const commandDataToDisplay = Object.values(COMMANDS)
            .filter((command) => {
            const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
            if (isAdmin)
                return true;
            else
                return !("defaultMemberPermissions" in command);
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
    async rpPing(interaction) {
        if (!interaction.inCachedGuild())
            return;
        const askRoleplayForm = new AskRoleplayForm(interaction);
        const result = await askRoleplayForm.send();
        if (!result)
            return;
        const embed = await AskRoleplayForm.getEmbed({ ...result, user: interaction.user });
        if (!embed)
            return;
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
    async top(interaction) {
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
};
__decorate([
    Slash(COMMANDS.changePicture),
    __param(0, SlashOption(COMMAND_OPTIONS.changePictureURL))
], Utils.prototype, "changePicture", null);
__decorate([
    Slash(COMMANDS.avatar),
    __param(0, SlashOption(COMMAND_OPTIONS.avatarTarget))
], Utils.prototype, "avatar", null);
__decorate([
    Slash(COMMANDS.serverInfo)
], Utils.prototype, "serverInfo", null);
__decorate([
    Slash(COMMANDS.addEmoji),
    __param(0, SlashOption(COMMAND_OPTIONS.addEmojiName)),
    __param(1, SlashOption(COMMAND_OPTIONS.addEmojiAttachment))
], Utils.prototype, "addEmoji", null);
__decorate([
    Slash(COMMANDS.readingTime)
], Utils.prototype, "readingTime", null);
__decorate([
    Slash(COMMANDS.help)
], Utils.prototype, "help", null);
__decorate([
    Slash(COMMANDS.rpPing)
], Utils.prototype, "rpPing", null);
__decorate([
    Slash(COMMANDS.top)
], Utils.prototype, "top", null);
Utils = __decorate([
    Discord()
], Utils);
export default Utils;
