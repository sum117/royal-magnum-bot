import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const createSheetModalId = "createSheetModalId";
export const createSheetModalFieldIds = ["name", "royalTitle", "backstory", "appearance", "transformation"] as const;

const CreateSheetModal = new ModalBuilder()
  .setTitle("Criação de ficha de personagem")
  .setCustomId(createSheetModalId)
  .addComponents(
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createSheetModalFieldIds[0])
        .setPlaceholder("Artha Avarossa")
        .setMinLength(3)
        .setMaxLength(32)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel("Nome"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createSheetModalFieldIds[1])
        .setPlaceholder("Princesa")
        .setMinLength(1)
        .setMaxLength(32)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel("Título Real"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createSheetModalFieldIds[2])
        .setPlaceholder("Antes de ser uma nobre, Artha era um simples camponês que [...]")
        .setMinLength(1)
        .setMaxLength(2000)
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph)
        .setLabel("História"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createSheetModalFieldIds[3])
        .setPlaceholder("Aparência")
        .setMinLength(1)
        .setMaxLength(512)
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph)
        .setLabel("Artha Avarossa"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createSheetModalFieldIds[4])
        .setPlaceholder("Uma libelula gigante [...]")
        .setMinLength(1)
        .setMaxLength(2000)
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph)
        .setLabel("Dádiva / Transformação"),
    ),
  );

export default CreateSheetModal;
