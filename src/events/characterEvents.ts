import { BaseMessageOptions, Colors, EmbedBuilder, Events } from "discord.js";
import { ArgsOf, Discord, Guard, On } from "discordx";
import { Duration } from "luxon";
import Database from "../database";
import { isRoleplayingChannel } from "../guards/isRoleplayingChannel";
import { royalCharacterSchema } from "../schemas/characterSheetSchema";
import Utils from "../utils";

@Discord()
export default class CharacterEvents {
  private isEditingMap = new Map<string, boolean>();

  @On({ event: Events.MessageCreate })
  @Guard(isRoleplayingChannel)
  public async onCharacterMessage([message]: ArgsOf<"messageCreate">) {
    if (message.author.bot) return;
    if (this.isEditingMap.get(message.author.id)) return;

    const character = await Database.getActiveSheet(message.author.id);
    if (!character) return;

    const embed = new EmbedBuilder()
      .setTimestamp()
      .setThumbnail(character.imageUrl)
      .setColor(Colors.Blurple)
      .setDescription(message.content)
      .setTitle(character.name);

    const royalCharacter = royalCharacterSchema.safeParse(character);
    if (royalCharacter.success) {
      const family = await Database.getFamily(royalCharacter.data.familySlug);
      embed.setTitle(`${royalCharacter.data.royalTitle} ${royalCharacter.data.name}`);
      embed.setAuthor({ name: family?.title ?? "Família não encontrada" });
    }

    await Utils.scheduleMessageToDelete(message, 0);

    const attachment = message.attachments.first();
    const payload: BaseMessageOptions = { embeds: [embed] };
    if (attachment) {
      const imgurLink = await Utils.uploadToImgur(attachment.url);
      const imageName = imgurLink.split("/").pop();
      if (!imageName) return;
      embed.setImage(`attachment://${imageName}`);
      payload.files = [{ attachment: attachment.url, name: imageName }];
    }
    const embedMessage = await message.channel.send(payload);
    embedMessage.author.id = message.author.id;
    await Database.insertMessage(embedMessage);
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
            const { imgurLink, name } = await Utils.handleAttachment(attachment, embed);
            await originalMessage.edit({ embeds: [embed], files: [{ attachment: imgurLink, name }] });
          } else if (originalAttachment && !attachment) {
            embed.setImage(`attachment://${originalAttachment.name}`);
            await originalMessage.edit({ embeds: [embed], files: [originalAttachment] });
          }
          await originalMessage.edit({ embeds: [embed] });
          this.isEditingMap.delete(newContentMessage.author.id);
          Utils.scheduleMessageToDelete(newContentMessage, 0);
        });
    }
  }
}
