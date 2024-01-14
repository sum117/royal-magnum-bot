import { Discord, Slash, SlashOption } from "discordx";
import { COMMAND_OPTIONS, COMMANDS } from "../data/commands";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import type { Item as ItemSchema } from "../schemas/itemSchema";
import { ConsumableItem, EquipmentItem, ItemRarity, ItemType, itemTypeEnumSchema } from "../schemas/itemSchema";
import Utils from "../utils";
import createFamilyModal, { createFamilyModalFieldIds, createFamilyModalId } from "../components/CreateFamilyModal";
import Database from "../database";
import { CONSUMABLE_STATS_TRANSLATIONS, EQUIPMENT_STATS_TRANSLATIONS, ITEM_STAT_RANGES, RARITY_COLORS } from "../data/constants";
import lodash from "lodash";
import { EquipmentSlotEnum, equipmentSlotEnumSchema } from "../schemas/equipmentSlotsSchema";
import { DateTime } from "luxon";
import { Profession } from "../schemas/characterSheetSchema";

@Discord()
export class Item {
  public static createItemEmbed(item: ItemSchema) {
    const embed = new EmbedBuilder()
      .setTitle(item.name)
      .setDescription(item.description)
      .setImage(item.image)
      .setTimestamp(DateTime.now().toMillis())
      .setColor(RARITY_COLORS[item.rarity]);
    embed.addFields({ name: "Tipo", value: item.itemType });
    const getItemFields = <T extends ItemSchema>(item: T) => {
      const itemTranslationMap = item.itemType === itemTypeEnumSchema.Enum.consumable ? CONSUMABLE_STATS_TRANSLATIONS : EQUIPMENT_STATS_TRANSLATIONS;
      return Object.entries(itemTranslationMap).map(([stat, translation]) => {
        return {
          name: translation,
          value: item[stat as keyof T]?.toString() || "0",
          inline: true,
        };
      });
    };

    if (item.itemType === itemTypeEnumSchema.Enum.armor || item.itemType === itemTypeEnumSchema.Enum.weapon) {
      embed.addFields(getItemFields(item as EquipmentItem));
    } else if (item.itemType === itemTypeEnumSchema.Enum.consumable) {
      embed.addFields(getItemFields(item as ConsumableItem));
    }

    return embed;
  }

  public static getItemRecipeCost(recipeLevel: number) {
    const rarityLevelMap = {
      common: 1 <= recipeLevel && recipeLevel <= 20,
      uncommon: 20 < recipeLevel && recipeLevel <= 40,
      rare: 40 < recipeLevel && recipeLevel <= 60,
      epic: 60 < recipeLevel && recipeLevel <= 80,
      legendary: 80 < recipeLevel && recipeLevel <= 100,
    };
    const rarity = Object.entries(rarityLevelMap).find(([, condition]) => condition)?.[0] as ItemRarity;
    const itemStatRange = ITEM_STAT_RANGES[rarity];

    const [wood, stone, iron, food, gold] = Array.from({ length: 5 }, () => {
      return lodash.random(itemStatRange.min, itemStatRange.max);
    });

    return {
      wood,
      stone,
      iron,
      food,
      gold,
    };
  }

  public static getItemStats(itemType: ItemType, rarity: ItemRarity, slot: EquipmentSlotEnum | null = null, ranged: boolean = false) {
    const itemStatRange = ITEM_STAT_RANGES[rarity];
    switch (itemType) {
      case itemTypeEnumSchema.Enum.armor:
        const [attack, defense, armorHealth, speed, range] = Array.from({ length: 5 }, () => {
          return lodash.random(itemStatRange.min, itemStatRange.max);
        });

        return {
          slot,
          attack,
          defense,
          health: armorHealth,
          speed,
          range: 0,
        };

      case itemTypeEnumSchema.Enum.consumable:
        const [hunger, thirst, consumableHealth, stamina, duration] = Array.from({ length: 5 }, () => {
          return lodash.random(itemStatRange.min, itemStatRange.max);
        });

        return {
          hunger,
          thirst,
          health: consumableHealth,
          stamina,
          duration,
        };
      case itemTypeEnumSchema.Enum.weapon:
        const [weaponAttack, weaponDefense, weaponHealth, weaponSpeed, weaponRange] = Array.from({ length: 5 }, () => {
          return lodash.random(itemStatRange.min, itemStatRange.max);
        });
        return {
          slot: slot,
          attack: weaponAttack,
          defense: weaponDefense,
          health: weaponHealth,
          speed: weaponSpeed,
          range: ranged ? weaponRange : 0,
        };

      case itemTypeEnumSchema.Enum.other:
        return {};
    }
  }

  @Slash(COMMANDS.makeItem)
  public async makeItem(
    @SlashOption(COMMAND_OPTIONS.makeItemType) itemType: ItemType,
    @SlashOption(COMMAND_OPTIONS.makeItemRarity) rarity: ItemRarity = "common",
    @SlashOption(COMMAND_OPTIONS.makeItemSlot) slot: EquipmentSlotEnum | null = null,
    @SlashOption(COMMAND_OPTIONS.makeItemRanged) ranged: boolean = false,
    interaction: ChatInputCommandInteraction,
  ) {
    const errors = {
      otherOrConsumableCannotHaveMetadata: {
        condition: (itemType === itemTypeEnumSchema.Enum.other || itemType === itemTypeEnumSchema.Enum.consumable) && (ranged || slot),
        message: "Você não pode criar um item consumível com metadados",
      },
      invalidRangedProvided: {
        condition: itemType === itemTypeEnumSchema.Enum.armor && ranged,
        message: "Você não pode criar uma armadura ranged",
      },
      noSlotProvided: {
        condition: (itemType === itemTypeEnumSchema.Enum.armor || itemType === itemTypeEnumSchema.Enum.weapon) && !slot,
        message: "Você precisa fornecer um slot para o item",
      },
      wrongSlotProvided: {
        condition: itemType === itemTypeEnumSchema.Enum.armor && slot && !Object.values(equipmentSlotEnumSchema.Enum).includes(slot),
        message: "Você precisa fornecer um slot válido para o item",
      },
      wrongSlotProvidedWeapon: {
        condition:
          itemType === itemTypeEnumSchema.Enum.weapon &&
          slot &&
          ![equipmentSlotEnumSchema.Enum.rightHand, equipmentSlotEnumSchema.Enum.leftHand].includes(slot),
        message: "Você precisa fornecer um slot de mão para o item",
      },
    };
    const error = Object.entries(errors).find(([_, { condition }]) => condition);
    if (error) {
      await interaction.reply(error[1].message);
      return;
    }

    await interaction.showModal(createFamilyModal);
    const modalSubmit = await Utils.awaitModalSubmission(interaction, createFamilyModalId);
    if (!modalSubmit) return;
    await modalSubmit.deferReply();
    const [name, description, image] = createFamilyModalFieldIds.map((fieldId) => modalSubmit.fields.getTextInputValue(fieldId));
    const stats = Item.getItemStats(itemType, rarity, slot);
    const item = {
      name,
      description,
      image,
      rarity,
      madeBy: "system",
      itemType,
      ...stats,
    };
    const createdItem = await Database.insertItem(item);
    const embed = Item.createItemEmbed(createdItem);

    await modalSubmit.editReply({ embeds: [embed] });
  }

  @Slash(COMMANDS.makeItemRecipe)
  public async makeItemRecipe(
    @SlashOption(COMMAND_OPTIONS.makeItemRecipeProfession) profession: Profession,
    @SlashOption(COMMAND_OPTIONS.makeItemRecipeLevel) level: number = 1,
    @SlashOption(COMMAND_OPTIONS.makeItemRecipeItemId) itemId: string,
    interaction: ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: true });
    const item = await Database.getItem(itemId);
    if (!item) return;

    const recipeCost = Item.getItemRecipeCost(level);
    const recipe = {
      itemId,
      profession,
      level,
      ...recipeCost,
    };
    await Database.insertItemRecipe(recipe);
    const embed = Item.createItemEmbed(item);
    embed.addFields({ name: "Receita", value: Utils.getResourcesString(recipe) });
    embed.setTitle(embed.data.title + " (Receita)");
    await interaction.editReply({ embeds: [embed] });
  }
}
