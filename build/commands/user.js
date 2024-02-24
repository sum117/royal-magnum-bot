var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var User_1;
import { Colors, EmbedBuilder, PermissionFlagsBits, bold } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { DateTime } from "luxon";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import Database from "../database";
import { characterTypeSchema } from "../schemas/characterSheetSchema";
import { npcSchema } from "../schemas/npc";
import Character from "./character";
let User = User_1 = class User {
    static async getUserProfileEmbed(user) {
        const userDatabase = await Database.getUser(user.id);
        if (!userDatabase)
            return null;
        const currentCharacterOrNPC = userDatabase.currentNpcId ? await Database.getNPC(userDatabase.currentNpcId) : await Database.getActiveSheet(user.id);
        const characterSheet = characterTypeSchema.safeParse(currentCharacterOrNPC);
        const npc = npcSchema.safeParse(currentCharacterOrNPC);
        const embed = new EmbedBuilder();
        embed.setTitle(`Perfil de ${user.username}`);
        embed.setThumbnail(user.displayAvatarURL());
        embed.setColor(lodash.sample(Object.values(Colors)));
        embed.addFields({ name: "🪙 Pontos de Atividade", value: `C$ ${bold(userDatabase.money.toString())}`, inline: true }, { name: "👑 Fichas Reais", value: userDatabase.royalTokens.toString(), inline: true }, { name: "👥 Fichas de Família", value: userDatabase.familyTokens.toString(), inline: true }, { name: "📅 Data de Entrada", value: user.createdAt.toLocaleDateString(), inline: true });
        if (userDatabase.lastMessageAt) {
            embed.setFooter({ text: "Última mensagem enviada há:" });
            embed.setTimestamp(DateTime.fromJSDate(userDatabase.lastMessageAt).toJSDate());
        }
        if (currentCharacterOrNPC) {
            embed.addFields({ name: "👤 Personagem Atual (Ou NPC)", value: currentCharacterOrNPC.name, inline: true });
            embed.setImage(characterSheet.success ? characterSheet.data.imageUrl : npc.success ? npc.data.image : null);
        }
        return embed;
    }
    async profile(user, interaction) {
        await interaction.deferReply();
        const embed = await User_1.getUserProfileEmbed(user.user);
        const userSheet = await Database.getActiveSheet(user.user.id);
        if (!embed) {
            await interaction.editReply(`Não encontrei o perfil de ${user.displayName}`);
            return;
        }
        const messageOptions = { embeds: [embed] };
        if (userSheet) {
            messageOptions.components = [Character.getCharacterDetailsButton(user.user.id, userSheet.id, "Ver Personagem Ativo", true, false)];
        }
        await interaction.editReply(messageOptions);
    }
    async giveMoney(user, amount, interaction) {
        if (!interaction.inCachedGuild()) {
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
            const agent = await Database.getUser(interaction.member.user.id);
            if (!agent || agent.money < amount || amount < 0) {
                await interaction.editReply(`Você não tem C$${amount} para dar.`);
                return;
            }
            await this.addOrRemoveMoney(interaction.member.user, -amount);
        }
        const isGiven = await this.addOrRemoveMoney(user.user, amount);
        if (!isGiven) {
            await interaction.editReply(`Falhei a dar **C$${amount}** para ${user.displayName}`);
            return;
        }
        await interaction.editReply(`Dei **C$${amount}** para ${user.displayName} com sucesso.`);
    }
    async takeMoney(user, amount, interaction) {
        await interaction.deferReply({ ephemeral: true });
        const isTaken = await this.addOrRemoveMoney(user.user, -amount);
        if (!isTaken) {
            await interaction.editReply(`Falhei a tirar **C$${amount}** de ${user.displayName}`);
            return;
        }
        await interaction.editReply(`Tirei **C$${amount}** de ${user.displayName} com sucesso.`);
    }
    async addOrRemoveMoney(user, amount) {
        const userDatabase = await Database.getUser(user.id);
        if (!userDatabase)
            return false;
        await Database.updateUser(user.id, { money: { increment: amount } });
        return true;
    }
};
__decorate([
    Slash(COMMANDS.profile),
    __param(0, SlashOption(COMMAND_OPTIONS.profileUser))
], User.prototype, "profile", null);
__decorate([
    Slash(COMMANDS.giveMoney),
    __param(0, SlashOption(COMMAND_OPTIONS.giveMoneyUser)),
    __param(1, SlashOption(COMMAND_OPTIONS.giveMoneyAmount))
], User.prototype, "giveMoney", null);
__decorate([
    Slash(COMMANDS.takeMoney),
    __param(0, SlashOption(COMMAND_OPTIONS.takeMoneyUser)),
    __param(1, SlashOption(COMMAND_OPTIONS.takeMoneyAmount))
], User.prototype, "takeMoney", null);
User = User_1 = __decorate([
    Discord()
], User);
export default User;
