import axios from "axios";
import { Attachment, ButtonStyle, EmbedBuilder, Message } from "discord.js";
import { readFile } from "fs/promises";
import lodash from "lodash";
import path from "path";
import yaml from "yaml";
import { Family, familySchema } from "./schemas/familySchema";

type Entity = { title: string; slug: string };
type RootYamlType = { families: Array<Family>; entities: Array<Entity> };
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

  public static async fetchBaseFamilies() {
    const { families } = await this.fetchRootYaml<RootYamlType>();
    const emptyFamilyObject = {
      population: 0,
      populationCap: 0,
      populationGrowth: 0,
      wood: 0,
      stone: 0,
      iron: 0,
      food: 0,
      gold: 0,
    };
    return families.map((family) => familySchema.parse({ ...emptyFamilyObject, ...family }));
  }

  public static async fetchEntityNames() {
    const { entities } = await this.fetchRootYaml<RootYamlType>();
    return entities;
  }

  private static async fetchRootYaml<T>() {
    const projectRoot = process.cwd();
    const file = await readFile(path.join(projectRoot, "transformations.yaml"), "utf-8");
    return yaml.parse(file) as T;
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
