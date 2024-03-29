import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const createNPCModalFieldIds = ["title", "name", "description", "image", "price"] as const;
export const createNPCModalId = "create-npc-modal";
export const createNPCModal = new ModalBuilder()
  .setTitle("Criar NPC")
  .setCustomId(createNPCModalId)
  .setComponents(
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createNPCModalFieldIds[0])
        .setPlaceholder("Título")
        .setMinLength(1)
        .setMaxLength(32)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel("Título"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createNPCModalFieldIds[1])
        .setPlaceholder("Nome")
        .setMinLength(1)
        .setMaxLength(32)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel("Nome"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createNPCModalFieldIds[2])
        .setPlaceholder("Descrição")
        .setMinLength(1)
        .setMaxLength(2000)
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph)
        .setLabel("Descrição"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createNPCModalFieldIds[3])
        .setPlaceholder("Imagem")
        .setMinLength(1)
        .setMaxLength(512)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel("Imagem"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createNPCModalFieldIds[4])
        .setPlaceholder("Preço")
        .setMinLength(1)
        .setMaxLength(32)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel("Preço"),
    ),
  );
