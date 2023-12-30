import crypto from "crypto";
import { Message } from "discord.js";
import { QuickDB } from "quick.db";
import {
  CharacterSheetPartial,
  CharacterSheetType,
  CharacterSheetTypeInput,
  StoreCharacterSheet,
  StoreCharacterSheetInput,
  characterTypeSchema,
  storeCharacterSheetSchema,
} from "./schemas/characterSheetSchema";
import { Family, familySchema } from "./schemas/familySchema";
import { DatabaseMessage } from "./schemas/messageSchema";
import { userSchema } from "./schemas/userSchema";

const db = new QuickDB();

export default class Database {
  private static PAGINATION_LIMIT = 10;
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
    const userToSet = { money: 0, royalTokens: 0 };
    await db.set(`users.${userId}`, userToSet);
    return userToSet;
  }

  public static async updateUser(userId: string, user: { money: number }) {
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
    const sheetToInsert = characterTypeSchema.parse({ ...sheet, characterId, isApproved: false, userId, isActive: false });

    await db.set<CharacterSheetType>(`sheets.${userId}.${characterId}`, sheetToInsert);
    return sheetToInsert;
  }

  public static async insertStoreSheet(sheet: StoreCharacterSheetInput) {
    const characterId = crypto.randomBytes(16).toString("hex");
    const sheetToInsert = {
      ...sheet,
      characterId,
      isApproved: false,
      isActive: false,
      userId: "store",
    };
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

  public static deleteSheet(userId: string, characterId: string) {
    return db.delete(`sheets.${userId}.${characterId}`);
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
      .slice(0, this.PAGINATION_LIMIT);
  }

  public static async setFamily(slug: string, family: Family) {
    await db.set<Family>(`families.${slug}`, family);
    return family;
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
      .slice(0, this.PAGINATION_LIMIT);
  }
}
