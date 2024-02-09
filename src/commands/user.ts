import type { BaseMessageOptions, ColorResolvable, User as DiscordUser, GuildMember } from "discord.js";
import { ChatInputCommandInteraction, Colors, EmbedBuilder, PermissionFlagsBits, bold } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { DateTime } from "luxon";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import Database from "../database";
import { characterTypeSchema } from "../schemas/characterSheetSchema";
import { npcSchema } from "../schemas/npc";
import Character from "./character";

@Discord()
export default class User {
  public static async getUserProfileEmbed(user: DiscordUser) {
    const userDatabase = await Database.getUser(user.id);
    if (!userDatabase) return null;

    const currentCharacterOrNPC = userDatabase.currentNpcId ? await Database.getNPC(userDatabase.currentNpcId) : await Database.getActiveSheet(user.id);
    const characterSheet = characterTypeSchema.safeParse(currentCharacterOrNPC);
    const npc = npcSchema.safeParse(currentCharacterOrNPC);

    const embed = new EmbedBuilder();
    embed.setTitle(`Perfil de ${user.username}`);
    embed.setThumbnail(user.displayAvatarURL());
    embed.setColor(lodash.sample(Object.values(Colors)) as ColorResolvable);
    embed.addFields(
      { name: "🪙 Pontos de Atividade", value: `C$ ${bold(userDatabase.money.toString())}`, inline: true },
      { name: "👑 Fichas Reais", value: userDatabase.royalTokens.toString(), inline: true },
      { name: "👥 Fichas de Família", value: userDatabase.familyTokens.toString(), inline: true },
      { name: "📅 Data de Entrada", value: user.createdAt.toLocaleDateString(), inline: true },
    );

    if (userDatabase.lastMessageAt) {
      embed.setFooter({ text: "Última mensagem enviada há:" });
      embed.setTimestamp(DateTime.fromISO(userDatabase.lastMessageAt).toJSDate());
    }

    if (currentCharacterOrNPC) {
      embed.addFields({ name: "👤 Personagem Atual (Ou NPC)", value: currentCharacterOrNPC.name, inline: true });
      embed.setImage(characterSheet.success ? characterSheet.data.imageUrl : npc.success ? npc.data.image : null);
    }

    return embed;
  }

  @Slash(COMMANDS.profile)
  public async profile(@SlashOption(COMMAND_OPTIONS.profileUser) user: GuildMember, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const embed = await User.getUserProfileEmbed(user.user);
    const userSheet = await Database.getActiveSheet(user.user.id);

    if (!embed) {
      await interaction.editReply(`Não encontrei o perfil de ${user.displayName}`);
      return;
    }
    const messageOptions: BaseMessageOptions = { embeds: [embed] };
    if (userSheet) {
      messageOptions.components = [Character.getCharacterDetailsButton(user.user.id, userSheet.characterId, "Ver Personagem Ativo", true, false)];
    }
    await interaction.editReply(messageOptions);
  }

  @Slash(COMMANDS.giveMoney)
  public async giveMoney(
    @SlashOption(COMMAND_OPTIONS.giveMoneyUser) user: GuildMember,
    @SlashOption(COMMAND_OPTIONS.giveMoneyAmount) amount: number,
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.inCachedGuild()) {
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      const agent = await Database.getUser(interaction.member.user.id);
      if (!agent || agent.money < amount) {
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

  @Slash(COMMANDS.takeMoney)
  public async takeMoney(
    @SlashOption(COMMAND_OPTIONS.takeMoneyUser) user: GuildMember,
    @SlashOption(COMMAND_OPTIONS.takeMoneyAmount) amount: number,
    interaction: ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const isTaken = await this.addOrRemoveMoney(user.user, -amount);
    if (!isTaken) {
      await interaction.editReply(`Falhei a tirar **C$${amount}** de ${user.displayName}`);
      return;
    }

    await interaction.editReply(`Tirei **C$${amount}** de ${user.displayName} com sucesso.`);
  }

  private async addOrRemoveMoney(user: DiscordUser, amount: number) {
    const userDatabase = await Database.getUser(user.id);
    if (!userDatabase) return false;
    userDatabase.money = userDatabase.money + amount;
    await Database.updateUser(user.id, userDatabase);
    return true;
  }
}
