import { bold } from "discord.js";
import { readFile } from "fs/promises";
import ImageKit from "imagekit";
import lodash from "lodash";
import { Duration } from "luxon";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";
import { createSheetModalId } from "./components/CreateSheetModal";
import { RESOURCES_EMOJIS, RESOURCES_TRANSLATIONS } from "./data/constants";
import { familySchema } from "./schemas/familySchema";
const imageKit = new ImageKit({
    publicKey: "public_yIN9ilRCsWfYXnA3cMDpm/wFRBw=",
    urlEndpoint: "https://ik.imagekit.io/ez2m5kovtw",
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});
export default class Utils {
    static async uploadToImageKit(url) {
        const upload = await imageKit.upload({
            file: url,
            fileName: `${Date.now()}.png`,
        });
        return upload.url;
    }
    static async awaitModalSubmission(interaction, id = createSheetModalId) {
        try {
            return await interaction.awaitModalSubmit({
                time: Duration.fromObject({ minutes: 60 }).as("milliseconds"),
                filter: (modalInteraction) => modalInteraction.customId === id,
            });
        }
        catch (error) {
            console.log(`${interaction.user.username} não enviou a ficha a tempo.`);
            return null;
        }
    }
    static async scheduleMessageToDelete(message, time) {
        // bot.messageQueue.enqueue({
        //   id: message.id,
        //   execute: async () => {
        //     const messageDelete = message.delete.bind(message);
        //     await new Promise((resolve) => setTimeout(resolve, time ?? 15_000));
        //     await messageDelete();
        //   },
        // });
        const messageDelete = message.delete.bind(message);
        await new Promise((resolve) => setTimeout(resolve, time ?? 15_000));
        await messageDelete();
    }
    static async handleAttachment(attachment, embed) {
        const imageKitLink = await Utils.uploadToImageKit(attachment.url);
        const imageName = imageKitLink.split("/").pop();
        if (!imageName)
            throw new Error("Não foi possível obter o nome da imagem");
        embed.setImage(`attachment://${imageName}`);
        return { imageKitLink, name: imageName };
    }
    //TODO: Moving this file will cause the method getProjectRootDir() to stop working. Need to find a better way to do this.
    /**
     * This utils file is located in the project root directory, so we can use it to get the project root directory.
     * @returns {string} The project root directory
     */
    static getProjectRootDir() {
        return path.dirname(fileURLToPath(import.meta.url));
    }
    static async fetchBaseFamilies() {
        const { families } = await this.fetchRootYaml();
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
    static async fetchEntities() {
        const { entities } = await this.fetchRootYaml();
        return entities;
    }
    static async fetchOrigins() {
        const { origins } = await this.fetchRootYaml();
        return origins;
    }
    static getResourcesString(resources) {
        return Object.entries(resources)
            .map(([key, value]) => {
            const emoji = RESOURCES_EMOJIS[key];
            const translation = RESOURCES_TRANSLATIONS[key];
            return `${emoji} ${bold(translation)}: ${value}`;
        })
            .join("\n");
    }
    static async fetchRootYaml(fileName = "static.yaml") {
        const file = await readFile(path.join(this.getProjectRootDir(), "assets", fileName), "utf-8");
        return yaml.parse(file);
    }
    static parseContent(content) {
        const lines = content.split("\n").filter((line) => line.trim() !== "");
        const isTitle = (line) => line.startsWith("#");
        let title = "", description = "";
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
