import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const createSheetModalId = "createSheetModalId";
export const createSheetModalFieldIds = ["name", "backstory", "appearance"] as const;
export const createRoyalSheetModalFieldIds = [...createSheetModalFieldIds, "royalTitle", "transformation"] as const;

const getCreateSheetModal = (isRoyal: boolean) => {
  const modal = new ModalBuilder()
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
          .setPlaceholder("Antes de ser um nobre, Artha era um simples camponês que [...]")
          .setMinLength(1)
          .setMaxLength(2000)
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
          .setLabel("História"),
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId(createSheetModalFieldIds[2])
          .setPlaceholder("Artha é um homem de cabelos longos e [...]")
          .setMinLength(1)
          .setMaxLength(512)
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
          .setLabel("Aparência"),
      ),
    );

  if (isRoyal) {
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId(createRoyalSheetModalFieldIds[3])
          .setPlaceholder("Princesa")
          .setMinLength(1)
          .setMaxLength(32)
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
          .setLabel("Título Real"),
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId(createRoyalSheetModalFieldIds[4])
          .setPlaceholder("Uma libélula gigante [...]")
          .setMinLength(1)
          .setMaxLength(2000)
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
          .setLabel("Dádiva / Transformação"),
      ),
    );
  }

  return modal;
};
export default getCreateSheetModal;
