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
  Message,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  bold,
  userMention,
} from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { DateTime, Duration } from "luxon";
import CreateFamilyModal, { createFamilyModalFieldIds, createFamilyModalId } from "../components/CreateFamilyModal";
import CreateSheetModal, { createRoyalSheetModalFieldIds, createSheetModalFieldIds, createSheetModalId } from "../components/CreateSheetModal";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { ATTACHMENT_ICON_URL, CHANNEL_IDS, GENDER_TRANSLATIONS_MAP, PROFESSIONS_TRANSLATIONS } from "../data/constants";
import Database from "../database";
import { Profession, characterTypeSchemaInput } from "../schemas/characterSheetSchema";
import { Family } from "../schemas/familySchema";
import { imageGifUrl } from "../schemas/utils";
import Utils from "../utils";

export const createSheetButtonId = "createSheetButtonId";
export const createRoyalSheetButtonId = "createRoyalSheetButtonId";
export const familySelectMenuId = "familySelectMenuId";
export const professionSelectMenuId = "professionSelectMenuId";
export const familySheetButtonId = "familySheetButtonId";
export const genderSelectMenuId = "genderSelectMenuId";
export const getSpawnModalButtonId = (profession: Profession, gender: "male" | "female", family?: Family) =>
  `spawnModalButtonId_${family?.slug ?? "unknown"}_${profession}_${gender}`;

type HandleEvaluationButtonsParams<UpdateT> = {
  interaction: ButtonInteraction;
  databaseUpdateFn: () => Promise<UpdateT>;
  databaseDeleteFn: () => Promise<void>;
  action: "approve" | "reject";
  userId: string;
};
type EvaluateTuple = ["approve" | "reject", "character" | "family", string, string];
type SpawnModalTuple = ["spawnModalButtonId", string, Profession];

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
      new ButtonBuilder().setCustomId(familySheetButtonId).setEmoji("🏘️").setLabel("Criar ficha de família").setStyle(ButtonStyle.Secondary),
    );
    const messageOptions: BaseMessageOptions = { embeds: [embed], components: [buttonRow] };
    await interaction.editReply(messageOptions);
  }

  @Slash(COMMANDS.giveRoyalToken)
  public async giveRoyalToken(@SlashOption(COMMAND_OPTIONS.giveRoyalTokenUser) user: GuildMember, interaction: ChatInputCommandInteraction) {
    await this.giveToken(user, "royalTokens", interaction);
  }

  @Slash(COMMANDS.giveFamilyToken)
  public async giveFamilyToken(@SlashOption(COMMAND_OPTIONS.giveFamilyTokenUser) user: GuildMember, interaction: ChatInputCommandInteraction) {
    await this.giveToken(user, "familyTokens", interaction);
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

    const families = await Utils.fetchBaseFamilies();
    const selectMenuOptions = new Array<{ label: string; value: string }>();
    for (const family of families) {
      await Database.setFamily(family.slug, family);
      selectMenuOptions.push({ label: family.title, value: family.slug });
    }

    const selectMenus = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder("Escolha sua família")
        .setCustomId(familySelectMenuId)
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(selectMenuOptions),
    );

    const message = await interaction.editReply({ content: "Selecione os campos a seguir para criar sua ficha:", components: [selectMenus] });
    const familySelectMenuSubmit = await this.awaitSelectMenu(message, familySelectMenuId);
    if (!familySelectMenuSubmit) {
      await interaction.editReply({ content: "Você não selecionou uma família a tempo." });
      return;
    }
    await familySelectMenuSubmit.reply({
      content: `Você selecionou a família ${bold(familySelectMenuSubmit.values[0])}.`,
      ephemeral: true,
    });
    const familySlug = familySelectMenuSubmit.values[0];
    const family = await Database.getFamily(familySlug);
    if (!family) {
      await interaction.editReply({ content: "A família selecionada não existe." });
      return;
    }

    const secondMessage = await interaction.editReply({ content: "Selecione seu gênero agora:", components: [this.getGenderSelectMenu()] });
    const genderSelectMenuSubmit = await this.awaitSelectMenu(secondMessage, genderSelectMenuId);
    if (!genderSelectMenuSubmit) {
      await interaction.editReply({ content: "Você não selecionou um gênero a tempo." });
      return;
    }
    await genderSelectMenuSubmit.reply({
      content: "Gênero selecionado com sucesso.",
      ephemeral: true,
    });

    const gender = genderSelectMenuSubmit.values[0] as "male" | "female";
    const button = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(getSpawnModalButtonId("royal", gender, family))
        .setLabel(`Formulário dos(as) ${family.title}`)
        .setStyle(ButtonStyle.Success),
    );

    await interaction.editReply({
      content: `Você selecionou a família ${bold(family.title)} e o gênero ${bold(
        GENDER_TRANSLATIONS_MAP[gender],
      )}. Pressione o botão abaixo para preencher o formulário de personagem.`,
      files: [new AttachmentBuilder(family.image).setName(`${family.slug}.png`)],
      components: [button],
    });
  }

  @ButtonComponent({ id: createSheetButtonId })
  public async createSheetButtonListener(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });

    type ProfessionKey = keyof typeof PROFESSIONS_TRANSLATIONS;
    const selectMenuOptions = new Array<{ label: string; value: string }>();
    for (const profession of Object.keys(PROFESSIONS_TRANSLATIONS)) {
      selectMenuOptions.push({ label: PROFESSIONS_TRANSLATIONS[profession as ProfessionKey], value: profession });
    }
    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder("Escolha sua profissão")
        .setCustomId(professionSelectMenuId)
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(selectMenuOptions),
    );
    const message = await interaction.editReply({ content: "Selecione uma profissão para criar sua ficha:", components: [selectMenu] });
    const professionSelectMenu = await this.awaitSelectMenu(message, professionSelectMenuId);
    if (!professionSelectMenu) {
      await interaction.editReply({ content: "Você não selecionou uma profissão a tempo." });
      return;
    }
    const profession = professionSelectMenu.values[0] as ProfessionKey;
    await professionSelectMenu.reply({
      content: `Você selecionou a profissão ${bold(PROFESSIONS_TRANSLATIONS[profession])}.`,
      ephemeral: true,
    });

    const secondMessage = await interaction.editReply({ content: "Selecione seu gênero agora:", components: [this.getGenderSelectMenu()] });
    const genderSelectMenuSubmit = await this.awaitSelectMenu(secondMessage, genderSelectMenuId);
    if (!genderSelectMenuSubmit) {
      await interaction.editReply({ content: "Você não selecionou um gênero a tempo." });
      return;
    }
    await genderSelectMenuSubmit.reply({ content: "Gênero selecionado com sucesso.", ephemeral: true });

    const gender = genderSelectMenuSubmit.values[0] as "male" | "female";

    const button = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(getSpawnModalButtonId(profession as Profession, gender))
        .setLabel("Formulário de personagem")
        .setStyle(ButtonStyle.Success),
    );
    await interaction.editReply({
      content: `Você selecionou a profissão ${bold(PROFESSIONS_TRANSLATIONS[profession])} e o gênero ${
        GENDER_TRANSLATIONS_MAP[gender]
      }. Pressione o botão abaixo para preencher o formulário de personagem.`,
      components: [button],
    });
  }

  @ButtonComponent({ id: familySheetButtonId })
  public async createFamilySheetButtonListener(interaction: ButtonInteraction) {
    await interaction.showModal(CreateFamilyModal);
    const submission = await this.awaitSubmission(interaction, createFamilyModalId);
    if (!submission?.inCachedGuild()) return;

    await submission.deferReply({ ephemeral: true });

    const user = await Database.getUser(submission.user.id);
    if (user.familyTokens < 1) {
      await submission.editReply({ content: "Você não possui fichas de família suficientes para criar uma ficha de família." });
      return;
    }

    const [name, description, image] = createFamilyModalFieldIds.map((customId) => submission.fields.getTextInputValue(customId));
    const slug = lodash.kebabCase(name);

    const isImage = imageGifUrl.safeParse(image).success;
    if (!isImage) {
      await submission.editReply({ content: "A imagem enviada não é válida. Certifique-se de que ela é um link de imagem que termina em .png ou .jpg" });
      return;
    }

    const family = await Database.getFamily(slug);
    if (family) {
      await submission.editReply({ content: "Essa família já existe." });
      return;
    }

    const createdFamily = await Database.setFamily(slug, { slug, title: name, description, image });
    if (!createdFamily) {
      await submission.editReply({ content: "Não foi possível criar a família." });
      return;
    }

    const sheetWaitingChannel = submission.guild.channels.cache.get(CHANNEL_IDS.sheetWaitingRoom);
    if (!sheetWaitingChannel?.isTextBased()) {
      await submission.editReply("Não foi possível concluir a criação da ficha. O canal de espera não existe.");
      return;
    }

    const sheetEmbed = new EmbedBuilder()
      .setAuthor({
        name: submission.user.username,
        iconURL: submission.user.displayAvatarURL({ forceStatic: true, size: 128 }),
      })
      .setTitle(`Ficha da família ${name}`)
      .setDescription(`# Descrição \n${description}`)
      .setImage(image)
      .setColor(Colors.Blurple)
      .setTimestamp(DateTime.now().toJSDate());

    const evaluationButtons = this.getEvaluationButtons("family", slug, submission.user.id);
    await sheetWaitingChannel.send({ embeds: [sheetEmbed], components: [evaluationButtons] });
    await submission.editReply({ content: "Família postada com sucesso. Aguarde a aprovação de um moderador." });
  }

  @ButtonComponent({ id: /^spawnModalButtonId_.*$/ })
  public async spawnModalButtonListener(interaction: ButtonInteraction) {
    const [, familySlug, profession] = interaction.customId.split("_") as SpawnModalTuple;
    const isRoyalSheet = profession === "royal";
    await interaction.showModal(CreateSheetModal(isRoyalSheet));

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

    const { sheetEmbed, savedSheet } = await this.createSheetFromModal(modalSubmit, familySlug, profession, imgurLink);
    const evaluationButtons = this.getEvaluationButtons("character", savedSheet.characterId, savedSheet.userId);
    await modalSubmit.editReply({
      content: `Ficha criada com sucesso! Aguarde a aprovação de um moderador em ${sheetWaitingChannel?.toString()}`,
    });

    if (isRoyalSheet) {
      const user = await Database.getUser(savedSheet.userId);
      await Database.updateUser(savedSheet.userId, { royalTokens: user.royalTokens - 1 });
    }

    await sheetWaitingChannel.send({ embeds: [sheetEmbed], components: [evaluationButtons] });
  }

  @ButtonComponent({ id: /^approve|reject_.*$/ })
  public async evaluateSheetButtonListener(interaction: ButtonInteraction) {
    const [action, namespace, characterIdOrFamilySlug, userId] = interaction.customId.split("_") as EvaluateTuple;

    if (namespace === "character") {
      const databaseUpdateFn = async () => await Database.updateSheet(userId, characterIdOrFamilySlug, { isApproved: action === "approve" });
      const databaseDeleteFn = async () => await Database.deleteSheet(userId, characterIdOrFamilySlug);
      await this.handleEvaluationButtons({ interaction, databaseUpdateFn, databaseDeleteFn, action, userId });
    } else if (namespace === "family") {
      const databaseUpdateFn = async () => {
        const user = await Database.getUser(userId);
        await Database.updateFamily(characterIdOrFamilySlug, { isApproved: action === "approve" });
        await Database.updateUser(userId, { familyTokens: user.familyTokens - 1 });
      };
      const databaseDeleteFn = async () => await Database.deleteFamily(characterIdOrFamilySlug);
      await this.handleEvaluationButtons({ interaction, databaseUpdateFn, databaseDeleteFn, action, userId });
    }
  }

  private async giveToken(user: GuildMember, tokenType: "royalTokens" | "familyTokens", interaction: ChatInputCommandInteraction) {
    const messageMap = { royalTokens: "ficha real", familyTokens: "ficha de família" };

    await interaction.deferReply({ ephemeral: true });
    const databaseUser = await Database.getUser(user.id);
    await Database.updateUser(user.id, { [tokenType]: databaseUser[tokenType] + 1 });
    await interaction.editReply({ content: `${lodash.capitalize(messageMap[tokenType])} dada com sucesso para ${userMention(user.id)}` });
    await interaction.channel?.send({ content: `👑 ${user.toString()} recebeu uma ${messageMap[tokenType]} de ${interaction.user.toString()}!` });
  }

  private getEvaluationButtons(namespace: "character" | "family", id: string, userId: string) {
    const approveButton = new ButtonBuilder()
      .setCustomId(`approve_${namespace}_${id}_${userId}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅");

    const rejectButton = new ButtonBuilder()
      .setCustomId(`reject_${namespace}_${id}_${userId}`)
      .setLabel("Reprovar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌");

    return new ActionRowBuilder<ButtonBuilder>().setComponents(approveButton, rejectButton);
  }
  private getGenderSelectMenu() {
    return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder("Escolha seu gênero")
        .setCustomId(genderSelectMenuId)
        .addOptions([
          { label: "Masculino", value: "male" },
          { label: "Feminino", value: "female" },
        ])
        .setMaxValues(1)
        .setMinValues(1),
    );
  }
  private async awaitSelectMenu(message: Message, id = familySelectMenuId) {
    return await message
      .awaitMessageComponent({
        time: Duration.fromObject({ minutes: 5 }).as("milliseconds"),
        filter: (menuInteraction) => menuInteraction.customId === id,
        componentType: ComponentType.StringSelect,
      })
      .catch(() => {
        console.log(`Um usuário não selecionou uma família, profissão ou gênero a tempo.`);
        return null;
      });
  }
  private async handleEvaluationButtons<UpdateT>({ interaction, databaseUpdateFn, databaseDeleteFn, action, userId }: HandleEvaluationButtonsParams<UpdateT>) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply({ ephemeral: true });
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      await interaction.editReply({ content: "Você não tem permissão para executar essa ação." });
      return;
    }

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

        await databaseUpdateFn();
        await interaction.editReply({ content: "Ficha aprovada com sucesso." });
        await approvedSheetChannel.send({ content: userMention(userId), embeds: [embed] });
        Utils.scheduleMessageToDelete(interaction.message, 1000);
        break;
      case "reject":
        await databaseDeleteFn();
        await interaction.editReply({ content: "Ficha reprovada com sucesso." });
        Utils.scheduleMessageToDelete(interaction.message, 1000);
        break;
    }
  }

  private async awaitSubmission(interaction: ButtonInteraction, id = createSheetModalId) {
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

  private async createSheetFromModal(modalSubmit: ModalSubmitInteraction, familySlug: string, profession: Profession, imgurLink: string) {
    const fieldIds = profession === "royal" ? createRoyalSheetModalFieldIds : createSheetModalFieldIds;
    const [name, backstory, appearance, royalTitle, transformation] = fieldIds.map((customId) => modalSubmit.fields.getTextInputValue(customId));
    const sheetData =
      profession === "royal"
        ? { name, royalTitle, backstory, appearance, transformation, imageUrl: imgurLink, familySlug, profession: "royal" }
        : { name, backstory, appearance, imageUrl: imgurLink, profession: "other" };

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

    const savedSheet = await Database.insertSheet(modalSubmit.user.id, characterTypeSchemaInput.parse(sheetData));

    if (profession === "royal") {
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
