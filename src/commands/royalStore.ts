import { bold, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, roleMention } from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import lodash from "lodash";
import { Duration } from "luxon";
import { AchievementEvents } from "../achievements";
import { ConfirmationPrompt } from "../components/ConfirmationPrompt";
import CreateSheetModal, { createRoyalSheetModalFieldIds } from "../components/CreateSheetModal";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { CHANNEL_IDS, ROLE_IDS } from "../data/constants";
import Database from "../database";
import { achievements, bot } from "../main";
import Utils from "../utils";
import Character, { characterDetailsButtonIdPrefix } from "./character";

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
    @SlashOption(COMMAND_OPTIONS.addStoreCharacterGender) gender: "male" | "female",
    @SlashOption(COMMAND_OPTIONS.addStoreCharacterImageURL) imageURL: string,
    interaction: CommandInteraction,
  ) {
    await interaction.showModal(CreateSheetModal(true));
    const modalSubmit = await interaction
      .awaitModalSubmit({
        time: Duration.fromObject({ minutes: 60 }).as("milliseconds"),
        filter: (i) => i.user.id === interaction.user.id,
      })
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

    const familyData = await Database.getFamily(family);
    if (!familyData) {
      Utils.scheduleMessageToDelete(await modalSubmit.editReply({ content: "Família não encontrada." }));
      return;
    }

    const sheet = await Database.insertStoreSheet({
      name,
      royalTitle,
      backstory,
      appearance,
      type: "store",
      transformation,
      price,
      gender,
      origin: familyData?.origin ?? "none",
      familySlug: family,
      imageUrl: imageURL,
      profession: "royal",
    });

    const embed = await Character.getCharacterPreviewEmbed(sheet);
    embed.setAuthor({
      name: `Personagem Canônico à venda por  C$${price}`,
      iconURL: interaction.guild?.iconURL({ forceStatic: true, size: 128 }) ?? undefined,
    });
    const backstoryPreview = lodash.truncate(backstory, { omission: " (...)", length: 256 });
    embed.setDescription(
      `# Preview\n${backstoryPreview}\n\n*Inspecione o personagem utilizando o botão "Detalhes" abaixo. Para comprá-lo, clique no botão "Comprar".*\n\n**Atenção:** A compra é irreversível.`,
    );
    const storeChannel = bot.systemChannels.get(CHANNEL_IDS.characterStore);
    await storeChannel?.send({
      embeds: [embed],
      components: [
        Character.getCharacterDetailsButton(sheet.userId ?? "store", sheet.id).addComponents(
          new ButtonBuilder().setCustomId(getBuyStoreCharacterButtonId(sheet.id)).setLabel("Comprar").setStyle(ButtonStyle.Success),
        ),
      ],
    });

    await bot.systemChannels.get(CHANNEL_IDS.announcementsChannel)?.send({
      content: `${interaction.user.toString()} adicionou um(a) personagem à loja ${storeChannel?.toString()}, ${roleMention(
        ROLE_IDS.storeCharacterAnnouncements,
      )} !\n\nNome: ${bold(sheet.name)}`,
      files: [{ name: `${lodash.kebabCase(sheet.name)}.jpg`, attachment: sheet.imageUrl }],
    });

    Utils.scheduleMessageToDelete(await modalSubmit.editReply({ content: "Personagem adicionado à loja com sucesso!" }));
  }

  @ButtonComponent({ id: new RegExp(`^${characterDetailsButtonIdPrefix}`) })
  public async characterDetailsButtonListener(buttonInteraction: ButtonInteraction) {
    await Character.handleCharacterDetailsButton(buttonInteraction, buttonInteraction.customId.endsWith("store"));
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

    if (user.money < (sheet.price ?? 0)) {
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
        await Database.updateUser(buttonInteraction.user.id, { money: BigInt(Number(user.money) - (sheet.price ?? 0)) });
        await Database.insertSheet(buttonInteraction.user.id, { ...sheet, type: "royal", price: undefined });
        await Database.deleteStoreSheet(sheet.id);
        Utils.scheduleMessageToDelete(
          await promptInteraction.editReply({
            content: `🎉 Personagem ${bold(sheet.name)} comprado(a) com sucesso por C$${bold((sheet.price ?? 0).toString())}!`,
            components: [],
          }),
        );

        await bot.systemChannels.get(CHANNEL_IDS.announcementsChannel)?.send({
          content: `🎉 ${buttonInteraction.user.toString()} comprou um(a) personagem canônico(a) da loja: ${bold(sheet.name)}!`,
          files: [{ name: `${lodash.kebabCase(sheet.name)}.jpg`, attachment: sheet.imageUrl }],
        });

        Utils.scheduleMessageToDelete(buttonInteraction.message, 0);
        achievements.emit(AchievementEvents.onBuyCharacter, { character: sheet, user: promptInteraction.user });
      } else if (promptInteraction.customId === confirmationPrompt.cancelButtonId) {
        Utils.scheduleMessageToDelete(
          await promptInteraction.editReply({
            content: "Compra cancelada.",
            components: [],
          }),
        );
      }
    });
  }
}
