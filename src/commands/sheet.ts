import {
  ActionRowBuilder,
  AttachmentBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  bold,
  userMention,
} from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { DateTime, Duration } from "luxon";
import CreateSheetModal, { createRoyalSheetModalFieldIds, createSheetModalFieldIds, createSheetModalId } from "../components/CreateSheetModal";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { ATTACHMENT_ICON_URL, CHANNEL_IDS } from "../data/constants";
import Database from "../database";
import { Family } from "../schemas/familySchema";
import { imageGifUrl } from "../schemas/utils";
import Utils from "../utils";

export const createSheetButtonId = "createSheetButtonId";
export const createRoyalSheetButtonId = "createRoyalSheetButtonId";
export const selectSheetButtonId = "selectSheetButtonId";
export const getSpawnModalButtonId = (isRoyal: boolean, family?: Family) => `spawnModalButtonId_${family?.slug ?? "unknown"}_${isRoyal}`;

@Discord()
export default class Sheet {
  @Slash(COMMANDS.spawnSheet)
  public async spawnSheetCreator(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply();

    const randomColor = lodash.sample(Object.values(Colors));
    const embed = new EmbedBuilder()
      .setAuthor({
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ forceStatic: true, size: 128 }) ?? undefined,
      })
      .setTitle(`Criação de ficha de personagem  de ${interaction.guild.name}`)
      .setFooter({ text: "Clique no botão abaixo para começar a criação de ficha" })
      .setThumbnail("https://i.imgur.com/9Fkj6f5.jpg");

    if (randomColor) embed.setColor(randomColor);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setCustomId(createSheetButtonId).setEmoji("📝").setLabel("Criar ficha").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(createRoyalSheetButtonId).setEmoji("👑").setLabel("Criar ficha real").setStyle(ButtonStyle.Success),
    );
    const messageOptions: BaseMessageOptions = { embeds: [embed], components: [buttonRow] };
    await interaction.editReply(messageOptions);
  }

  @Slash(COMMANDS.giveRoyalToken)
  public async giveRoyalToken(@SlashOption(COMMAND_OPTIONS.giveRoyalTokenUser) user: GuildMember, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const databaseUser = await Database.getUser(user.id);
    await Database.updateUser(user.id, { royalTokens: databaseUser.royalTokens + 1 });
    await interaction.editReply({ content: `Ficha real dada com sucesso para ${userMention(user.id)}` });
    await interaction.channel?.send({ content: `👑 ${user.toString()} recebeu uma ficha real de ${interaction.user.toString()}!` });
  }

  @ButtonComponent({ id: createRoyalSheetButtonId })
  public async createRoyalSheetButtonListener(interaction: ButtonInteraction) {
    if (!interaction.inCachedGuild()) return;
    const familiesChannel = interaction.guild.channels.cache.get(CHANNEL_IDS.familiesChannel);
    if (!familiesChannel?.isTextBased()) return;

    await interaction.deferReply({ ephemeral: true, fetchReply: true });

    const user = await Database.getUser(interaction.user.id);
    if (user.royalTokens < 1) {
      await interaction.editReply({ content: "Você não possui fichas reais suficientes para criar uma ficha real." });
      return;
    }

    const families = await Utils.fetchFamilies();
    const selectMenuOptions = new Array<{ label: string; value: string }>();
    for (const family of families) {
      await Database.setFamily(family.slug, family);
      selectMenuOptions.push({ label: family.title, value: family.slug });
    }

    const selectMenus = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder("Escolha sua família")
        .setCustomId(selectSheetButtonId)
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(selectMenuOptions),
    );

    const messageWithSelector = await interaction.editReply({ content: "Selecione uma família para criar sua ficha:", components: [selectMenus] });

    const selectMenuSubmit = await messageWithSelector
      .awaitMessageComponent({
        time: Duration.fromObject({ minutes: 5 }).as("milliseconds"),
        filter: (menuInteraction) => menuInteraction.customId === selectSheetButtonId,
        componentType: ComponentType.StringSelect,
      })
      .catch(() => {
        console.log(`${interaction.user.username} não selecionou uma família a tempo.`);
        return null;
      });

    if (!selectMenuSubmit) {
      await interaction.editReply({ content: "Você não selecionou uma família a tempo." });
      return;
    }

    await selectMenuSubmit.deferReply({ ephemeral: true });
    await interaction.editReply({ content: "Família selecionada com sucesso.", components: [] });

    const familySlug = selectMenuSubmit.values[0];
    const family = await Database.getFamily(familySlug);
    if (!family) {
      await interaction.editReply({ content: "A família selecionada não existe." });
      return;
    }

    const button = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setCustomId(getSpawnModalButtonId(true, family)).setLabel(`Formulário dos(as) ${family.title}`).setStyle(ButtonStyle.Success),
    );
    await selectMenuSubmit.editReply({
      content: `Você selecionou a família ${bold(family.title)}. Pressione o botão abaixo para preencher o formulário de personagem.`,
      files: [new AttachmentBuilder(family.image).setName(`${family.slug}.png`)],
      components: [button],
    });
  }

  @ButtonComponent({ id: createSheetButtonId })
  public async createSheetButtonListener(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const button = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setCustomId(getSpawnModalButtonId(false)).setLabel("Formulário de personagem").setStyle(ButtonStyle.Success),
    );
    await interaction.editReply({ content: "Pressione o botão abaixo para preencher o formulário de personagem.", components: [button] });
  }

  @ButtonComponent({ id: /^spawnModalButtonId_.*$/ })
  public async spawnModalButtonListener(interaction: ButtonInteraction) {
    const [, familySlug, isRoyal] = interaction.customId.split("_");
    await interaction.showModal(CreateSheetModal(isRoyal === "true"));

    const modalSubmit = await this.awaitSubmission(interaction);
    if (!modalSubmit || !modalSubmit.inCachedGuild() || !modalSubmit.channel) return;

    await modalSubmit.deferReply({ ephemeral: true });
    const attachment = new AttachmentBuilder(ATTACHMENT_ICON_URL).setName("attachment.png");
    await modalSubmit.followUp({
      ephemeral: true,
      content: `Ficha criada com sucesso, por favor envie uma imagem do personagem EM ANEXO para concluir o processo.`,
      files: [attachment],
    });

    const imgurLink = await this.collectAttachment(modalSubmit);
    if (!imgurLink) {
      await modalSubmit.editReply("Não foi possível concluir a criação da ficha. Você não enviou um anexo válido a tempo.");
      return;
    }

    const sheetWaitingChannel = modalSubmit.guild.channels.cache.get(CHANNEL_IDS.sheetWaitingRoom);
    if (!sheetWaitingChannel?.isTextBased()) {
      await modalSubmit.editReply("Não foi possível concluir a criação da ficha. O canal de espera não existe.");
      return;
    }

    const { sheetEmbed, savedSheet } = await this.createSheetFromModal(modalSubmit, familySlug, isRoyal, imgurLink);
    const evaluationButtons = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setCustomId(`approve_${savedSheet.characterId}_${savedSheet.userId}`).setLabel("Aprovar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${savedSheet.characterId}_${savedSheet.userId}`).setLabel("Reprovar").setStyle(ButtonStyle.Danger),
    );
    await modalSubmit.editReply({
      content: `Ficha criada com sucesso! Aguarde a aprovação de um moderador em ${sheetWaitingChannel?.toString()}`,
    });
    await sheetWaitingChannel.send({ embeds: [sheetEmbed], components: [evaluationButtons] });
  }

  @ButtonComponent({ id: /^approve|reject_.*$/ })
  public async evaluateSheetButtonListener(interaction: ButtonInteraction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply({ ephemeral: true });
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      await interaction.editReply({ content: "Você não tem permissão para executar essa ação." });
      return;
    }
    const [action, characterId, userId] = interaction.customId.split("_");
    switch (action) {
      case "approve":
        const approvedSheetChannel = interaction.guild.channels.cache.get(CHANNEL_IDS.approvedSheetRoom);
        if (!approvedSheetChannel?.isTextBased()) {
          await interaction.editReply({ content: "Não foi possível aprovar a ficha. O canal de fichas aprovadas não existe." });
          return;
        }
        const apiEmbed = interaction.message.embeds.at(0);
        if (!apiEmbed) {
          await interaction.editReply({ content: "Não foi possível aprovar a ficha. A ficha não possui um embed." });
          return;
        }

        const embed = EmbedBuilder.from(apiEmbed);
        embed.setColor(Colors.Green);
        embed.setFooter({ text: `Aprovado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ forceStatic: true }) });
        embed.setTimestamp(DateTime.now().toJSDate());

        await Database.updateSheet(userId, characterId, { isApproved: true });
        await interaction.editReply({ content: "Ficha aprovada com sucesso." });
        await approvedSheetChannel.send({ content: userMention(userId), embeds: [embed] });
        Utils.scheduleMessageToDelete(interaction.message, 1000);
        break;
      case "reject":
        await Database.deleteSheet(userId, characterId);
        await interaction.editReply({ content: "Ficha reprovada com sucesso." });
        Utils.scheduleMessageToDelete(interaction.message, 1000);
        break;
    }
  }

  private async awaitSubmission(interaction: ButtonInteraction) {
    try {
      return await interaction.awaitModalSubmit({
        time: Duration.fromObject({ minutes: 60 }).as("milliseconds"),
        filter: (modalInteraction) => modalInteraction.customId === createSheetModalId,
      });
    } catch (error) {
      console.log(`${interaction.user.username} não enviou a ficha a tempo.`);
      return null;
    }
  }

  private async createSheetFromModal(modalSubmit: ModalSubmitInteraction, familySlug: string, isRoyal: string, imgurLink: string) {
    const fieldIds = isRoyal === "true" ? createRoyalSheetModalFieldIds : createSheetModalFieldIds;
    const [name, backstory, appearance, royalTitle, transformation] = fieldIds.map((customId) => modalSubmit.fields.getTextInputValue(customId));
    const sheetData =
      isRoyal === "true"
        ? { name, royalTitle, backstory, appearance, transformation, imageUrl: imgurLink, familySlug }
        : { name, backstory, appearance, imageUrl: imgurLink };

    const sheetEmbed = new EmbedBuilder()
      .setAuthor({
        name: modalSubmit.user.username,
        iconURL: modalSubmit.user.displayAvatarURL({ forceStatic: true, size: 128 }),
      })
      .setTitle(`Ficha de ${name}`)
      .setDescription(`# História \n${backstory}`)
      .setImage(imgurLink)
      .setColor(Colors.Blurple)
      .setTimestamp(DateTime.now().toJSDate())
      .addFields([{ name: "Aparência", value: appearance }]);

    const savedSheet = await Database.insertSheet(modalSubmit.user.id, sheetData);

    if (isRoyal === "true") {
      const family = await Database.getFamily(familySlug);
      sheetEmbed.setTitle(`Ficha de ${royalTitle} ${name} da família ${family?.title}`);
      sheetEmbed.setDescription(`# História \n${backstory}\n# Dádiva / Transformação \n${transformation}`);
    }

    return { sheetEmbed, savedSheet };
  }

  private async collectAttachment(interaction: ModalSubmitInteraction) {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    const attachmentCollector = interaction.channel.createMessageCollector({
      time: Duration.fromObject({ minutes: 10 }).as("milliseconds"),
      filter: (message) => message.author.id === interaction.user.id,
    });
    try {
      return await new Promise<string>((resolve, reject) => {
        attachmentCollector.on("collect", async (message) => {
          const feedbackText = "Essa mensagem não possui anexos válidos. Por favor, tente novamente.";
          if (message.attachments.size < 1) {
            const feedback = await message.reply(feedbackText);
            Utils.scheduleMessageToDelete(feedback);
            return;
          }

          const attachment = message.attachments.first()!;
          if (!imageGifUrl.safeParse(attachment.url).success) {
            const feedback = await message.reply(feedbackText);
            Utils.scheduleMessageToDelete(feedback);
            return;
          }

          const imgurLink = await Utils.uploadToImgur(attachment.url);
          Utils.scheduleMessageToDelete(message);
          resolve(imgurLink);
        });

        attachmentCollector.on("end", () => {
          reject("Collector finalizado sem anexos válidos.");
        });
      });
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
