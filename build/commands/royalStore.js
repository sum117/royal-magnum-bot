var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { bold, ButtonBuilder, ButtonStyle, roleMention } from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { Duration } from "luxon";
import { AchievementEvents } from "../achievements";
import { ConfirmationPrompt } from "../components/ConfirmationPrompt";
import CreateSheetModal, { createRoyalSheetModalFieldIds } from "../components/CreateSheetModal";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { CHANNEL_IDS, ROLE_IDS } from "../data/constants";
import Database from "../database";
import { achievements, bot } from "../main";
import Utils from "../utils";
import Character, { characterDetailsButtonIdPrefix } from "./character";
export const buyStoreCharacterButtonIdPrefix = "buySheet";
export const getBuyStoreCharacterButtonId = (characterId) => `${buyStoreCharacterButtonIdPrefix}_${characterId}`;
export const confirmButtonId = "confirmButtonId";
export const cancelButtonId = "cancelButtonId";
let Store = class Store {
    async addStoreCharacter(price, family, gender, imageURL, interaction) {
        await interaction.showModal(CreateSheetModal(true));
        const modalSubmit = await interaction
            .awaitModalSubmit({
            time: Duration.fromObject({ minutes: 60 }).as("milliseconds"),
            filter: (i) => i.user.id === interaction.user.id,
        })
            .catch(() => {
            console.log("Modal para adicionar ficha à loja expirou.");
            return null;
        });
        if (!modalSubmit) {
            void Utils.scheduleMessageToDelete(await interaction.editReply({ content: "Modal expirado." }));
            return;
        }
        await modalSubmit.deferReply();
        const [name, backstory, appearance, royalTitle, transformation] = createRoyalSheetModalFieldIds.map((fieldId) => modalSubmit.fields.getTextInputValue(fieldId));
        const familyData = await Database.getFamily(family);
        if (!familyData) {
            void Utils.scheduleMessageToDelete(await modalSubmit.editReply({ content: "Família não encontrada." }));
            return;
        }
        const sheet = await Database.insertStoreSheet({
            name,
            royalTitle,
            backstory,
            appearance,
            type: "store",
            transformation,
            price,
            gender,
            origin: familyData?.origin ?? "none",
            familySlug: family,
            imageUrl: imageURL,
            profession: "royal",
        });
        const embed = await Character.getCharacterPreviewEmbed(sheet);
        embed.setAuthor({
            name: `Personagem Canônico à venda por  C$${price}`,
            iconURL: interaction.guild?.iconURL({ forceStatic: true, size: 128 }) ?? undefined,
        });
        const backstoryPreview = lodash.truncate(backstory, { omission: " (...)", length: 256 });
        embed.setDescription(`# Preview\n${backstoryPreview}\n\n*Inspecione o personagem utilizando o botão "Detalhes" abaixo. Para comprá-lo, clique no botão "Comprar".*\n\n**Atenção:** A compra é irreversível.`);
        const storeChannel = bot.systemChannels.get(CHANNEL_IDS.characterStore);
        await storeChannel?.send({
            embeds: [embed],
            components: [
                Character.getCharacterDetailsButton(sheet.userId ?? "store", sheet.id).addComponents(new ButtonBuilder().setCustomId(getBuyStoreCharacterButtonId(sheet.id)).setLabel("Comprar").setStyle(ButtonStyle.Success)),
            ],
        });
        await bot.systemChannels.get(CHANNEL_IDS.announcementsChannel)?.send({
            content: `${interaction.user.toString()} adicionou um(a) personagem à loja ${storeChannel?.toString()}, ${roleMention(ROLE_IDS.storeCharacterAnnouncements)} !\n\nNome: ${bold(sheet.name)}`,
            files: [{ name: `${lodash.kebabCase(sheet.name)}.jpg`, attachment: sheet.imageUrl }],
        });
        void Utils.scheduleMessageToDelete(await modalSubmit.editReply({ content: "Personagem adicionado à loja com sucesso!" }));
    }
    async characterDetailsButtonListener(buttonInteraction) {
        await Character.handleCharacterDetailsButton(buttonInteraction, buttonInteraction.customId.endsWith("store"));
    }
    async buyStoreCharacterButtonListener(buttonInteraction) {
        const [characterId] = buttonInteraction.customId.split("_").slice(1);
        await buttonInteraction.deferReply({ ephemeral: true });
        const sheet = await Database.getStoreSheet(characterId);
        if (!sheet) {
            void Utils.scheduleMessageToDelete(await buttonInteraction.editReply({ content: "Personagem não encontrado." }));
            return;
        }
        const user = await Database.getUser(buttonInteraction.user.id);
        if (!user) {
            void Utils.scheduleMessageToDelete(await buttonInteraction.editReply({ content: "Usuário não encontrado." }));
            return;
        }
        if (user.money < (sheet.price ?? 0)) {
            void Utils.scheduleMessageToDelete(await buttonInteraction.editReply({ content: "Você não tem dinheiro suficiente." }));
            return;
        }
        const confirmationPrompt = new ConfirmationPrompt({
            promptMessage: `Você tem certeza que deseja comprar ${bold(sheet.name)} por C$${sheet.price}? Essa ação é irreversível.`,
        });
        const sentPrompt = await confirmationPrompt.send(buttonInteraction);
        sentPrompt.collector.on("collect", async (promptInteraction) => {
            await promptInteraction.deferUpdate();
            if (promptInteraction.customId === confirmationPrompt.confirmButtonId) {
                await Database.updateUser(buttonInteraction.user.id, { money: BigInt(Number(user.money) - (sheet.price ?? 0)) });
                await Database.insertSheet(buttonInteraction.user.id, { ...sheet, type: "royal", price: undefined });
                await Database.deleteStoreSheet(sheet.id);
                void Utils.scheduleMessageToDelete(await promptInteraction.editReply({
                    content: `🎉 Personagem ${bold(sheet.name)} comprado(a) com sucesso por C$${bold((sheet.price ?? 0).toString())}!`,
                    components: [],
                }));
                await bot.systemChannels.get(CHANNEL_IDS.announcementsChannel)?.send({
                    content: `🎉 ${buttonInteraction.user.toString()} comprou um(a) personagem canônico(a) da loja: ${bold(sheet.name)}!`,
                    files: [{ name: `${lodash.kebabCase(sheet.name)}.jpg`, attachment: sheet.imageUrl }],
                });
                void Utils.scheduleMessageToDelete(buttonInteraction.message, 0);
                achievements.emit(AchievementEvents.onBuyCharacter, { character: sheet, user: promptInteraction.user });
            }
            else if (promptInteraction.customId === confirmationPrompt.cancelButtonId) {
                void Utils.scheduleMessageToDelete(await promptInteraction.editReply({
                    content: "Compra cancelada.",
                    components: [],
                }));
            }
        });
    }
};
__decorate([
    Slash(COMMANDS.addStoreCharacter),
    __param(0, SlashOption(COMMAND_OPTIONS.addStoreCharacterPrice)),
    __param(1, SlashOption(COMMAND_OPTIONS.addStoreCharacterFamily)),
    __param(2, SlashOption(COMMAND_OPTIONS.addStoreCharacterGender)),
    __param(3, SlashOption(COMMAND_OPTIONS.addStoreCharacterImageURL))
], Store.prototype, "addStoreCharacter", null);
__decorate([
    ButtonComponent({ id: new RegExp(`^${characterDetailsButtonIdPrefix}`) })
], Store.prototype, "characterDetailsButtonListener", null);
__decorate([
    ButtonComponent({ id: new RegExp(`^${buyStoreCharacterButtonIdPrefix}`) })
], Store.prototype, "buyStoreCharacterButtonListener", null);
Store = __decorate([
    Discord()
], Store);
export default Store;
