import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, } from "discord.js";
import { Duration } from "luxon";
import { cancelButtonId, confirmButtonId } from "../commands/royalStore";
export class ConfirmationPrompt {
    promptMessage;
    confirmButtonId;
    cancelButtonId;
    components;
    collector = null;
    constructor(params) {
        this.promptMessage = params.promptMessage;
        this.confirmButtonId = params.confirmButtonId ?? confirmButtonId;
        this.cancelButtonId = params.cancelButtonId ?? cancelButtonId;
        this.components = [
            new ActionRowBuilder().setComponents(new ButtonBuilder().setCustomId(this.confirmButtonId).setLabel("Confirmar").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(this.cancelButtonId).setLabel("Cancelar").setStyle(ButtonStyle.Danger)),
        ];
    }
    async send(interaction) {
        let message;
        if (interaction.deferred) {
            message = await interaction.editReply({ content: this.promptMessage, components: this.components });
        }
        else if (interaction.replied) {
            message = await interaction.followUp({ content: this.promptMessage, components: this.components, ephemeral: true });
        }
        else {
            message = await interaction.reply({ content: this.promptMessage, components: this.components, ephemeral: true });
        }
        const collector = message.createMessageComponentCollector({
            time: Duration.fromObject({ minutes: 5 }).as("milliseconds"),
            filter: (i) => i.user.id === interaction.user.id && (i.customId === this.confirmButtonId || i.customId === this.cancelButtonId),
            max: 1,
            componentType: ComponentType.Button,
        });
        this.collector = collector;
        return this;
    }
}
