var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AttachmentBuilder, EmbedBuilder, Events, bold } from "discord.js";
import { Discord, Guard, On } from "discordx";
import lodash from "lodash";
import { DateTime, Duration } from "luxon";
import { AchievementEvents } from "../achievements";
import Character from "../commands/character";
import NPC from "../commands/npc";
import { DISCORD_MESSAGE_CONTENT_LIMIT, PROFESSION_CHANNELS } from "../data/constants";
import Database from "../database";
import { isRoleplayingChannel } from "../guards/isRoleplayingChannel";
import { achievements } from "../main";
import Utils from "../utils";
let CharacterEvents = class CharacterEvents {
    isEditingMap;
    constructor() {
        this.isEditingMap = new Map();
    }
    async onCharacterMessage([message]) {
        if (message.author.bot || this.isEditingMap.get(message.author.id))
            return;
        const isOutOfCharacter = /^(?:\(\(|\[\[|\{\{|\\\\|\/\/|OOC)/.test(message.content);
        if (isOutOfCharacter) {
            void Utils.scheduleMessageToDelete(message, Duration.fromObject({ minutes: 1 }).as("milliseconds"));
            return;
        }
        const user = await Database.getUser(message.author.id);
        if (!user) {
            console.log(`Usuário ${message.author.id} não encontrado no banco de dados`);
            return;
        }
        let embed;
        let hasGainedReward = false;
        let characterOrNPCIn;
        if (user.currentNpcId) {
            const npc = await Database.getNPC(user.currentNpcId);
            if (!npc)
                return;
            embed = await this.getNPCEmbed(message, npc);
            characterOrNPCIn = npc;
        }
        else {
            const character = await Database.getActiveSheet(message.author.id);
            if (!character) {
                console.log(`Personagem de ${message.author.id} não encontrado no banco de dados`);
                return;
            }
            characterOrNPCIn = character;
            embed = await Character.getCharacterRPEmbed(message, character);
            hasGainedReward = await this.handleActivityGains(character, message);
        }
        await Utils.scheduleMessageToDelete(message, 0);
        const payload = { embeds: [embed] };
        const attachment = message.attachments.first();
        if (attachment) {
            const { imageKitLink, name } = await Utils.handleAttachment(attachment, embed);
            payload.files = [{ attachment: imageKitLink, name }];
        }
        if (user.doesNotUseEmbeds) {
            const { webhook, characterOrNPC } = await this.getWebhook(message.channel, characterOrNPCIn);
            if (message.content.length >= DISCORD_MESSAGE_CONTENT_LIMIT) {
                const chunks = lodash.chunk(message.content, DISCORD_MESSAGE_CONTENT_LIMIT);
                for (const chunk of chunks) {
                    const webhookMessage = await webhook.send({
                        content: chunk.join(""),
                        files: chunks.indexOf(chunk) === chunks.length - 1 ? payload.files : undefined,
                        username: characterOrNPC.name,
                        avatarURL: characterOrNPC.imageUrl,
                    });
                    webhookMessage.author.id = message.author.id;
                    await Database.insertMessage(webhookMessage);
                    achievements.emit(AchievementEvents.onCharacterMessage, { embedMessage: webhookMessage, user: message.author });
                    if (hasGainedReward) {
                        await webhookMessage.react("💰");
                        await webhookMessage.react("📈");
                    }
                }
            }
            else {
                const webhookMessage = await webhook.send({
                    content: message.content,
                    files: payload.files,
                    username: characterOrNPC.name,
                    avatarURL: characterOrNPC.imageUrl,
                });
                webhookMessage.author.id = message.author.id;
                await Database.insertMessage(webhookMessage);
                achievements.emit(AchievementEvents.onCharacterMessage, { embedMessage: webhookMessage, user: message.author });
                if (hasGainedReward) {
                    await webhookMessage.react("💰");
                    await webhookMessage.react("📈");
                }
            }
        }
        else {
            const embedMessage = await message.channel.send(payload);
            embedMessage.author.id = message.author.id;
            await Database.insertMessage(embedMessage);
            achievements.emit(AchievementEvents.onCharacterMessage, { embedMessage, user: message.author });
            if (hasGainedReward) {
                await embedMessage.react("💰");
                await embedMessage.react("📈");
            }
        }
    }
    async getWebhook(channel, characterOrNPC) {
        const webhooks = await channel.fetchWebhooks();
        const existingWebhook = webhooks.find((webhook) => webhook.name === characterOrNPC.name);
        if (!existingWebhook) {
            const createdWebhook = await channel.createWebhook({
                name: characterOrNPC.name,
                avatar: characterOrNPC.imageUrl,
                reason: `${characterOrNPC.name} is posting a message without embed.`,
            });
            return { webhook: createdWebhook, characterOrNPC };
        }
        return { webhook: existingWebhook, characterOrNPC };
    }
    async getNPCEmbed(message, npc) {
        const embed = EmbedBuilder.from(NPC.getNPCEmbed(npc).embeds[0]);
        embed.setDescription(message.content);
        return embed;
    }
    async onCharacterReactionAdd([reaction, user]) {
        switch (reaction.emoji.name) {
            case "📝":
                const dbMessage = await Database.getMessage(reaction.message.id);
                if (!dbMessage) {
                    console.log("Mensagem não encontrada no banco de dados");
                    return;
                }
                if (dbMessage.authorId !== user.id) {
                    const feedback = await reaction.message.channel.send(`${user.toString()}, você não pode editar a mensagem de outra pessoa.`);
                    void Utils.scheduleMessageToDelete(feedback);
                    return;
                }
                this.isEditingMap.set(user.id, true);
                const feedback = await reaction.message.channel.send(`${user.toString()}, você tem 30 minutos para editar sua mensagem. Qualquer mensagem enviada por você nesse canal será considerada a mensagem final.`);
                void Utils.scheduleMessageToDelete(feedback);
                const collector = reaction.message.channel.createMessageCollector({
                    filter: (msg) => msg.author.id === user.id,
                    time: Duration.fromObject({ minutes: 30 }).as("milliseconds"),
                    max: 1,
                });
                collector.on("end", async (collectedMessages) => {
                    try {
                        const newContentMessage = collectedMessages.first();
                        if (!newContentMessage)
                            return;
                        const originalMessage = await reaction.message.channel.messages.fetch(dbMessage.id).catch(() => null);
                        if (!originalMessage || !originalMessage.embeds.length) {
                            return;
                        }
                        const databaseUser = await Database.getUser(user.id);
                        if (!databaseUser)
                            return;
                        if (databaseUser.doesNotUseEmbeds) {
                            await originalMessage.edit(newContentMessage.content);
                            await Utils.scheduleMessageToDelete(newContentMessage, 0);
                            return;
                        }
                        const embed = EmbedBuilder.from(originalMessage.embeds[0]);
                        embed.setDescription(newContentMessage.content);
                        const originalAttachment = originalMessage.embeds[0].image?.url;
                        const attachment = newContentMessage.attachments.first();
                        if (attachment) {
                            const { imageKitLink, name } = await Utils.handleAttachment(attachment, embed);
                            await originalMessage.edit({ embeds: [embed], files: [{ attachment: imageKitLink, name }] });
                        }
                        else if (originalAttachment && !attachment) {
                            const attachmentName = originalAttachment.split("/").pop()?.split("?").shift();
                            if (!attachmentName)
                                return;
                            embed.setImage(`attachment://${attachmentName}`);
                            await originalMessage.edit({ embeds: [embed], files: [new AttachmentBuilder(originalAttachment).setName(attachmentName)] });
                        }
                        else {
                            await originalMessage.edit({ embeds: [embed] });
                        }
                        await Utils.scheduleMessageToDelete(newContentMessage, 0);
                    }
                    catch (error) {
                        console.error("Erro ao editar mensagem", error);
                    }
                    finally {
                        this.isEditingMap.delete(user.id);
                    }
                });
                break;
            case "🗑️":
                const dbMessageToDelete = await Database.getMessage(reaction.message.id);
                if (dbMessageToDelete)
                    this.isEditingMap.delete(dbMessageToDelete.authorId);
                if (!dbMessageToDelete) {
                    console.log("Mensagem não encontrada no banco de dados");
                    return;
                }
                if (dbMessageToDelete.authorId !== user.id) {
                    const feedback = await reaction.message.channel.send(`${user.toString()}, você não pode deletar a mensagem de outra pessoa.`);
                    void Utils.scheduleMessageToDelete(feedback);
                    return;
                }
                await reaction.message.delete();
                break;
        }
    }
    async handleActivityGains(character, message) {
        if (!character?.userId) {
            console.log("Personagem sem userId");
            return false;
        }
        const user = await Database.getUser(character.userId);
        if (!user) {
            console.log("Usuário não encontrado");
            return false;
        }
        const hasBeenThirtyMinutes = DateTime.now().diff(DateTime.fromJSDate(user.lastMessageAt ?? new Date()), "minutes").minutes >= 30;
        if (!hasBeenThirtyMinutes)
            return false;
        const randomMoney = lodash.random(250, 500);
        await Database.updateUser(character.userId, {
            money: BigInt(randomMoney + Number(user?.money ?? 0)),
            lastMessageAt: DateTime.now().toJSDate(),
        });
        const databaseChannel = await Database.getChannel(message.channelId);
        if (!databaseChannel)
            return false;
        const isInCorrectChannel = PROFESSION_CHANNELS[databaseChannel.channelType].includes(character.profession);
        const randomCharXpMin = isInCorrectChannel ? 50 : 2.5;
        const randomCharXpMax = isInCorrectChannel ? 100 : 5.0;
        const randomCharXp = lodash.random(randomCharXpMin, randomCharXpMax);
        const { willLevelUp } = Character.getCharacterLevelDetails(character);
        if (willLevelUp(character.xp + randomCharXp)) {
            const newLevel = character.level + 1;
            const feedback = await message.channel.send(`🎉 ${message.author.toString()}, o personagem ${bold(character.name)} subiu para o nível ${bold(newLevel.toString())}!`);
            void Utils.scheduleMessageToDelete(feedback);
            const updatedChar = await Database.updateSheet(character.userId, character.id, { xp: 0, level: newLevel });
            if (!updatedChar)
                return false;
            achievements.emit(AchievementEvents.onCharacterLevelUp, { character: updatedChar, user: message.author });
        }
        else {
            await Database.updateSheet(character.userId, character.id, { xp: character.xp + randomCharXp });
        }
        return true;
    }
};
__decorate([
    On({ event: Events.MessageCreate }),
    Guard(isRoleplayingChannel)
], CharacterEvents.prototype, "onCharacterMessage", null);
__decorate([
    On({ event: Events.MessageReactionAdd }),
    Guard(isRoleplayingChannel)
], CharacterEvents.prototype, "onCharacterReactionAdd", null);
CharacterEvents = __decorate([
    Discord()
], CharacterEvents);
export default CharacterEvents;
