import axios from "axios";
import { AttachmentBuilder, codeBlock } from "discord.js";
import { ArgsOf, Discord, On } from "discordx";
import JSZip from "jszip";
import lodash from "lodash";
import { Duration } from "luxon";
import { CHANNEL_IDS, ROLE_IDS } from "../data/constants";
import Database from "../database";
import { Queue } from "../queue";
import Utils from "../utils";

@Discord()
export default class onImageGenerationRequest {
  private imageGenerationQueue: Queue;
  constructor() {
    this.imageGenerationQueue = new Queue();
  }

  private TIME_PER_PERSON = 2 * 60 * 1000;
  @On({ event: "messageCreate" })
  async main([message]: ArgsOf<"messageCreate">) {
    if (message.channel.id !== CHANNEL_IDS.imageGenerationChannel || message.author.bot || !message.content.toLowerCase().startsWith("generate")) return;
    const member = await message.member?.fetch(true);
    if (!member) return;
    const isNitro = member.premiumSinceTimestamp !== null;
    const isAllowedMember = member.roles.cache.has(ROLE_IDS.admin) || member.roles.cache.has(ROLE_IDS.member) || isNitro;
    if (!isAllowedMember) {
      await message.reply("Você não tem permissão para usar este canal.").then(void Utils.scheduleMessageToDelete);
      return;
    }
    const user = await Database.getUser(message.author.id);
    if (!user) {
      await message.reply("Você não está registrado no nosso sistema.").then(void Utils.scheduleMessageToDelete);
      return;
    }

    const imageGenerationCost = 200;
    if (!isNitro && user?.money < imageGenerationCost) {
      await message
        .reply(
          "Você não tem pontos de atividade o suficiente para gerar uma imagem. Você pode ganhar pontos de atividade fazendo RP.\n\n💡 Usuários Nitro podem gerar imagens gratuitamente. Considere apoiar nosso servidor.",
        )
        .then(void Utils.scheduleMessageToDelete);
      return;
    }

    const isAlreadyInQueue = this.imageGenerationQueue.find(message.author.id);
    if (isAlreadyInQueue) {
      const currentPosition = this.imageGenerationQueue.findPosition(message.author.id);
      const timeLeft = (this.imageGenerationQueue.length - currentPosition) * this.TIME_PER_PERSON;
      await message
        .reply(
          `Você já está na fila. Tempo estimado para a sua vez: {time}. Posição na fila: {position}`
            .replace("{time}", Duration.fromMillis(timeLeft).toFormat("mm:ss"))
            .replace("{position}", currentPosition.toString()),
        )
        .then(void Utils.scheduleMessageToDelete);
      return;
    }
    this.imageGenerationQueue.enqueue({
      id: message.author.id,
      execute: async () => {
        const loadingMessage = await message.channel.send(`Gerando imagem para ${message.author.toString()}...`);
        async function generateImage() {
          try {
            const input = message.content.trim().split(",");
            input.shift();
            const seed = lodash.random(1000000000, 9999999999);
            const isLarge = input.includes("large");
            if (isLarge) input.splice(input.indexOf("large"), 1);

            console.log(`Processing image generation request from ${message.author.username} with input: ${input.join(",")}`);
            const data = {
              input: input.join(","),
              model: "nai-diffusion-3",
              action: "generate",
              parameters: {
                params_version: 1,
                width: isLarge ? 1216 : 832,
                height: isLarge ? 832 : 1216,
                scale: 5,
                sampler: "k_euler",
                steps: 28,
                seed,
                n_samples: 1,
                ucPreset: 0,
                qualityToggle: true,
                sm: false,
                sm_dyn: false,
                dynamic_thresholding: false,
                controlnet_strength: 1,
                legacy: false,
                add_original_image: true,
                uncond_scale: 1,
                cfg_rescale: 0,
                noise_schedule: "native",
                legacy_v3_extend: false,
                negative_prompt:
                  "nsfw, lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]",
              },
            };
            const result = await axios.post("https://api.novelai.net/ai/generate-image", data, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.NOVELAI_TOKEN}`,
              },
              responseType: "arraybuffer",
            });
            const zip = new JSZip();
            await zip.loadAsync(result.data);

            const image = await zip.file(Object.keys(zip.files)[0])?.async("nodebuffer");
            if (!image) {
              await message
                .reply("Não foi possível gerar a imagem. Tente novamente mais tarde ou com uma entrada diferente.")
                .then(void Utils.scheduleMessageToDelete);
              return;
            }
            const attachment = new AttachmentBuilder(image).setName(`${input.join(",").slice(0, 80)} s-${seed}.png`);
            if (!isNitro) {
              await Database.updateUser(message.author.id, { money: BigInt(Number(user?.money ?? 0) - imageGenerationCost) });
            }
            await message.channel.send({
              content: `{user}, aqui está a imagem gerada com base no prompt {prompt}\n💰{cost}`
                .replace("{prompt}", codeBlock(input.join(",")))
                .replace(
                  "{cost}",
                  isNitro ? "Por ser um usuário Nitro, você não foi cobrado." : `Você foi cobrado C$${imageGenerationCost} pontos de atividade.`,
                )
                .replace("{user}", message.author.toString()),
              files: [attachment],
            });
            console.log(`Image generation request from ${message.author.username} with input: ${input.join(",")} completed`);
          } catch (error) {
            console.error("Failed to generate image", error);
            await message
              .reply("Não foi possível gerar a imagem. Tente novamente mais tarde ou com uma entrada diferente.")
              .then(void Utils.scheduleMessageToDelete);
          } finally {
            await loadingMessage.delete().catch((error) => console.error("Failed to delete loading message", error));
          }
        }
        await new Promise((resolve) => setTimeout(resolve, this.TIME_PER_PERSON));
        await generateImage();
      },
    });
  }
}
