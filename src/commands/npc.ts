import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ColorResolvable,
  Colors,
  EmbedBuilder,
} from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { ConfirmationPrompt } from "../components/ConfirmationPrompt";
import { createNPCModal, createNPCModalFieldIds, createNPCModalId } from "../components/CreateNPCModal";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { CHANNEL_IDS } from "../data/constants";
import Database from "../database";
import { bot } from "../main";
import type { NPC as NPCType } from "../schemas/npc";
import { imageGifUrl } from "../schemas/utils";
import Utils from "../utils";

export const buyNpcButtonIdPrefix = "buyNPC";
export const getBuyNPCButtonId = (npcId: string) => `${buyNpcButtonIdPrefix}-${npcId}`;

@Discord()
export default class NPC {
  public static getNPCEmbed(npc: NPCType, isStorePreview = false) {
    const price = npc.price > 0 ? npc.price.toString() : "Grátis";
    const embed = new EmbedBuilder()
      .setAuthor({ name: npc.title })
      .setTitle(npc.name)
      .setDescription(npc.description)
      .setColor(lodash.sample(Object.values(Colors)) as ColorResolvable)
      .setThumbnail(npc.image);

    if (isStorePreview) {
      const buyNPCButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(getBuyNPCButtonId(npc.id)).setLabel("Comprar Acesso").setStyle(ButtonStyle.Success),
      );
      embed.addFields([{ name: "Preço", value: price, inline: true }]);
      return { embeds: [embed], components: [buyNPCButton] };
    } else return { embeds: [embed] };
  }

  @Slash(COMMANDS.createNPC)
  public async createNPC(interaction: ChatInputCommandInteraction) {
    await interaction.showModal(createNPCModal);

    const modalSubmit = await Utils.awaitModalSubmission(interaction, createNPCModalId);
    if (!modalSubmit) return;

    await modalSubmit.deferReply();

    const [title, name, description, image, price] = createNPCModalFieldIds.map((fieldId) => modalSubmit.fields.getTextInputValue(fieldId));

    const imageUrl = imageGifUrl.safeParse(image).success ? image : null;
    if (!imageUrl) {
      await modalSubmit.editReply("Você precisa fornecer uma imagem válida para o NPC");
      return;
    }

    const priceNumber = isNaN(Number(price)) ? null : Number(price);
    if (priceNumber === null || priceNumber < 0) {
      await modalSubmit.editReply("Você precisa fornecer um preço válido para o NPC");
      return;
    }

    const newNPC = await Database.insertNPC({ title, name, description, image: imageUrl, drops: [], usersWithAccess: [], price: priceNumber });
    await modalSubmit.editReply({ content: "NPC criado com sucesso!", files: [new AttachmentBuilder(imageUrl).setName(`${lodash.kebabCase(name)}.png`)] });

    const storeChannel = bot.systemChannels.get(CHANNEL_IDS.generalStore)!;
    await storeChannel.send(NPC.getNPCEmbed(newNPC, true));
  }

  @Slash(COMMANDS.setNPC)
  public async setNPC(@SlashOption(COMMAND_OPTIONS.npcId) npcId: string | null = null, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await Database.getUser(interaction.user.id);
    if (!user) {
      await interaction.editReply({ content: "Usuário não encontrado" });
      return;
    }

    if (!npcId) {
      await Database.updateUser(interaction.user.id, { currentNpcId: undefined });
      await interaction.editReply({ content: "Você não está mais utilizando nenhum NPC" });
      return;
    }

    const npc = await Database.getNPC(npcId);
    if (!npc) {
      await interaction.reply({ content: "NPC não encontrado", ephemeral: true });
      return;
    }

    if (!npc.usersWithAccess.includes(interaction.user.id)) {
      await interaction.editReply({ content: "Você não tem acesso a esse NPC. Boa tentativa :)" });
      return;
    }

    await Database.updateUser(interaction.user.id, { currentNpcId: npcId });
    await interaction.editReply({ content: `Você agora está utilizando ${npc.name}` });
  }

  @Slash(COMMANDS.deleteNPC)
  public async deleteNPC(@SlashOption(COMMAND_OPTIONS.npcId) npcId: string, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const npc = await Database.getNPC(npcId);
    if (!npc) {
      await interaction.reply({ content: "NPC não encontrado", ephemeral: true });
      return;
    }
    await Database.deleteNPC(npcId);
    await interaction.editReply({ content: `NPC ${npc.name} deletado com sucesso!` });
  }

  @ButtonComponent({ id: new RegExp(`^${buyNpcButtonIdPrefix}`) })
  public async buyNPCButtonListener(buttonInteraction: ButtonInteraction) {
    await buttonInteraction.deferReply({ ephemeral: true });
    const npcId = buttonInteraction.customId.split("-")[1];

    const npc = await Database.getNPC(npcId);
    if (!npc) {
      await buttonInteraction.editReply({ content: "NPC não encontrado" });
      return;
    }

    const user = await Database.getUser(buttonInteraction.user.id);
    if (!user) {
      await buttonInteraction.editReply({ content: "Usuário não encontrado" });
      return;
    }

    if (user.money < npc.price) {
      await buttonInteraction.editReply({ content: "Você não tem dinheiro suficiente" });
      return;
    }

    if (npc.usersWithAccess.includes(buttonInteraction.user.id)) {
      await buttonInteraction.reply({ content: "Você já tem acesso a esse NPC", ephemeral: true });
      return;
    }

    const confirmationPrompt = new ConfirmationPrompt({
      promptMessage: `Você tem certeza que deseja comprar acesso para utilizar ${npc.name} por C$${npc.price}? Essa ação é irreversível.`,
    });

    const sentPrompt = await confirmationPrompt.send(buttonInteraction);

    sentPrompt.collector.on("collect", async (promptInteraction) => {
      console.log(promptInteraction.customId, confirmationPrompt.confirmButtonId);
      await promptInteraction.deferReply({ ephemeral: true });
      if (promptInteraction.customId === confirmationPrompt.confirmButtonId) {
        await Database.updateUser(buttonInteraction.user.id, { money: user.money - npc.price });
        await Database.updateNPC(npcId, { usersWithAccess: [...npc.usersWithAccess, buttonInteraction.user.id] });
        Utils.scheduleMessageToDelete(
          await promptInteraction.editReply({
            content: `🎉 Você comprou acesso para utilizar ${npc.name} por C$${npc.price}!`,
            components: [],
          }),
        );
      } else {
        Utils.scheduleMessageToDelete(await promptInteraction.editReply({ content: "Compra cancelada." }));
      }
    });
  }
}
