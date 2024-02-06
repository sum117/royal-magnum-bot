import { AttachmentBuilder, BaseMessageOptions, bold, EmbedBuilder, Events, Message, TextChannel } from "discord.js";
import { ArgsOf, Discord, Guard, On } from "discordx";
import lodash from "lodash";
import { DateTime, Duration } from "luxon";
import { AchievementEvents } from "../achievements";
import Character from "../commands/character";
import NPC from "../commands/npc";
import { DISCORD_MESSAGE_CONTENT_LIMIT, PROFESSION_CHANNELS } from "../data/constants";
import Database from "../database";
import { isRoleplayingChannel } from "../guards/isRoleplayingChannel";
import { achievements } from "../main";
import { CharacterSheetType } from "../schemas/characterSheetSchema";
import { npcSchema, NPC as NPCType } from "../schemas/npc";
import Utils from "../utils";

@Discord()
export default class CharacterEvents {
  private isEditingMap = new Map<string, boolean>();
  @On({ event: Events.MessageCreate })
  @Guard(isRoleplayingChannel)
  public async onCharacterMessage([message]: ArgsOf<"messageCreate">) {
    if (message.author.bot || this.isEditingMap.get(message.author.id)) return;

    const isOutOfCharacter = /^(?:\(\(|\[\[|\{\{|\\\\|\/\/|OOC)/.test(message.content);
    if (isOutOfCharacter) {
      await Utils.scheduleMessageToDelete(message, Duration.fromObject({ minutes: 1 }).as("milliseconds"));
      return;
    }

    const user = await Database.getUser(message.author.id);

    let embed: EmbedBuilder;
    let hasGainedReward = false;
    let characterOrNPC: CharacterSheetType | NPCType | undefined;
    if (user.currentNpcId) {
      const npc = await Database.getNPC(user.currentNpcId);
      if (!npc) return;
      embed = await this.getNPCEmbed(message, npc);
      characterOrNPC = npc;
    } else {
      const character = await Database.getActiveSheet(message.author.id);
      if (!character) return;
      characterOrNPC = character;
      embed = await Character.getCharacterRPEmbed(message, character);
      hasGainedReward = await this.handleActivityGains(character, message);
    }

    await Utils.scheduleMessageToDelete(message, 0);

    const payload: BaseMessageOptions = { embeds: [embed] };
    const attachment = message.attachments.first();
    if (attachment) {
      const { imageKitLink, name } = await Utils.handleAttachment(attachment, embed);
      payload.files = [{ attachment: imageKitLink, name }];
    }

    if (user.doesNotUseEmbed) {
      const { webhook, characterParsed, npcParsed } = await this.getWebhook(message.channel as TextChannel, characterOrNPC);
      if (message.content.length >= DISCORD_MESSAGE_CONTENT_LIMIT) {
        const chunks = lodash.chunk(message.content, DISCORD_MESSAGE_CONTENT_LIMIT);
        for (const chunk of chunks) {
          const webhookMessage = await webhook.send({
            content: chunk.join(""),
            files: chunks.indexOf(chunk) === chunks.length - 1 ? payload.files : undefined,
            username: characterOrNPC.name,
            avatarURL: npcParsed.success ? npcParsed.data.image : characterParsed.success ? characterParsed.data.image : undefined,
          });
          webhookMessage.author.id = message.author.id;
          await Database.insertMessage(webhookMessage);
          achievements.emit(AchievementEvents.onCharacterMessage, { embedMessage: webhookMessage, user: message.author });
          if (hasGainedReward) {
            await webhookMessage.react("💰");
            await webhookMessage.react("📈");
          }
        }
      } else {
        const webhookMessage = await webhook.send({
          content: message.content,
          files: payload.files,
          username: characterOrNPC.name,
          avatarURL: npcParsed.success ? npcParsed.data.image : characterParsed.success ? characterParsed.data.image : undefined,
        });
        webhookMessage.author.id = message.author.id;
        await Database.insertMessage(webhookMessage);
        achievements.emit(AchievementEvents.onCharacterMessage, { embedMessage: webhookMessage, user: message.author });
        if (hasGainedReward) {
          await webhookMessage.react("💰");
          await webhookMessage.react("📈");
        }
      }
    } else {
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

  private async getWebhook(channel: TextChannel, characterOrNPC: CharacterSheetType | NPCType) {
    const webhooks = await channel.fetchWebhooks();
    const existingWebhook = webhooks.find((webhook) => webhook.name === characterOrNPC.name);
    const npcParsed = npcSchema.safeParse(characterOrNPC);
    const characterParsed = npcSchema.safeParse(characterOrNPC);
    if (!existingWebhook) {
      const createdWebhook = await channel.createWebhook({
        name: characterOrNPC.name,
        avatar: npcParsed.success ? npcParsed.data.image : characterParsed.success ? characterParsed.data.image : undefined,
        reason: `${characterOrNPC.name} is posting a message without embed.`,
      });
      return { webhook: createdWebhook, npcParsed, characterParsed };
    }
    return { webhook: existingWebhook, npcParsed, characterParsed };
  }

  private async getNPCEmbed(message: Message, npc: NPCType) {
    const embed = EmbedBuilder.from(NPC.getNPCEmbed(npc).embeds[0]);
    embed.setDescription(message.content);
    return embed;
  }

  @On({ event: Events.MessageReactionAdd })
  @Guard(isRoleplayingChannel)
  public async onCharacterReactionAdd([reaction, user]: ArgsOf<"messageReactionAdd">) {
    switch (reaction.emoji.name) {
      case "📝":
        const dbMessage = await Database.getMessage(reaction.message.id);
        if (!dbMessage) {
          console.log("Mensagem não encontrada no banco de dados");
          return;
        }
        if (dbMessage.authorId !== user.id) {
          const feedback = await reaction.message.channel.send(`${user.toString()}, você não pode editar a mensagem de outra pessoa.`);
          Utils.scheduleMessageToDelete(feedback);
          return;
        }
        this.isEditingMap.set(user.id, true);

        const feedback = await reaction.message.channel.send(
          `${user.toString()}, você tem 30 minutos para editar sua mensagem. Qualquer mensagem enviada por você nesse canal será considerada a mensagem final.`,
        );
        Utils.scheduleMessageToDelete(feedback);

        const collector = reaction.message.channel.createMessageCollector({
          filter: (msg) => msg.author.id === user.id,
          time: Duration.fromObject({ minutes: 30 }).as("milliseconds"),
          max: 1,
        });

        collector.on("end", async (collectedMessages) => {
          const newContentMessage = collectedMessages.first();
          if (!newContentMessage) return;
          const originalMessage = await reaction.message.channel.messages.fetch(dbMessage.id).catch(() => null);
          if (!originalMessage || !originalMessage.embeds.length) {
            if (this.isEditingMap.get(user.id)) this.isEditingMap.delete(user.id);
            return;
          }

          const embed = EmbedBuilder.from(originalMessage.embeds[0]);
          embed.setDescription(newContentMessage.content);

          const originalAttachment = originalMessage.embeds[0].image?.url;
          const attachment = newContentMessage.attachments.first();
          if (attachment) {
            const { imageKitLink, name } = await Utils.handleAttachment(attachment, embed);
            await originalMessage.edit({ embeds: [embed], files: [{ attachment: imageKitLink, name }] });
          } else if (originalAttachment && !attachment) {
            const attachmentName = originalAttachment.split("/").pop()?.split("?").shift();
            if (!attachmentName) return;
            embed.setImage(`attachment://${attachmentName}`);
            await originalMessage.edit({ embeds: [embed], files: [new AttachmentBuilder(originalAttachment).setName(attachmentName)] });
          } else {
            await originalMessage.edit({ embeds: [embed] });
          }
          this.isEditingMap.delete(newContentMessage.author.id);
          Utils.scheduleMessageToDelete(newContentMessage, 0);
        });
        break;
      case "🗑️":
        const dbMessageToDelete = await Database.getMessage(reaction.message.id);
        if (dbMessageToDelete) this.isEditingMap.delete(dbMessageToDelete.authorId);
        if (!dbMessageToDelete) {
          console.log("Mensagem não encontrada no banco de dados");
          return;
        }
        if (dbMessageToDelete.authorId !== user.id) {
          const feedback = await reaction.message.channel.send(`${user.toString()}, você não pode deletar a mensagem de outra pessoa.`);
          Utils.scheduleMessageToDelete(feedback);
          return;
        }
        await reaction.message.delete();
        break;
    }
  }

  private async handleActivityGains(character: CharacterSheetType, message: Message<boolean>) {
    const user = await Database.getUser(character.userId);

    const hasBeenThirtyMinutes = DateTime.now().diff(DateTime.fromISO(user?.lastMessageAt ?? "1970-01-01T00:00:00.000Z"), "minutes").minutes >= 30;
    if (!hasBeenThirtyMinutes) return false;

    const randomMoney = lodash.random(250, 500);
    await Database.updateUser(character.userId, {
      money: randomMoney + (user?.money ?? 0),
      lastMessageAt: DateTime.now().toISO(),
    });

    const databaseChannel = await Database.getChannel(message.channelId);
    if (!databaseChannel) return false;

    const isInCorrectChannel = PROFESSION_CHANNELS[databaseChannel.type].includes(character.profession);
    const randomCharXpMin = isInCorrectChannel ? 5 : 2.5;
    const randomCharXpMax = isInCorrectChannel ? 10 : 5;
    const randomCharXp = lodash.random(randomCharXpMin, randomCharXpMax);
    const { willLevelUp } = Character.getCharacterLevelDetails(character);

    if (willLevelUp(character.xp + randomCharXp)) {
      const newLevel = character.level + 1;
      const feedback = await message.channel.send(
        `🎉 ${message.author.toString()}, o personagem ${bold(character.name)} subiu para o nível ${bold(newLevel.toString())}!`,
      );
      Utils.scheduleMessageToDelete(feedback);
      const updatedChar = await Database.updateSheet(character.userId, character.characterId, { xp: 0, level: newLevel });
      if (!updatedChar) return false;
      achievements.emit(AchievementEvents.onCharacterLevelUp, { character: updatedChar, user: message.author });
    } else {
      await Database.updateSheet(character.userId, character.characterId, { xp: randomCharXp + character.xp });
    }

    return true;
  }
}
