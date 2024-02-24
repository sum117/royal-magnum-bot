var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ActionRowBuilder, AttachmentBuilder, bold, ButtonBuilder, ButtonStyle, Colors, ComponentType, EmbedBuilder, PermissionFlagsBits, StringSelectMenuBuilder, userMention, } from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { DateTime, Duration } from "luxon";
import { AchievementEvents } from "../achievements";
import CreateFamilyModal, { createFamilyModalFieldIds, createFamilyModalId } from "../components/CreateFamilyModal";
import CreateSheetModal, { createRoyalSheetModalFieldIds, createSheetModalFieldIds } from "../components/CreateSheetModal";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { ATTACHMENT_ICON_URL, CHANNEL_IDS, GENDER_TRANSLATIONS_MAP, PROFESSIONS_PRONOUNS_TRANSLATIONS, PROFESSIONS_TRANSLATIONS, ROLE_IDS, SERVER_BANNER_URL, } from "../data/constants";
import Database from "../database";
import { achievements, bot } from "../main";
import { characterTypeSchemaInput } from "../schemas/characterSheetSchema";
import { imageGifUrl } from "../schemas/utils";
import Utils from "../utils";
export const createSheetButtonId = "createSheetButtonId";
export const createRoyalSheetButtonId = "createRoyalSheetButtonId";
export const familySelectMenuId = "familySelectMenuId";
export const professionSelectMenuId = "professionSelectMenuId";
export const familySheetButtonId = "familySheetButtonId";
export const genderSelectMenuId = "genderSelectMenuId";
export const entitySelectMenuId = "entitySelectMenuId";
export const originSelectMenuId = "originSelectMenuId";
export const getSpawnModalButtonId = (profession, gender, origin, family) => `spawnModalButtonId:${family?.slug ?? "unknown"}:${profession}:${gender}:${origin}`;
let Sheet = class Sheet {
    async spawnSheetCreator(interaction) {
        if (!interaction.inCachedGuild())
            return;
        await interaction.deferReply();
        const randomColor = lodash.sample(Object.values(Colors));
        const embed = new EmbedBuilder()
            .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ forceStatic: true, size: 128 }) ?? undefined,
        })
            .setTitle(`Criação de ficha de personagem  de ${interaction.guild.name}`)
            .setFooter({ text: "Clique em um dos botões abaixo para começar a criação de ficha" })
            .setThumbnail(SERVER_BANNER_URL);
        if (randomColor)
            embed.setColor(randomColor);
        const buttonRow = new ActionRowBuilder().setComponents(new ButtonBuilder().setCustomId(createSheetButtonId).setEmoji("📝").setLabel("Criar ficha").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(createRoyalSheetButtonId).setEmoji("👑").setLabel("Criar ficha real").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(familySheetButtonId).setEmoji("🏘️").setLabel("Criar ficha de família").setStyle(ButtonStyle.Secondary));
        const messageOptions = { embeds: [embed], components: [buttonRow] };
        await interaction.editReply(messageOptions);
    }
    async giveRoyalToken(user, interaction) {
        if (!interaction.inCachedGuild())
            return;
        if (interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            await this.giveToken(user, "royalTokens", interaction);
            return;
        }
        const databaseUser = await Database.getUser(interaction.user.id);
        if (!databaseUser)
            return;
        if (databaseUser.royalTokens < 1) {
            await interaction.reply({ content: "Você não possui fichas reais suficientes para dar a outra pessoa." });
            return;
        }
        await this.giveToken(user, "royalTokens", interaction);
        await Database.updateUser(interaction.user.id, { royalTokens: databaseUser.royalTokens - 1 });
    }
    async giveFamilyToken(user, interaction) {
        await this.giveToken(user, "familyTokens", interaction);
    }
    async createRoyalSheetButtonListener(interaction) {
        if (!interaction.inCachedGuild() || !this.validateFamiliesChannel(interaction)) {
            return;
        }
        await interaction.deferReply({ ephemeral: true, fetchReply: true });
        const user = await Database.getUser(interaction.user.id);
        if (!user) {
            console.log("Usuário não encontrado para a criação da ficha (Isso não deve acontecer)");
            return;
        }
        if (user.royalTokens < 1) {
            await interaction.editReply({ content: "Você não possui fichas reais suficientes para criar uma ficha real." });
            return;
        }
        const selectedFamilySlug = await this.selectFamily(interaction);
        if (!selectedFamilySlug) {
            await interaction.editReply({ content: "Você não selecionou uma família a tempo." });
            return;
        }
        const family = await Database.getFamily(selectedFamilySlug);
        if (!family) {
            await interaction.editReply({ content: "A família selecionada não existe." });
            return;
        }
        const gender = await this.selectGender(interaction);
        if (!gender) {
            await interaction.editReply({ content: "Você não selecionou um gênero a tempo." });
            return;
        }
        const origin = family.origin;
        const button = new ActionRowBuilder().setComponents(new ButtonBuilder()
            .setCustomId(getSpawnModalButtonId("royal", gender, origin, family))
            .setLabel(`Formulário dos(as) ${family.title}`)
            .setStyle(ButtonStyle.Success));
        const originData = await Utils.fetchOrigins();
        const originName = originData.find((originData) => originData.id === origin)?.name;
        await interaction.editReply({
            content: `Você selecionou a família ${bold(family.title)}, o gênero ${bold(GENDER_TRANSLATIONS_MAP[gender])} e a origem ${originName ?? "Desconhecida"}. Pressione o botão abaixo para preencher o formulário de personagem.`,
            files: [new AttachmentBuilder(family.imageUrl).setName(`${family.slug}.png`)],
            components: [button],
        });
    }
    async createSheetButtonListener(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const profession = await this.selectProfession(interaction);
        if (!profession) {
            await interaction.editReply({ content: "Você não selecionou uma profissão a tempo." });
            return;
        }
        const gender = await this.selectGender(interaction);
        if (!gender) {
            await interaction.editReply({ content: "Você não selecionou um gênero a tempo." });
            return;
        }
        const origin = await this.selectOrigin(interaction);
        if (!origin) {
            await interaction.editReply({ content: "Você não selecionou uma origem a tempo." });
            return;
        }
        const button = new ActionRowBuilder().setComponents(new ButtonBuilder()
            .setCustomId(getSpawnModalButtonId(profession, gender, origin))
            .setLabel("Formulário de personagem")
            .setStyle(ButtonStyle.Success));
        const originData = await Utils.fetchOrigins();
        const originName = originData.find((originData) => originData.id === origin)?.name;
        await interaction.editReply({
            content: `Você selecionou a profissão ${bold(PROFESSIONS_TRANSLATIONS[profession])},o gênero ${GENDER_TRANSLATIONS_MAP[gender]} e a origem ${originName ?? "Desconhecida"}. Pressione o botão abaixo para preencher o formulário de personagem.`,
            components: [button],
        });
    }
    async createFamilySheetButtonListener(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const user = await Database.getUser(interaction.user.id);
        if (!user)
            return;
        if (user.familyTokens < 1) {
            await interaction.editReply({ content: "Você não possui fichas de família suficientes para criar uma ficha de família." });
            return;
        }
        const entitiesSelectMenuOptions = (await Utils.fetchEntities()).map((entity) => ({
            label: entity.title,
            value: entity.slug,
        }));
        entitiesSelectMenuOptions.push({ label: "Nenhuma", value: "none" });
        const selectMenuComponent = new ActionRowBuilder().setComponents(new StringSelectMenuBuilder()
            .setCustomId(entitySelectMenuId)
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder("Escolha uma entidade")
            .addOptions(entitiesSelectMenuOptions));
        const message = await interaction.editReply({
            components: [selectMenuComponent],
            content: "Você precisa selecionar uma entidade para representar sua família:",
        });
        const entitySelectMenuSubmit = await this.awaitSelectMenu(message, entitySelectMenuId);
        if (!entitySelectMenuSubmit) {
            await interaction.editReply({ content: "Você não selecionou uma entidade a tempo." });
            return;
        }
        const entitySlug = entitySelectMenuSubmit.values[0];
        await interaction.deleteReply();
        await entitySelectMenuSubmit.showModal(CreateFamilyModal);
        const createFamilyModalSubmission = await Utils.awaitModalSubmission(interaction, createFamilyModalId);
        if (!createFamilyModalSubmission?.inCachedGuild())
            return;
        await createFamilyModalSubmission.deferReply({ ephemeral: true });
        const [name, description, image] = createFamilyModalFieldIds.map((customId) => createFamilyModalSubmission.fields.getTextInputValue(customId));
        const slug = lodash.kebabCase(name);
        const isImage = imageGifUrl.safeParse(image).success;
        if (!isImage) {
            await createFamilyModalSubmission.editReply({
                content: "A imagem enviada não é válida. Certifique-se de que ela é um link de imagem que termina em .png ou .jpg",
            });
            return;
        }
        const family = await Database.getFamily(slug);
        if (family) {
            await createFamilyModalSubmission.editReply({ content: "Essa família já existe." });
            return;
        }
        const familyData = (await Utils.fetchBaseFamilies()).find((family) => family.entity === entitySlug);
        if (!familyData && entitySlug !== "none") {
            await createFamilyModalSubmission.editReply({ content: "Essa entidade não existe." });
            return;
        }
        const createdFamily = await Database.setFamily(slug, { slug, title: name, description, imageUrl: image, entity: entitySlug, origin: familyData?.origin });
        if (!createdFamily) {
            await createFamilyModalSubmission.editReply({ content: "Não foi possível criar a família." });
            return;
        }
        const sheetEmbed = new EmbedBuilder()
            .setAuthor({
            name: createFamilyModalSubmission.user.username,
            iconURL: createFamilyModalSubmission.user.displayAvatarURL({ forceStatic: true, size: 128 }),
        })
            .setTitle(`Ficha da família ${name}`)
            .setDescription(`# Descrição \n${description}`)
            .setImage(image)
            .setColor(Colors.Blurple)
            .setTimestamp(DateTime.now().toJSDate());
        const evaluationButtons = this.getEvaluationButtons("family", slug, createFamilyModalSubmission.user.id);
        await bot.systemChannels.get(CHANNEL_IDS.sheetWaitingRoom)?.send({
            embeds: [sheetEmbed],
            components: [evaluationButtons],
        });
        await createFamilyModalSubmission.editReply({ content: "Família postada com sucesso. Aguarde a aprovação de um moderador." });
    }
    async spawnModalButtonListener(interaction) {
        const [, familySlug, profession, gender, origin] = interaction.customId.split(":");
        const isRoyalSheet = profession === "royal";
        await interaction.showModal(CreateSheetModal(isRoyalSheet));
        const modalSubmit = await Utils.awaitModalSubmission(interaction);
        if (!modalSubmit || !modalSubmit.inCachedGuild() || !modalSubmit.channel)
            return;
        await modalSubmit.deferReply({ ephemeral: true });
        const attachment = new AttachmentBuilder(ATTACHMENT_ICON_URL).setName("attachment.png");
        await modalSubmit.followUp({
            ephemeral: true,
            content: `Ficha criada com sucesso, por favor envie uma imagem do personagem EM ANEXO para concluir o processo.`,
            files: [attachment],
        });
        const imageKitLink = await this.collectAttachment(modalSubmit);
        if (!imageKitLink) {
            await modalSubmit.editReply("Não foi possível concluir a criação da ficha. Você não enviou um anexo válido a tempo.");
            return;
        }
        const { sheetEmbed, savedSheet } = await this.createSheetFromModal(modalSubmit, familySlug, profession, gender, origin, imageKitLink);
        if (!savedSheet.userId)
            return;
        const evaluationButtons = this.getEvaluationButtons("character", savedSheet.id, savedSheet.userId);
        await modalSubmit.editReply({
            content: `Ficha criada com sucesso! Aguarde a aprovação de um moderador em ${bot.systemChannels.get(CHANNEL_IDS.sheetWaitingRoom)?.toString()}`,
        });
        if (isRoyalSheet) {
            const user = await Database.getUser(savedSheet.userId);
            if (!user)
                return;
            await Database.updateUser(savedSheet.userId, { royalTokens: user.royalTokens - 1 });
        }
        await bot.systemChannels.get(CHANNEL_IDS.sheetWaitingRoom)?.send({
            embeds: [sheetEmbed],
            components: [evaluationButtons],
        });
    }
    async evaluateSheetButtonListener(interaction) {
        if (!interaction.inCachedGuild())
            return;
        const [action, namespace, characterIdOrFamilySlug, userId] = interaction.customId.split("_");
        if (namespace === "character") {
            const databaseUpdateFn = async () => {
                await Database.updateSheet(userId, characterIdOrFamilySlug, { isApproved: action === "approve" });
                const character = await Database.getSheet(userId, characterIdOrFamilySlug);
                const member = interaction.guild?.members.cache.get(userId);
                if (!member || !character)
                    return;
                achievements.emit(AchievementEvents.onCharacterCreate, { user: member.user, character });
            };
            const databaseDeleteFn = async () => await Database.deleteSheet(userId, characterIdOrFamilySlug);
            await this.handleEvaluationButtons({ interaction, databaseUpdateFn, databaseDeleteFn, action, userId });
        }
        else if (namespace === "family") {
            const databaseUpdateFn = async () => {
                const user = await Database.getUser(userId);
                if (!user)
                    return;
                await Database.updateFamily(characterIdOrFamilySlug, { isApproved: action === "approve" });
                await Database.updateUser(userId, { familyTokens: user.familyTokens - 1 });
            };
            const databaseDeleteFn = async () => await Database.deleteFamily(characterIdOrFamilySlug);
            await this.handleEvaluationButtons({ interaction, databaseUpdateFn, databaseDeleteFn, action, userId });
        }
        const member = await interaction.guild.members.fetch(userId);
        if (!member)
            return;
        if (!member.roles.cache.get(ROLE_IDS.member))
            member.roles.add(ROLE_IDS.member);
    }
    async selectFamily(interaction) {
        const families = await Utils.fetchBaseFamilies();
        const selectMenuOptions = families.map((family) => ({ label: family.title, value: family.slug }));
        const selectMenus = new ActionRowBuilder().setComponents(new StringSelectMenuBuilder()
            .setPlaceholder("Escolha sua família")
            .setCustomId(familySelectMenuId)
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(selectMenuOptions));
        const message = await interaction.editReply({
            content: "Selecione os campos a seguir para criar sua ficha:",
            components: [selectMenus],
        });
        const familySelectMenuSubmit = await this.awaitSelectMenu(message, familySelectMenuId);
        await familySelectMenuSubmit?.reply({
            content: `Você selecionou a família ${bold(familySelectMenuSubmit.values[0])}.`,
            ephemeral: true,
        });
        return familySelectMenuSubmit?.values[0] || null;
    }
    validateFamiliesChannel(interaction) {
        const familiesChannel = interaction.guild?.channels.cache.get(CHANNEL_IDS.familiesChannel);
        return Boolean(familiesChannel?.isTextBased());
    }
    async selectGender(interaction) {
        const genderSelectMenu = new ActionRowBuilder().setComponents(new StringSelectMenuBuilder()
            .setPlaceholder("Escolha seu gênero")
            .setCustomId(genderSelectMenuId)
            .addOptions([
            { label: "Masculino", value: "male" },
            { label: "Feminino", value: "female" },
        ])
            .setMaxValues(1)
            .setMinValues(1));
        const secondMessage = await interaction.editReply({
            content: "Selecione seu gênero agora:",
            components: [genderSelectMenu],
        });
        const genderSelectMenuSubmit = await this.awaitSelectMenu(secondMessage, genderSelectMenuId);
        await genderSelectMenuSubmit?.reply({
            content: "Gênero selecionado com sucesso.",
            ephemeral: true,
        });
        return genderSelectMenuSubmit ? genderSelectMenuSubmit.values[0] : null;
    }
    async selectOrigin(interaction) {
        const origins = await Utils.fetchOrigins();
        const originsSelectMenu = new ActionRowBuilder().setComponents(new StringSelectMenuBuilder()
            .setPlaceholder("Escolha sua origem")
            .setCustomId(originSelectMenuId)
            .addOptions(origins.map((origin) => ({ label: origin.name, value: origin.id })))
            .setMaxValues(1)
            .setMinValues(1));
        const secondMessage = await interaction.editReply({
            content: "Selecione sua origem agora:",
            components: [originsSelectMenu],
        });
        const originSelectMenuSubmit = await this.awaitSelectMenu(secondMessage, originSelectMenuId);
        await originSelectMenuSubmit?.reply({
            content: "Origem selecionada com sucesso.",
            ephemeral: true,
        });
        return originSelectMenuSubmit ? originSelectMenuSubmit.values[0] : "none";
    }
    async selectProfession(interaction) {
        const selectMenuOptions = Object.keys(PROFESSIONS_TRANSLATIONS)
            .filter((profession) => profession !== "royal")
            .map((profession) => ({
            label: PROFESSIONS_TRANSLATIONS[profession],
            value: profession,
        }));
        const selectMenu = new ActionRowBuilder().setComponents(new StringSelectMenuBuilder()
            .setPlaceholder("Escolha sua profissão")
            .setCustomId(professionSelectMenuId)
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(selectMenuOptions));
        const message = await interaction.editReply({
            content: "Selecione uma profissão para criar sua ficha:",
            components: [selectMenu],
        });
        const professionSelectMenu = await this.awaitSelectMenu(message, professionSelectMenuId);
        await professionSelectMenu?.reply({
            ephemeral: true,
            content: `Você selecionou a sua profissão com sucesso.`,
        });
        return professionSelectMenu ? professionSelectMenu.values[0] : null;
    }
    async giveToken(user, tokenType, interaction) {
        const messageMap = { royalTokens: "ficha real", familyTokens: "ficha de família" };
        await interaction.deferReply({ ephemeral: true });
        const databaseUser = await Database.getUser(user.id);
        if (!databaseUser) {
            await interaction.editReply({ content: "Usuário não encontrado." });
            return;
        }
        await Database.updateUser(user.id, { [tokenType]: databaseUser[tokenType] + 1 });
        await interaction.editReply({ content: `${lodash.capitalize(messageMap[tokenType])} dada com sucesso para ${userMention(user.id)}` });
        await interaction.channel?.send({ content: `👑 ${user.toString()} recebeu uma ${messageMap[tokenType]} de ${interaction.user.toString()}!` });
    }
    getEvaluationButtons(namespace, id, userId) {
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
        return new ActionRowBuilder().setComponents(approveButton, rejectButton);
    }
    async awaitSelectMenu(message, id = familySelectMenuId) {
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
    async handleEvaluationButtons({ interaction, databaseUpdateFn, databaseDeleteFn, action, userId }) {
        if (!interaction.inCachedGuild())
            return;
        await interaction.deferReply({ ephemeral: true });
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || interaction.member.roles.cache.has(ROLE_IDS.moderator);
        if (!isAdmin) {
            await interaction.editReply({ content: "Você não tem permissão para executar essa ação." });
            return;
        }
        switch (action) {
            case "approve":
                const apiEmbed = interaction.message.embeds.at(0);
                if (!apiEmbed) {
                    await interaction.editReply({ content: "Não foi possível aprovar a ficha. A ficha não possui um embed." });
                    return;
                }
                const embed = EmbedBuilder.from(apiEmbed);
                embed.setColor(Colors.Green);
                embed.setFooter({
                    text: `Aprovado por ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
                });
                embed.setTimestamp(DateTime.now().toJSDate());
                await databaseUpdateFn();
                await interaction.editReply({ content: "Ficha aprovada com sucesso." });
                await bot.systemChannels.get(CHANNEL_IDS.approvedSheetRoom)?.send({
                    content: userMention(userId),
                    embeds: [embed],
                });
                await Utils.scheduleMessageToDelete(interaction.message, 1000);
                break;
            case "reject":
                await databaseDeleteFn();
                await interaction.editReply({ content: "Ficha reprovada com sucesso." });
                await Utils.scheduleMessageToDelete(interaction.message, 1000);
                break;
        }
    }
    async createSheetFromModal(modalSubmit, familySlug, profession, gender, origin, imageKitLink) {
        const fieldIds = profession === "royal" ? createRoyalSheetModalFieldIds : createSheetModalFieldIds;
        const [name, backstory, appearance, royalTitle, transformation] = fieldIds.map((customId) => modalSubmit.fields.getTextInputValue(customId));
        const sheetData = profession === "royal"
            ? {
                name,
                royalTitle,
                backstory,
                gender,
                appearance,
                transformation,
                imageUrl: imageKitLink,
                familySlug,
                origin,
                profession,
                type: "royal",
            }
            : { name, backstory, appearance, imageUrl: imageKitLink, gender, origin, profession, type: "character" };
        const origins = await Utils.fetchOrigins();
        const originData = origins.find((originData) => originData.id === origin);
        const sheetEmbed = new EmbedBuilder()
            .setAuthor({
            name: modalSubmit.user.username,
            iconURL: modalSubmit.user.displayAvatarURL({ forceStatic: true, size: 128 }),
        })
            .setTitle(`Ficha de ${name}`)
            .setDescription(`# História \n${backstory}`)
            .setImage(imageKitLink)
            .setColor(Colors.Blurple)
            .setTimestamp(DateTime.now().toJSDate())
            .addFields([
            { name: "Aparência", value: appearance },
            { name: "Profissão", value: PROFESSIONS_PRONOUNS_TRANSLATIONS[profession][gender] },
            { name: "Origem", value: originData?.name ?? "Desconhecida" },
            { name: "Gênero", value: GENDER_TRANSLATIONS_MAP[gender] },
        ]);
        const savedSheet = await Database.insertSheet(modalSubmit.user.id, characterTypeSchemaInput.parse(sheetData));
        if (profession === "royal") {
            const family = await Database.getFamily(familySlug);
            sheetEmbed.setTitle(`Ficha de ${royalTitle} ${name} da família ${family?.title}`);
            sheetEmbed.setDescription(`# História \n${backstory}\n# Dádiva / Transformação \n${transformation}`);
        }
        return { sheetEmbed, savedSheet };
    }
    async collectAttachment(interaction) {
        if (!interaction.inCachedGuild() || !interaction.channel)
            return;
        const attachmentCollector = interaction.channel.createMessageCollector({
            time: Duration.fromObject({ minutes: 10 }).as("milliseconds"),
            filter: (message) => message.author.id === interaction.user.id,
        });
        try {
            return await new Promise((resolve, reject) => {
                attachmentCollector.on("collect", async (message) => {
                    const feedbackText = "Essa mensagem não possui anexos válidos. Por favor, tente novamente.";
                    if (message.attachments.size < 1) {
                        const feedback = await message.reply(feedbackText);
                        void Utils.scheduleMessageToDelete(feedback);
                        return;
                    }
                    const attachment = message.attachments.first();
                    if (!imageGifUrl.safeParse(attachment.url).success) {
                        const feedback = await message.reply(feedbackText);
                        void Utils.scheduleMessageToDelete(feedback);
                        return;
                    }
                    const imageKitLink = await Utils.uploadToImageKit(attachment.url);
                    void Utils.scheduleMessageToDelete(message);
                    resolve(imageKitLink);
                });
                attachmentCollector.on("end", () => {
                    reject("Collector finalizado sem anexos válidos.");
                });
            });
        }
        catch (error) {
            console.log(error);
            return null;
        }
    }
};
__decorate([
    Slash(COMMANDS.spawnSheet)
], Sheet.prototype, "spawnSheetCreator", null);
__decorate([
    Slash(COMMANDS.giveRoyalToken),
    __param(0, SlashOption(COMMAND_OPTIONS.giveRoyalTokenUser))
], Sheet.prototype, "giveRoyalToken", null);
__decorate([
    Slash(COMMANDS.giveFamilyToken),
    __param(0, SlashOption(COMMAND_OPTIONS.giveFamilyTokenUser))
], Sheet.prototype, "giveFamilyToken", null);
__decorate([
    ButtonComponent({ id: createRoyalSheetButtonId })
], Sheet.prototype, "createRoyalSheetButtonListener", null);
__decorate([
    ButtonComponent({ id: createSheetButtonId })
], Sheet.prototype, "createSheetButtonListener", null);
__decorate([
    ButtonComponent({ id: familySheetButtonId })
], Sheet.prototype, "createFamilySheetButtonListener", null);
__decorate([
    ButtonComponent({ id: /^spawnModalButtonId:.*$/ })
], Sheet.prototype, "spawnModalButtonListener", null);
__decorate([
    ButtonComponent({ id: /^approve|reject_.*$/ })
], Sheet.prototype, "evaluateSheetButtonListener", null);
Sheet = __decorate([
    Discord()
], Sheet);
export default Sheet;
