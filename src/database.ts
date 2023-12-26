import crypto from "crypto";
import { Message } from "discord.js";
import { QuickDB } from "quick.db";
import { CharacterSheet, CharacterSheetInput, CharacterSheetPartial, characterSheetSchema } from "./schemas/characterSheetSchema";
import { Family } from "./schemas/familySchema";
import { DatabaseMessage } from "./schemas/messageSchema";

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

  public static async getMessage(messageId: string) {
    const message = await db.get<DatabaseMessage>(`messages.${messageId}`);
    if (!message) return null;
    return message;
  }

  public static async insertSheet(userId: string, sheet: CharacterSheetInput) {
    const characterId = crypto.randomBytes(16).toString("hex");
    await db.set<CharacterSheet>(`sheets.${userId}.${characterId}`, { ...sheet, characterId, isApproved: false, userId, isActive: false });
    return characterSheetSchema.parse({ ...sheet, characterId, isApproved: false, userId, isActive: false });
  }

  public static deleteSheet(userId: string, characterId: string) {
    return db.delete(`sheets.${userId}.$${characterId}`);
  }

  public static async updateSheet(userId: string, characterId: string, sheet: CharacterSheetPartial) {
    const oldSheet = await db.get<CharacterSheet>(`sheets.${userId}.${characterId}`);
    if (!oldSheet) return null;
    const updatedSheet = { ...oldSheet, ...sheet };
    await db.set<CharacterSheet>(`sheets.${userId}.${characterId}`, updatedSheet);
    return characterSheetSchema.parse(updatedSheet);
  }

  public static async getActiveSheet(userId: string) {
    const sheets = await db.get<Record<string, CharacterSheet>>(`sheets.${userId}`);
    if (!sheets) return null;
    const activeSheet = Object.values(sheets).find((sheet) => sheet.isActive);
    if (!activeSheet) return null;
    return characterSheetSchema.parse(activeSheet);
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
    const sheet = await db.get<CharacterSheet>(`sheets.${userId}.${characterId}`);
    if (!sheet) return null;
    return characterSheetSchema.parse(sheet);
  }

  public static async getSheets(userId: string) {
    const sheets = await db.get<Record<string, CharacterSheet>>(`sheets.${userId}`);
    if (!sheets) return [];
    return Object.values(sheets).map((sheet) => characterSheetSchema.parse(sheet));
  }

  public static async getUserSheetsByName(userId: string, name: string) {
    const sheets = await db.get<Record<string, CharacterSheet>>(`sheets.${userId}`);
    if (!sheets) return [];
    return Object.values(sheets)
      .filter((sheet) => sheet.name.toLowerCase().includes(name.toLowerCase()))
      .map((sheet) => characterSheetSchema.parse(sheet))
      .slice(0, 10);
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

  public static getFamilies() {
    return Object.values(db.get<Record<string, Family>>("families") ?? {});
  }
}
