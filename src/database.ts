import crypto from "crypto";
import { Message } from "discord.js";
import { QuickDB } from "quick.db";
import { Channel, ChannelInput, ChannelPartial, channelSchema } from "./schemas/channelSchema";
import {
  CharacterSheetPartial,
  CharacterSheetType,
  CharacterSheetTypeInput,
  characterTypeSchema,
  royalCharacterSchema,
  RoyalCharacterSheet,
  StoreCharacterSheet,
  StoreCharacterSheetInput,
  storeCharacterSheetSchema,
} from "./schemas/characterSheetSchema";
import { Family, FamilyInput, familySchema, FamilyUpdateInput } from "./schemas/familySchema";
import { DatabaseMessage } from "./schemas/messageSchema";
import { UserOptional, userSchema } from "./schemas/userSchema";
import { consumableItemSchema, equipmentItemSchema, Item, ItemRecipe, itemRecipeSchema, otherItemSchema } from "./schemas/itemSchema";
import { DISCORD_AUTOCOMPLETE_LIMIT } from "./data/constants";

const db = new QuickDB();

export default class Database {
  public static async insertMessage(message: Message) {
    const messageToInsert = {
      id: message.id,
      channelId: message.channelId,
      content: message.embeds[0]?.description,
      authorId: message.author.id,
    };
    await db.set(`messages.${message.id}`, messageToInsert);
    return messageToInsert;
  }

  public static async getUser(userId: string) {
    const user = await db.get(`users.${userId}`);
    if (!user) return await this.insertUser(userId);
    return userSchema.parse(user);
  }

  public static async insertUser(userId: string) {
    const userToSet = { money: 0, royalTokens: 0, familyTokens: 0, lastMessageAt: new Date().toISOString() };
    await db.set(`users.${userId}`, userToSet);
    return userToSet;
  }

  public static async updateUser(userId: string, user: UserOptional) {
    const oldUser = await db.get(`users.${userId}`);
    if (!oldUser) return null;
    const updatedUser = { ...oldUser, ...user };
    await db.set(`users.${userId}`, updatedUser);
    return updatedUser;
  }

  public static async getMessage(messageId: string) {
    const message = await db.get<DatabaseMessage>(`messages.${messageId}`);
    if (!message) return null;
    return message;
  }

  public static async insertSheet(userId: string, sheet: CharacterSheetTypeInput) {
    const characterId = crypto.randomBytes(16).toString("hex");
    const sheetToInsert = characterTypeSchema.parse({ ...sheet, characterId, userId });

    await db.set<CharacterSheetType>(`sheets.${userId}.${characterId}`, sheetToInsert);
    return sheetToInsert;
  }

  public static async insertStoreSheet(sheet: StoreCharacterSheetInput) {
    const characterId = crypto.randomBytes(16).toString("hex");
    const sheetToInsert = storeCharacterSheetSchema.parse({
      ...sheet,
      characterId,
      userId: "store",
      profession: "royal",
    });
    await db.set<StoreCharacterSheet>(`store.${characterId}`, sheetToInsert);
    return storeCharacterSheetSchema.parse(sheetToInsert);
  }

  public static async getStoreSheet(characterId: string) {
    const sheet = await db.get<StoreCharacterSheet>(`store.${characterId}`);
    if (!sheet) return null;
    return sheet;
  }

  public static async getStoreSheets() {
    const sheets = await db.get<Record<string, StoreCharacterSheet>>("store");
    if (!sheets) return [];
    return Object.values(sheets);
  }

  public static async deleteStoreSheet(characterId: string) {
    return db.delete(`store.${characterId}`);
  }

  public static async updateStoreSheet(characterId: string, sheet: StoreCharacterSheet) {
    const oldSheet = await db.get<StoreCharacterSheet>(`store.${characterId}`);
    if (!oldSheet) return null;
    const updatedSheet = { ...oldSheet, ...sheet };
    await db.set<StoreCharacterSheet>(`store.${characterId}`, updatedSheet);
    return updatedSheet;
  }

  public static async deleteSheet(userId: string, characterId: string) {
    await db.delete(`sheets.${userId}.${characterId}`);
    return;
  }

  public static async updateSheet(userId: string, characterId: string, sheet: CharacterSheetPartial) {
    const oldSheet = await db.get<CharacterSheetType>(`sheets.${userId}.${characterId}`);
    if (!oldSheet) return null;
    const updatedSheet = { ...oldSheet, ...sheet };
    await db.set<CharacterSheetType>(`sheets.${userId}.${characterId}`, updatedSheet);
    return characterTypeSchema.parse(updatedSheet);
  }

  public static async getActiveSheet(userId: string) {
    const sheets = await db.get<Record<string, CharacterSheetType>>(`sheets.${userId}`);
    if (!sheets) return null;
    const activeSheet = Object.values(sheets).find((sheet) => sheet.isActive);
    if (!activeSheet) return null;
    return characterTypeSchema.parse(activeSheet);
  }

  public static async setActiveSheet(userId: string, characterId: string) {
    await db.set(`sheets.${userId}.${characterId}.isActive`, true);
    const sheets = await this.getSheets(userId);
    await Promise.all(
      sheets.filter((sheet) => sheet.characterId !== characterId).map((sheet) => this.updateSheet(userId, sheet.characterId, { isActive: false })),
    );
    return true;
  }

  public static async getSheet(userId: string, characterId: string) {
    const sheet = await db.get<CharacterSheetType>(`sheets.${userId}.${characterId}`);
    if (!sheet) return null;
    return characterTypeSchema.parse(sheet);
  }

  public static async getSheets(userId: string) {
    const sheets = await db.get<Record<string, CharacterSheetType>>(`sheets.${userId}`);
    if (!sheets) return [];
    return Object.values(sheets).map((sheet) => characterTypeSchema.parse(sheet));
  }

  public static async getUserSheetsByName(userId: string, name: string) {
    const sheets = await db.get<Record<string, CharacterSheetType>>(`sheets.${userId}`);
    if (!sheets) return [];
    return Object.values(sheets)
      .filter((sheet) => sheet.name.toLowerCase().includes(name.toLowerCase()))
      .map((sheet) => characterTypeSchema.parse(sheet))
      .slice(0, DISCORD_AUTOCOMPLETE_LIMIT);
  }

  public static async getSheetsByFamily(familySlug: string) {
    const sheets = await db.get<Record<string, CharacterSheetType>>("sheets");
    if (!sheets) return [];
    return Object.values(sheets).filter((sheet): sheet is RoyalCharacterSheet => {
      const royalSheet = royalCharacterSchema.safeParse(sheet);
      if (royalSheet.success) return royalSheet.data.familySlug === familySlug;
      return false;
    });
  }

  public static async setFamily(slug: string, family: FamilyInput) {
    const familyExists = await db.get<Family>(`families.${slug}`);
    if (familyExists) return null;
    const defaultFamily = familySchema.parse(family);
    await db.set<Family>(`families.${slug}`, defaultFamily);
    return defaultFamily;
  }

  public static async deleteFamily(slug: string) {
    await db.delete(`families.${slug}`);
    return;
  }

  public static async updateFamily(slug: string, family: FamilyUpdateInput) {
    const oldFamily = await db.get<Family>(`families.${slug}`);
    if (!oldFamily) return null;
    const updatedFamily = { ...oldFamily, ...family };
    await db.set<Family>(`families.${slug}`, updatedFamily);
    return updatedFamily;
  }

  public static async getFamily(slug: string) {
    const family = await db.get<Family>(`families.${slug}`);
    if (!family) return null;
    return family;
  }

  public static async getFamilies() {
    const families = await db.get<Record<string, Family>>("families");
    if (!families) return [];
    return Object.values(families)
      .map((family) => familySchema.parse(family))
      .slice(0, DISCORD_AUTOCOMPLETE_LIMIT);
  }

  public static async insertChannel(channel: ChannelInput) {
    const channelExists = await db.get(`channels.${channel.id}`);
    if (channelExists) return null;
    const channelToInsert = channelSchema.parse(channel);
    await db.set(`channels.${channel.id}`, channelToInsert);
    return channelToInsert;
  }

  public static async getChannel(channelId: string) {
    const channel = await db.get<Channel>(`channels.${channelId}`);

    if (!channel) return null;

    return channelSchema.parse(channel);
  }

  public static async updateChannel(channelId: string, channel: ChannelPartial) {
    const oldChannel = await db.get<ChannelInput>(`channels.${channelId}`);
    if (!oldChannel) return null;
    const updatedChannel = { ...oldChannel, ...channel };
    await db.set(`channels.${channelId}`, updatedChannel);
    return updatedChannel;
  }

  public static async deleteChannel(channelId: string) {
    await db.delete(`channels.${channelId}`);
    return;
  }

  public static async insertItem<T extends Omit<Item, "id">>(item: T) {
    const itemToInsert = { ...item, id: crypto.randomBytes(16).toString("hex") };
    await db.set(`items.${itemToInsert.id}`, itemToInsert);
    return equipmentItemSchema.or(consumableItemSchema).or(otherItemSchema).parse(itemToInsert);
  }

  public static async getItem(id: string) {
    const item = await db.get<Item>(`items.${id}`);
    if (!item) return null;
    return equipmentItemSchema.or(consumableItemSchema).or(otherItemSchema).parse(item);
  }

  public static async getItems() {
    const items = await db.get<Record<string, Item>>("items");
    if (!items) return [];
    return Object.values(items).map((item) => equipmentItemSchema.or(consumableItemSchema).or(otherItemSchema).parse(item));
  }

  public static async deleteItem(id: string) {
    await db.delete(`items.${id}`);
    return;
  }

  public static async updateItem(id: string, item: Item) {
    const oldItem = await db.get<Item>(`items.${id}`);
    if (!oldItem) return null;
    const updatedItem = { ...oldItem, ...item };
    await db.set(`items.${id}`, updatedItem);
    return equipmentItemSchema.or(consumableItemSchema).or(otherItemSchema).parse(updatedItem);
  }

  public static async insertItemRecipe(recipe: ItemRecipe) {
    await db.set(`recipes.${recipe.itemId}`, recipe);
    return itemRecipeSchema.parse(recipe);
  }

  public static async getItemRecipe(itemId: string) {
    const recipe = await db.get<ItemRecipe>(`recipes.${itemId}`);
    if (!recipe) return null;
    return itemRecipeSchema.parse(recipe);
  }

  public static async deleteItemRecipe(itemId: string) {
    await db.delete(`recipes.${itemId}`);
    return;
  }
}
