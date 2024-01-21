import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction,
  bold,
  channelMention,
  userMention,
} from "discord.js";
import { Duration } from "luxon";
import { ROLEPLAY_TYPE_TRANSLATION_MAP } from "../data/constants";
import Database from "../database";
import { characterTypeSchema } from "../schemas/characterSheetSchema";
import { npcSchema } from "../schemas/npc";
import Utils from "../utils";

const selectIds = {
  roleplayType: "roleplayType",
  roleplayChannel: "roleplayChannel",
  roleplayUser: "roleplayUser",
} as const;

const textInputIds = {
  characterPhrase: "characterPhrase",
  starterDescription: "starterDescription",
};
const openFormButtonId = "openFormButton" as const;
const askRoleplayModalId = "askRoleplayModal" as const;

const selectRPType = new StringSelectMenuBuilder()
  .setCustomId(selectIds.roleplayType)
  .setPlaceholder("Selecione seu gênero de roleplay favorito")
  .addOptions([
    new StringSelectMenuOptionBuilder().setLabel("Romance").setValue("romance").setDescription("Casamento, relacionamentos, etc."),
    new StringSelectMenuOptionBuilder().setLabel("Aventura").setValue("adventure").setDescription("Exploração, aventuras, etc."),
    new StringSelectMenuOptionBuilder().setLabel("Terror").setValue("horror").setDescription("Histórias de terror, suspense, etc."),
    new StringSelectMenuOptionBuilder().setLabel("Comédia").setValue("comedy").setDescription("Histórias engraçadas, etc."),
    new StringSelectMenuOptionBuilder().setLabel("Ação").setValue("action").setDescription("Histórias de ação, etc."),
    new StringSelectMenuOptionBuilder().setLabel("Drama").setValue("drama").setDescription("Histórias dramáticas, etc."),
  ]);
const selectChannel = new ChannelSelectMenuBuilder().setCustomId(selectIds.roleplayChannel).setPlaceholder("Selecione o canal sugerido de roleplay");
const selectUser = new UserSelectMenuBuilder().setCustomId(selectIds.roleplayUser).setPlaceholder("Selecione o seu usuário preferido");
const buttonOpenForm = new ButtonBuilder().setCustomId(openFormButtonId).setLabel("Abrir formulário").setStyle(ButtonStyle.Success).setDisabled(true);

const askRoleplayModal = new ModalBuilder()
  .setCustomId(askRoleplayModalId)
  .setTitle("Formulário de Pedir RP")
  .addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(textInputIds.characterPhrase)
        .setPlaceholder("Digite uma frase de seu personagem")
        .setMaxLength(256)
        .setMinLength(10)
        .setLabel("Frase do personagem")
        .setStyle(TextInputStyle.Short)
        .setRequired(false),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(textInputIds.starterDescription)
        .setPlaceholder("Descreva como gostaria que a história começasse")
        .setMaxLength(1024)
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(10)
        .setLabel("Descrição inicial")
        .setRequired(false),
    ),
  );
type AskRPEmbedParams = {
  user: User;
  characterPhrase: string;
  starterDescription: string;
  roleplayType: string;
  roleplayChannel: string;
  roleplayUser: string;
};

export default class AskRoleplayForm {
  private timeout = Duration.fromObject({ minutes: 5 });

  private userChoices = {
    roleplayType: "",
    roleplayChannel: "",
    roleplayUser: "",
  };
  private messages = {
    roleplayType: "Você selecionou o gênero de roleplay: ",
    roleplayChannel: "Você selecionou o canal de roleplay: ",
    roleplayUser: "Você selecionou o usuário: ",
  };

  constructor(public interaction: ChatInputCommandInteraction) {}

  public static async getEmbed(params: AskRPEmbedParams) {
    const { user, characterPhrase, starterDescription, roleplayType, roleplayChannel, roleplayUser } = params;

    const databaseUser = await Database.getUser(user.id);
    if (!databaseUser) return;

    const npc = npcSchema.safeParse(databaseUser.currentNpcId ? await Database.getNPC(databaseUser.currentNpcId) : null);
    const character = characterTypeSchema.safeParse(await Database.getActiveSheet(user.id));

    const embed = new EmbedBuilder()
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setTitle(`RP PING DE ${user.username}`)
      .setColor("Random");

    if (character.success) {
      embed.setImage(character.data.imageUrl);
    } else if (npc.success) {
      embed.setImage(npc.data.image);
    }

    if (starterDescription.trim()) {
      embed.setDescription(starterDescription);
    }

    if (characterPhrase.trim()) {
      embed.addFields({ name: "Frase do personagem", value: characterPhrase, inline: false });
    }

    if (roleplayUser.trim()) {
      embed.addFields({ name: "Usuário", value: userMention(roleplayUser), inline: true });
    }

    embed.addFields([
      { name: "Gênero", value: ROLEPLAY_TYPE_TRANSLATION_MAP[roleplayType as keyof typeof ROLEPLAY_TYPE_TRANSLATION_MAP], inline: true },
      { name: "Canal", value: channelMention(roleplayChannel), inline: true },
    ]);

    return embed;
  }

  public async send() {
    if (!this.interaction.inCachedGuild()) return;

    const message = await this.interaction.reply({
      ephemeral: true,
      fetchReply: true,
      content: "Selecione as opções abaixo para pedir um roleplay",
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectRPType),
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectChannel),
        new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectUser),
        new ActionRowBuilder<ButtonBuilder>().addComponents(buttonOpenForm),
      ],
    });

    const collector = message.createMessageComponentCollector({
      time: this.timeout.as("milliseconds"),
      filter: (i) => i.user.id === this.interaction.user.id && Object.values(selectIds).includes(i.customId),
    });

    collector.on("collect", async (selectMenuInteraction: StringSelectMenuInteraction | UserSelectMenuInteraction | ChannelSelectMenuInteraction) => {
      type SelectMenuId = (typeof selectIds)[keyof typeof selectIds];
      this.userChoices[selectMenuInteraction.customId as SelectMenuId] = selectMenuInteraction.values[0];
      await selectMenuInteraction.deferUpdate();
      if (this.isAllSelected()) {
        await selectMenuInteraction.editReply({
          content: this.getMessage(),
          components: [
            ...selectMenuInteraction.message.components.filter((component) =>
              component.components.some((component) => component.customId !== openFormButtonId),
            ),
            new ActionRowBuilder<ButtonBuilder>().addComponents(buttonOpenForm.setDisabled(false)),
          ],
        });
      } else {
        await selectMenuInteraction.editReply({ content: this.getMessage() });
      }
    });

    const buttonOpenFormInteraction = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: this.timeout.as("milliseconds"),
      filter: (i) => i.user.id === this.interaction.user.id && i.customId === openFormButtonId,
    });

    await buttonOpenFormInteraction.showModal(askRoleplayModal);

    const modalSubmit = await Utils.awaitModalSubmission(buttonOpenFormInteraction, askRoleplayModalId);
    if (!modalSubmit) return;
    await modalSubmit.reply({ content: "RP Ping enviado com sucesso!", ephemeral: true });

    const characterPhrase = modalSubmit.fields.getTextInputValue(textInputIds.characterPhrase);
    const starterDescription = modalSubmit.fields.getTextInputValue(textInputIds.starterDescription);

    return {
      characterPhrase,
      starterDescription,
      ...this.userChoices,
    };
  }

  private getMessage() {
    type UserChoicesKey = keyof typeof this.userChoices;
    return Object.keys(this.userChoices)
      .filter((key): key is UserChoicesKey => Boolean(this.userChoices[key as UserChoicesKey]))
      .map((key) => {
        switch (key) {
          case "roleplayType":
            return (
              this.messages.roleplayType + bold(ROLEPLAY_TYPE_TRANSLATION_MAP[this.userChoices.roleplayType as keyof typeof ROLEPLAY_TYPE_TRANSLATION_MAP])
            );
          case "roleplayChannel":
            return this.messages.roleplayChannel + bold(channelMention(this.userChoices.roleplayChannel));
          case "roleplayUser":
            return this.messages.roleplayUser + bold(userMention(this.userChoices.roleplayUser));
        }
      })
      .join("\n");
  }

  private isAllSelected() {
    return [this.userChoices.roleplayChannel, this.userChoices.roleplayType].every(Boolean);
  }
}
