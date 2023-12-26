import axios from "axios";
import { Attachment, EmbedBuilder, GuildTextBasedChannel, Message } from "discord.js";
import lodash from "lodash";

export default class Utils {
  public static async uploadToImgur(url: string) {
    const response = await axios.post(
      "https://api.imgur.com/3/image",
      { image: url },
      { headers: { Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}` } },
    );
    return response.data.data.link as string;
  }

  public static async scheduleMessageToDelete(message: Message, time?: number) {
    await new Promise((resolve) => setTimeout(resolve, time ?? 10000));
    try {
      await message.delete();
    } catch (error) {
      console.log(`Não foi possível deletar a mensagem ${message.id}`);
    }
  }
  public static async handleAttachment(attachment: Attachment, embed: EmbedBuilder) {
    const imgurLink = await Utils.uploadToImgur(attachment.url);
    const imageName = imgurLink.split("/").pop();
    if (!imageName) throw new Error("Não foi possível obter o nome da imagem");
    embed.setImage(`attachment://${imageName}`);
    return { imgurLink: imgurLink, name: imageName };
  }

  public static async fetchFamiliesFromDiscord(channel: GuildTextBasedChannel) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const families = [];
    for (const [_, message] of messages) {
      if (message.attachments.size < 1) continue;
      const attachment = message.attachments.first()!;
      const { title, description, slug } = this.parseContent(message.content);
      if (title === "Explicação") continue;
      const image = attachment.url;
      families.push({ title, description, slug, image });
    }
    return families;
  }

  private static parseContent(content: string) {
    const lines = content.split("\n").filter((line) => line.trim() !== "");
    const isTitle = (line: string) => line.startsWith("#");

    let title = "",
      description = "";
    for (let line of lines) {
      if (isTitle(line)) {
        title = line.slice(1).trim();
        continue;
      }
      description += line;
    }
    return { title, description, slug: lodash.kebabCase(title) };
  }
}
