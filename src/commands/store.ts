import { ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, bold, roleMention } from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { Duration } from "luxon";
import { ConfirmationPrompt } from "../components/ConfirmationPrompt";
import CreateSheetModal, { createRoyalSheetModalFieldIds } from "../components/CreateSheetModal";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { CHANNEL_IDS, ROLE_IDS } from "../data/constants";
import Database from "../database";
import Utils from "../utils";
import { characterDetailsButtonIdPrefix } from "./character";

export const buyStoreCharacterButtonIdPrefix = "buy-sheet";
export const getBuyStoreCharacterButtonId = (characterId: string) => `${buyStoreCharacterButtonIdPrefix}-${characterId}`;

export const confirmButtonId = "confirmButtonId";
export const cancelButtonId = "cancelButtonId";

@Discord()
export default class Store {
  @Slash(COMMANDS.addStoreCharacter)
  public async addStoreCharacter(
    @SlashOption(COMMAND_OPTIONS.addStoreCharacterPrice) price: number,
    @SlashOption(COMMAND_OPTIONS.addStoreCharacterFamily) family: string,
    @SlashOption(COMMAND_OPTIONS.addStoreCharacterImageURL) imageURL: string,
    interaction: CommandInteraction,
  ) {
    await interaction.showModal(CreateSheetModal(true));
    const modalSubmit = await interaction
      .awaitModalSubmit({ time: Duration.fromObject({ minutes: 60 }).as("milliseconds"), filter: (i) => i.user.id === interaction.user.id })
      .catch(() => {
        console.log("Modal para adicionar ficha à loja expirou.");
        return null;
      });
    if (!modalSubmit) {
      Utils.scheduleMessageToDelete(await interaction.editReply({ content: "Modal expirado." }));
      return;
    }
    await modalSubmit.deferReply();
    const [name, backstory, appearance, royalTitle, transformation] = createRoyalSheetModalFieldIds.map((fieldId) =>
      modalSubmit.fields.getTextInputValue(fieldId),
    );

    const sheet = await Database.insertStoreSheet({
      name,
      royalTitle,
      backstory,
      appearance,
      transformation,
      price,
      familySlug: family,
      imageUrl: imageURL,
      isStoreCharacter: true,
    });

    const embed = await Utils.getCharacterPreviewEmbed(sheet);
    embed.setAuthor({
      name: `Personagem Canônico à venda por  C$${price}`,
      iconURL: interaction.guild?.iconURL({ forceStatic: true, size: 128 }) ?? undefined,
    });
    const backstoryPreview = lodash.truncate(backstory, { omission: " (...)", length: 256 });
    embed.setDescription(
      `# Preview\n${backstoryPreview}\n\n*Inspecione o personagem utilizando o botão "Detalhes" abaixo. Para comprá-lo, clique no botão "Comprar".*\n\n**Atenção:** A compra é irreversível.`,
    );

    const storeChannel = interaction.guild?.channels.cache.get(CHANNEL_IDS.characterStore);
    const announcementsChannel = interaction.guild?.channels.cache.get(CHANNEL_IDS.announcementsChannel);
    if (!storeChannel || !storeChannel.isTextBased() || !announcementsChannel || !announcementsChannel.isTextBased()) {
      Utils.scheduleMessageToDelete(await interaction.editReply({ content: "Canal da loja não encontrado." }));
      return;
    }

    await storeChannel.send({
      embeds: [embed],
      components: [
        Utils.getCharacterDetailsButton(sheet.userId, sheet.characterId).addComponents(
          new ButtonBuilder().setCustomId(getBuyStoreCharacterButtonId(sheet.characterId)).setLabel("Comprar").setStyle(ButtonStyle.Success),
        ),
      ],
    });
    await announcementsChannel.send({
      content: `${interaction.user.toString()} adicionou um(a) personagem à loja ${storeChannel.toString()}, ${roleMention(
        ROLE_IDS.storeCharacterAnnouncements,
      )} !\n\nNome: ${bold(sheet.name)}`,
      files: [{ name: `${lodash.kebabCase(sheet.name)}.jpg`, attachment: sheet.imageUrl }],
    });

    Utils.scheduleMessageToDelete(await modalSubmit.editReply({ content: "Personagem adicionado à loja com sucesso!" }));
  }

  @ButtonComponent({ id: new RegExp(`^${characterDetailsButtonIdPrefix}`) })
  public async characterDetailsButtonListener(buttonInteraction: ButtonInteraction) {
    await Utils.handleCharacterDetailsButton(buttonInteraction, true);
  }

  @ButtonComponent({ id: new RegExp(`^${buyStoreCharacterButtonIdPrefix}`) })
  public async buyStoreCharacterButtonListener(buttonInteraction: ButtonInteraction) {
    const [characterId] = buttonInteraction.customId.split("-").slice(2);
    await buttonInteraction.deferReply({ ephemeral: true });

    const sheet = await Database.getStoreSheet(characterId);
    if (!sheet) {
      Utils.scheduleMessageToDelete(await buttonInteraction.editReply({ content: "Personagem não encontrado." }));
      return;
    }
    const user = await Database.getUser(buttonInteraction.user.id);
    if (!user) {
      Utils.scheduleMessageToDelete(await buttonInteraction.editReply({ content: "Usuário não encontrado." }));
      return;
    }

    if (user.money < sheet.price) {
      Utils.scheduleMessageToDelete(await buttonInteraction.editReply({ content: "Você não tem dinheiro suficiente." }));
      return;
    }

    const confirmationPrompt = new ConfirmationPrompt({
      promptMessage: `Você tem certeza que deseja comprar ${bold(sheet.name)} por C$${sheet.price}? Essa ação é irreversível.`,
    });
    const sentPrompt = await confirmationPrompt.send(buttonInteraction);

    sentPrompt.collector.on("collect", async (promptInteraction) => {
      await promptInteraction.deferUpdate();
      if (promptInteraction.customId === confirmationPrompt.confirmButtonId) {
        await Database.updateUser(buttonInteraction.user.id, { money: user.money - sheet.price });
        await Database.insertSheet(buttonInteraction.user.id, sheet);
        await Database.deleteStoreSheet(sheet.characterId);
        Utils.scheduleMessageToDelete(
          await promptInteraction.editReply({
            content: `🎉 Personagem ${bold(sheet.name)} comprado(a) com sucesso por C$${bold(sheet.price.toString())}!`,
            components: [],
          }),
        );
        const announcementsChannel = promptInteraction.guild?.channels.cache.get(CHANNEL_IDS.announcementsChannel);
        if (!announcementsChannel || !announcementsChannel.isTextBased()) {
          Utils.scheduleMessageToDelete(await promptInteraction.editReply({ content: "Canal de anúncios não encontrado." }));
          return;
        }
        await announcementsChannel.send({
          content: `🎉 ${buttonInteraction.user.toString()} comprou um(a) personagem canônico(a) da loja: ${bold(sheet.name)}!`,
          files: [{ name: `${lodash.kebabCase(sheet.name)}.jpg`, attachment: sheet.imageUrl }],
        });
        Utils.scheduleMessageToDelete(buttonInteraction.message, 0);
      } else if (promptInteraction.customId === confirmationPrompt.cancelButtonId) {
        Utils.scheduleMessageToDelete(await promptInteraction.editReply({ content: "Compra cancelada.", components: [] }));
      }
    });
  }
}
