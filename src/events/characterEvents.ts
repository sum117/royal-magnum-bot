import { BaseMessageOptions, bold, EmbedBuilder, Events, Message } from "discord.js";
import { ArgsOf, Discord, Guard, On } from "discordx";
import lodash from "lodash";
import { Duration } from "luxon";
import Character from "../commands/character";
import NPC from "../commands/npc";
import { PROFESSION_CHANNELS } from "../data/constants";
import Database from "../database";
import { isRoleplayingChannel } from "../guards/isRoleplayingChannel";
import { CharacterSheetType } from "../schemas/characterSheetSchema";
import { NPC as NPCType } from "../schemas/npc";
import Utils from "../utils";

@Discord()
export default class CharacterEvents {
  private isEditingMap = new Map<string, boolean>();

  @On({ event: Events.MessageCreate })
  @Guard(isRoleplayingChannel)
  public async onCharacterMessage([message]: ArgsOf<"messageCreate">) {
    if (message.author.bot || this.isEditingMap.get(message.author.id)) return;

    const user = await Database.getUser(message.author.id);

    let embed: EmbedBuilder;
    if (user.currentNpcId) {
      const npc = await Database.getNPC(user.currentNpcId);
      if (!npc) return;
      embed = await this.getNPCEmbed(message, npc);
    } else {
      const character = await Database.getActiveSheet(message.author.id);
      if (!character) return;

      embed = await Character.getCharacterRPEmbed(message, character);
      await this.handleActivityGains(character, message);
    }

    await Utils.scheduleMessageToDelete(message, 0);

    const payload: BaseMessageOptions = { embeds: [embed] };
    const attachment = message.attachments.first();
    if (attachment) {
      const { imageKitLink, name } = await Utils.handleAttachment(attachment, embed);
      payload.files = [{ attachment: imageKitLink, name }];
    }
    const embedMessage = await message.channel.send(payload);
    embedMessage.author.id = message.author.id;
    await Database.insertMessage(embedMessage);
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
          const originalMessage = await reaction.message.channel.messages.fetch(dbMessage.id);
          if (!originalMessage || !originalMessage.embeds.length) return;

          const embed = EmbedBuilder.from(originalMessage.embeds[0]);
          embed.setDescription(newContentMessage.content);

          const originalAttachment = originalMessage.attachments.first();
          const attachment = newContentMessage.attachments.first();
          if (attachment) {
            const { imageKitLink, name } = await Utils.handleAttachment(attachment, embed);
            await originalMessage.edit({ embeds: [embed], files: [{ attachment: imageKitLink, name }] });
          } else if (originalAttachment && !attachment) {
            embed.setImage(`attachment://${originalAttachment.name}`);
            await originalMessage.edit({ embeds: [embed], files: [originalAttachment] });
          }
          await originalMessage.edit({ embeds: [embed] });
          this.isEditingMap.delete(newContentMessage.author.id);
          Utils.scheduleMessageToDelete(newContentMessage, 0);
        });
        break;
      case "🗑️":
        const dbMessageToDelete = await Database.getMessage(reaction.message.id);
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

    const hasBeenThirtyMinutes =
      Duration.fromISO(user?.lastMessageAt ?? new Date().toISOString())
        .plus({ minutes: 30 })
        .toMillis() < Date.now();
    if (!hasBeenThirtyMinutes) return;

    const randomMoney = lodash.random(250, 500);
    await Database.updateUser(character.userId, {
      money: user?.money + randomMoney,
      lastMessageAt: new Date().toISOString(),
    });

    const databaseChannel = await Database.getChannel(message.channelId);
    if (!databaseChannel) return;

    const isInCorrectChannel = PROFESSION_CHANNELS[databaseChannel.type].includes(character.profession);
    const randomCharXpMin = isInCorrectChannel ? 50 : 25;
    const randomCharXpMax = isInCorrectChannel ? 100 : 50;
    const randomCharXp = lodash.random(randomCharXpMin, randomCharXpMax);
    const { willLevelUp } = Character.getCharacterLevelDetails(character);

    if (willLevelUp(character.xp + randomCharXp)) {
      const newLevel = character.level + 1;
      const feedback = await message.channel.send(
        `🎉 ${message.author.toString()}, o personagem ${bold(character.name)} subiu para o nível ${bold(newLevel.toString())}!`,
      );
      Utils.scheduleMessageToDelete(feedback);
      await Database.updateSheet(character.userId, character.characterId, { xp: 0, level: newLevel });
    } else {
      await Database.updateSheet(character.userId, character.characterId, { xp: character.xp + randomCharXp });
    }
  }
}
