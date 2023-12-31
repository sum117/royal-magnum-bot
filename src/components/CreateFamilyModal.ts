import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const createFamilyModalId = "createFamilyModalId";
export const createFamilyModalFieldIds = ["name", "description", "image"] as const;

const CreateFamilyModal = new ModalBuilder()
  .setTitle("Criação de ficha de família")
  .setCustomId(createFamilyModalId)
  .addComponents(
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createFamilyModalFieldIds[0])
        .setPlaceholder("Avarossa")
        .setMinLength(3)
        .setMaxLength(32)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel("Nome"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createFamilyModalFieldIds[1])
        .setPlaceholder("A família Avarossa é uma família nobre [...]")
        .setMinLength(1)
        .setMaxLength(2000)
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph)
        .setLabel("Descrição"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createFamilyModalFieldIds[2])
        .setPlaceholder("https://i.imgur.com/9k0Fg4w.png")
        .setMinLength(1)
        .setMaxLength(512)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel("Imagem"),
    ),
  );

export default CreateFamilyModal;
