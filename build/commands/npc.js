var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NPC_1;
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, } from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { ConfirmationPrompt } from "../components/ConfirmationPrompt";
import { createNPCModal, createNPCModalFieldIds, createNPCModalId } from "../components/CreateNPCModal";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { CHANNEL_IDS, ROLE_IDS } from "../data/constants";
import Database from "../database";
import { bot } from "../main";
import { imageGifUrl } from "../schemas/utils";
import Utils from "../utils";
export const buyNpcButtonIdPrefix = "buyNPC";
export const getBuyNPCButtonId = (npcId) => `${buyNpcButtonIdPrefix}_${npcId}`;
let NPC = NPC_1 = class NPC {
    static getNPCEmbed(npc, isStorePreview = false) {
        const price = npc.price > 0 ? npc.price.toString() : "Grátis";
        const embed = new EmbedBuilder()
            .setAuthor({ name: npc.title })
            .setTitle(npc.name)
            .setDescription(npc.description)
            .setColor(lodash.sample(Object.values(Colors)))
            .setThumbnail(npc.imageUrl);
        if (isStorePreview) {
            const buyNPCButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(getBuyNPCButtonId(npc.id)).setLabel("Comprar Acesso").setStyle(ButtonStyle.Success));
            embed.addFields([{ name: "Preço", value: price, inline: true }]);
            return { embeds: [embed], components: [buyNPCButton] };
        }
        else
            return { embeds: [embed] };
    }
    async createNPC(interaction) {
        await interaction.showModal(createNPCModal);
        const modalSubmit = await Utils.awaitModalSubmission(interaction, createNPCModalId);
        if (!modalSubmit)
            return;
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
        const newNPC = await Database.insertNPC({ title, name, description, imageUrl, price: priceNumber });
        await modalSubmit.editReply({ content: "NPC criado com sucesso!", files: [new AttachmentBuilder(imageUrl).setName(`${lodash.kebabCase(name)}.png`)] });
        const storeChannel = bot.systemChannels.get(CHANNEL_IDS.generalStore);
        await storeChannel.send(NPC_1.getNPCEmbed(newNPC, true));
    }
    async setNPC(npcId = null, interaction) {
        await interaction.deferReply({ ephemeral: true });
        const user = await Database.getUser(interaction.user.id);
        if (!user) {
            await interaction.editReply({ content: "Usuário não encontrado" });
            return;
        }
        if (!npcId) {
            await Database.updateUser(interaction.user.id, { currentNpcId: null });
            await interaction.editReply({ content: "Você não está mais utilizando nenhum NPC" });
            return;
        }
        const npc = await Database.getNPC(npcId);
        if (!npc) {
            await interaction.reply({ content: "NPC não encontrado", ephemeral: true });
            return;
        }
        if (!npc.users.some((npcUser) => npcUser.id === interaction.user.id)) {
            await interaction.editReply({ content: "Você não tem acesso a esse NPC. Boa tentativa :)" });
            return;
        }
        await Database.updateUser(interaction.user.id, { currentNpcId: npcId });
        await interaction.editReply({ content: `Você agora está utilizando ${npc.name}` });
    }
    async deleteNPC(npcId, interaction) {
        await interaction.deferReply();
        const npc = await Database.getNPC(npcId);
        if (!npc) {
            await interaction.reply({ content: "NPC não encontrado", ephemeral: true });
            return;
        }
        await Database.deleteNPC(npcId);
        await interaction.editReply({ content: `NPC ${npc.name} deletado com sucesso!` });
    }
    async buyNPCButtonListener(buttonInteraction) {
        await buttonInteraction.deferReply({ ephemeral: true });
        const npcId = buttonInteraction.customId.split("_")[1];
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
        if (npc.users.some((npcUser) => npcUser.id === buttonInteraction.user.id)) {
            await buttonInteraction.editReply({ content: "Você já tem acesso a esse NPC" });
            return;
        }
        const confirmationPrompt = new ConfirmationPrompt({
            promptMessage: `Você tem certeza que deseja comprar acesso para utilizar ${npc.name} por C$${npc.price}? Essa ação é irreversível.`,
        });
        const sentPrompt = await confirmationPrompt.send(buttonInteraction);
        sentPrompt.collector.on("collect", async (promptInteraction) => {
            await promptInteraction.deferReply({ ephemeral: true });
            if (promptInteraction.customId === confirmationPrompt.confirmButtonId) {
                await Database.updateUser(buttonInteraction.user.id, { money: BigInt(Number(user.money) - npc.price) });
                await Database.updateNPC(npcId, {
                    users: { connect: { id: buttonInteraction.user.id } },
                });
                void Utils.scheduleMessageToDelete(await promptInteraction.editReply({
                    content: `🎉 Você comprou acesso para utilizar ${npc.name} por C$${npc.price}!`,
                    components: [],
                }));
                const member = await promptInteraction.guild?.members.fetch(buttonInteraction.user.id);
                if (!member)
                    return;
                if (!member.roles.cache.get(ROLE_IDS.member))
                    member.roles.add(ROLE_IDS.member);
            }
            else {
                void Utils.scheduleMessageToDelete(await promptInteraction.editReply({ content: "Compra cancelada." }));
            }
        });
    }
};
__decorate([
    Slash(COMMANDS.createNPC)
], NPC.prototype, "createNPC", null);
__decorate([
    Slash(COMMANDS.setNPC),
    __param(0, SlashOption(COMMAND_OPTIONS.npcId))
], NPC.prototype, "setNPC", null);
__decorate([
    Slash(COMMANDS.deleteNPC),
    __param(0, SlashOption(COMMAND_OPTIONS.npcId))
], NPC.prototype, "deleteNPC", null);
__decorate([
    ButtonComponent({ id: new RegExp(`^${buyNpcButtonIdPrefix}`) })
], NPC.prototype, "buyNPCButtonListener", null);
NPC = NPC_1 = __decorate([
    Discord()
], NPC);
export default NPC;
