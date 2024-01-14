import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from "discord.js";
import { BASE_ITEM_IMAGE_URL } from "../data/constants";

export const createItemModalId = "createItemModalId";
export const createItemModalFieldIds = ["name", "description", "image"] as const;
const createItemModal = new ModalBuilder()
  .setCustomId(createItemModalId)
  .setTitle("Criação de item")
  .addComponents(
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createItemModalFieldIds[0])
        .setPlaceholder("Espada de madeira")
        .setMinLength(3)
        .setMaxLength(128)
        .setRequired(true)
        .setLabel("Nome"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createItemModalFieldIds[1])
        .setPlaceholder("Uma espada de madeira comum.")
        .setMinLength(1)
        .setMaxLength(2048)
        .setRequired(true)
        .setLabel("Descrição"),
    ),
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(createItemModalFieldIds[2])
        .setPlaceholder(BASE_ITEM_IMAGE_URL)
        .setMinLength(1)
        .setMaxLength(512)
        .setRequired(true)
        .setLabel("Imagem"),
    ),
  );
