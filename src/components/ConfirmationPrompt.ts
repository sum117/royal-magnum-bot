import {
  ActionRowBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  InteractionCollector,
  InteractionResponse,
  Message,
} from "discord.js";
import { Duration } from "luxon";
import { cancelButtonId, confirmButtonId } from "../commands/store";

export interface ConfirmationPromptParams extends BaseMessageOptions {
  promptMessage: string;
  confirmButtonId?: string;
  cancelButtonId?: string;
}

export class ConfirmationPrompt implements BaseMessageOptions {
  public promptMessage: string;
  public confirmButtonId: string;
  public cancelButtonId: string;
  public components: BaseMessageOptions["components"];
  public collector: InteractionCollector<ButtonInteraction> | null = null;

  public constructor(params: ConfirmationPromptParams) {
    this.promptMessage = params.promptMessage;
    this.confirmButtonId = params.confirmButtonId ?? confirmButtonId;
    this.cancelButtonId = params.cancelButtonId ?? cancelButtonId;

    this.components = [
      new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder().setCustomId(this.confirmButtonId).setLabel("Confirmar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(this.cancelButtonId).setLabel("Cancelar").setStyle(ButtonStyle.Danger),
      ),
    ];
  }

  public async send(interaction: CommandInteraction | ButtonInteraction) {
    let message: InteractionResponse | Message;
    if (interaction.deferred) {
      message = await interaction.editReply({ content: this.promptMessage, components: this.components });
    } else if (interaction.replied) {
      message = await interaction.followUp({ content: this.promptMessage, components: this.components });
    } else {
      message = await interaction.reply({ content: this.promptMessage, components: this.components });
    }
    const collector = message.createMessageComponentCollector({
      time: Duration.fromObject({ minutes: 5 }).as("milliseconds"),
      filter: (i) => i.user.id === interaction.user.id && (i.customId === this.confirmButtonId || i.customId === this.cancelButtonId),
      componentType: ComponentType.Button,
      max: 1,
    });
    this.collector = collector as InteractionCollector<ButtonInteraction>;
    return this as ConfirmationPrompt & { collector: InteractionCollector<ButtonInteraction> };
  }
}
