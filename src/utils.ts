import { Attachment, bold, ButtonInteraction, ChatInputCommandInteraction, EmbedBuilder, Message } from "discord.js";
import { readFile } from "fs/promises";
import ImageKit from "imagekit";
import lodash from "lodash";
import { Duration } from "luxon";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";
import { createSheetModalId } from "./components/CreateSheetModal";
import { RESOURCES_EMOJIS, RESOURCES_TRANSLATIONS } from "./data/constants";
import { bot } from "./main";
import { Family, familySchema } from "./schemas/familySchema";
import { Resources } from "./schemas/resourceSchema";

type Entity = { title: string; slug: string };
type Origin = { channelId: string; id: string; name: string; organization?: string; description: string };
type RootYamlType = { families: Array<Family>; entities: Array<Entity>; origins: Array<Origin> };

const imageKit = new ImageKit({
  publicKey: "public_yIN9ilRCsWfYXnA3cMDpm/wFRBw=",
  urlEndpoint: "https://ik.imagekit.io/ez2m5kovtw",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
});

export default class Utils {
  public static async uploadToImageKit(url: string) {
    const upload = await imageKit.upload({
      file: url,
      fileName: `${Date.now()}.png`,
    });
    return upload.url;
  }

  public static async awaitModalSubmission(interaction: ButtonInteraction | ChatInputCommandInteraction, id = createSheetModalId) {
    try {
      return await interaction.awaitModalSubmit({
        time: Duration.fromObject({ minutes: 60 }).as("milliseconds"),
        filter: (modalInteraction) => modalInteraction.customId === id,
      });
    } catch (error) {
      console.log(`${interaction.user.username} não enviou a ficha a tempo.`);
      return null;
    }
  }

  public static async scheduleMessageToDelete(message: Message, time?: number) {
    bot.messageQueue.enqueue({
      id: message.id,
      execute: async () => {
        const messageDelete = message.delete.bind(message);
        lodash.delay(() => messageDelete, time || 15_000);
      },
    });
  }

  public static async handleAttachment(attachment: Attachment, embed: EmbedBuilder) {
    const imageKitLink = await Utils.uploadToImageKit(attachment.url);
    const imageName = imageKitLink.split("/").pop();
    if (!imageName) throw new Error("Não foi possível obter o nome da imagem");
    embed.setImage(`attachment://${imageName}`);
    return { imageKitLink, name: imageName };
  }

  //TODO: Moving this file will cause the method getProjectRootDir() to stop working. Need to find a better way to do this.
  /**
   * This utils file is located in the project root directory, so we can use it to get the project root directory.
   * @returns {string} The project root directory
   */
  public static getProjectRootDir(): string {
    return path.dirname(fileURLToPath(import.meta.url));
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

  public static async fetchEntities() {
    const { entities } = await this.fetchRootYaml<RootYamlType>();
    return entities;
  }

  public static async fetchOrigins() {
    const { origins } = await this.fetchRootYaml<RootYamlType>();
    return origins;
  }

  public static getResourcesString(resources: Resources) {
    return Object.entries(resources)
      .map(([key, value]) => {
        type ResourceName = keyof typeof resources;
        const emoji = RESOURCES_EMOJIS[key as ResourceName];
        const translation = RESOURCES_TRANSLATIONS[key as ResourceName];
        return `${emoji} ${bold(translation)}: ${value}`;
      })
      .join("\n");
  }

  private static async fetchRootYaml<T>(fileName = "static.yaml") {
    const file = await readFile(path.join(this.getProjectRootDir(), "assets", fileName), "utf-8");
    return yaml.parse(file) as T;
  }

  public static parseContent(content: string) {
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
