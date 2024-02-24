import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { DateTime } from "luxon";
import { DISCORD_AUTOCOMPLETE_LIMIT } from "./data/constants";
const prisma = new PrismaClient();
export default class Database {
    static async getUsersWithMessageCount() {
        const users = await prisma.$queryRaw `
      SELECT User.*,
      JSON_LENGTH(User.achievements) as achievementCount,
      JSON_ARRAYAGG(JSON_OBJECT("channelId", Message.channelId, "messageId", Message.id)) as latestMessages,
      COUNT(Message.id) as messageCount
      FROM User
      LEFT JOIN Message ON User.id = Message.authorId
      GROUP BY User.id
      ORDER BY messageCount DESC
      LIMIT 10
    `;
        for (const user of users) {
            user.latestMessages = JSON.parse(user.latestMessages).map((message) => JSON.parse(message));
            user.achievements = JSON.parse(user.achievements);
        }
        return users;
    }
    static async getAllUserStoreSheets(userId) {
        const userWithStoreCharacters = await prisma.user.findUnique({ where: { id: userId }, include: { characters: { where: { type: "store" } } } });
        const npcs = await prisma.nPC.findMany({ where: { users: { some: { id: userId } } } });
        const storeCharacters = new Array();
        if (userWithStoreCharacters)
            storeCharacters.push(...userWithStoreCharacters.characters);
        if (npcs)
            storeCharacters.push(...npcs);
        return storeCharacters;
    }
    static async insertMessage(message) {
        const insertedMessage = await prisma.message.create({
            data: {
                id: message.id,
                authorId: message.author.id,
                channelId: message.channel.id,
            },
        });
        return insertedMessage;
    }
    static async getUser(userId) {
        try {
            const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
            return user;
        }
        catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
                const createdUser = await prisma.user.create({ data: { id: userId, achievements: [], lastMessageAt: DateTime.now().toJSDate() } }).catch(() => null);
                return createdUser;
            }
        }
    }
    static async assignAchievement(achievement, userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return false;
        if (!Array.isArray(user?.achievements))
            user.achievements = [];
        if (user.achievements.includes(achievement.id))
            return false;
        user.achievements = user.achievements ? [...user.achievements, achievement.id] : [achievement.id];
        await prisma.user.update({ where: { id: userId }, data: { achievements: user.achievements } });
        return true;
    }
    static async insertUser(userId, data = { id: userId, achievements: [], lastMessageAt: DateTime.now().toJSDate() }) {
        const user = await prisma.user.create({ data });
        return user;
    }
    static async updateUser(userId, user) {
        const updatedUser = await prisma.user.update({ where: { id: userId }, data: user });
        return updatedUser;
    }
    static async getMessage(messageId) {
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        return message;
    }
    static async getAllUserMessages(userId) {
        const messages = await prisma.message.findMany({ where: { authorId: userId } });
        return messages;
    }
    static async insertSheet(userId, sheet) {
        const createdSheet = await prisma.character.create({
            data: {
                appearance: sheet.appearance,
                backstory: sheet.backstory,
                gender: sheet.gender,
                imageUrl: sheet.imageUrl,
                name: sheet.name,
                familySlug: sheet.familySlug,
                isActive: sheet.isActive,
                level: sheet.level,
                origin: sheet.origin,
                isApproved: sheet.isApproved,
                price: sheet.price,
                profession: sheet.profession,
                royalTitle: sheet.royalTitle,
                transformation: sheet.transformation,
                type: sheet.type,
                xp: sheet.xp,
                user: { connectOrCreate: { create: { id: userId, achievements: [] }, where: { id: userId } } },
            },
        });
        return createdSheet;
    }
    static async insertStoreSheet(sheet) {
        const createdSheet = await prisma.character.create({
            data: {
                ...sheet,
            },
        });
        return createdSheet;
    }
    static async getStoreSheet(characterId) {
        const storeSheet = await prisma.character.findUnique({ where: { id: characterId, type: "store" } });
        return storeSheet;
    }
    static async getStoreSheets() {
        const storeSheets = await prisma.character.findMany({ where: { type: "store" } });
        return storeSheets;
    }
    static async deleteStoreSheet(characterId) {
        await prisma.character.delete({ where: { id: characterId } });
        return;
    }
    static async updateStoreSheet(characterId, sheet) {
        const updatedSheet = await prisma.character.update({ where: { id: characterId }, data: sheet });
        return updatedSheet;
    }
    static async deleteSheet(userId, characterId) {
        await prisma.character.delete({ where: { id: characterId, userId } });
        return;
    }
    static async updateSheet(userId, characterId, sheet) {
        return await prisma.character.update({ where: { id: characterId, userId }, data: sheet });
    }
    static async getActiveSheet(userId) {
        const sheet = await prisma.character.findFirst({ where: { userId, isActive: true } });
        return sheet;
    }
    static async setActiveSheet(userId, characterId) {
        await prisma.character.updateMany({ where: { userId }, data: { isActive: false } });
        return await prisma.character.update({ where: { id: characterId, userId }, data: { isActive: true } });
    }
    static async getSheet(userId, characterId) {
        return await prisma.character.findUnique({ where: { id: characterId, userId } });
    }
    static async getSheets(userId) {
        return await prisma.character.findMany({ where: { userId } });
    }
    static async getUserSheetsByName(userId, name) {
        return await prisma.character.findMany({ where: { userId, name: { contains: name.toLowerCase() } }, take: DISCORD_AUTOCOMPLETE_LIMIT });
    }
    static async getSheetsByFamily(familySlug) {
        return await prisma.character.findMany({ where: { familySlug }, take: DISCORD_AUTOCOMPLETE_LIMIT });
    }
    static async setFamily(slug, family) {
        return await prisma.family.upsert({ where: { slug }, create: family, update: family });
    }
    static async deleteFamily(slug) {
        await prisma.family.delete({ where: { slug } });
        return;
    }
    static async updateFamily(slug, family) {
        return await prisma.family.update({ where: { slug }, data: family });
    }
    static async getFamily(slug) {
        return await prisma.family.findUnique({ where: { slug } });
    }
    static async getFamilies() {
        return await prisma.family.findMany({ take: DISCORD_AUTOCOMPLETE_LIMIT });
    }
    static async insertChannel(channel) {
        const insertedChannel = await prisma.channel.create({ data: channel });
        return insertedChannel;
    }
    static async getChannel(channelId) {
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        return channel;
    }
    static async updateChannel(channelId, channel) {
        const updatedChannel = await prisma.channel.update({ where: { id: channelId }, data: channel });
        return updatedChannel;
    }
    static async deleteChannel(channelId) {
        await prisma.channel.delete({ where: { id: channelId } });
        return;
    }
    // TODO: Implement this later in prisma
    // public static async insertItem<T extends Omit<Item, "id">>(item: T) {
    //   const itemToInsert = { ...item, id: crypto.randomBytes(16).toString("hex") };
    //   await db.set(`items.${itemToInsert.id}`, itemToInsert);
    //   return equipmentItemSchema.or(consumableItemSchema).or(otherItemSchema).parse(itemToInsert);
    // }
    // public static async getItem(id: string) {
    //   const item = await db.get<Item>(`items.${id}`);
    //   if (!item) return null;
    //   return equipmentItemSchema.or(consumableItemSchema).or(otherItemSchema).parse(item);
    // }
    // public static async getItems() {
    //   const items = await db.get<Record<string, Item>>("items");
    //   if (!items) return [];
    //   return Object.values(items).map((item) => equipmentItemSchema.or(consumableItemSchema).or(otherItemSchema).parse(item));
    // }
    // public static async deleteItem(id: string) {
    //   await db.delete(`items.${id}`);
    //   return;
    // }
    // public static async updateItem(id: string, item: Item) {
    //   const oldItem = await db.get<Item>(`items.${id}`);
    //   if (!oldItem) return null;
    //   const updatedItem = { ...oldItem, ...item };
    //   await db.set(`items.${id}`, updatedItem);
    //   return equipmentItemSchema.or(consumableItemSchema).or(otherItemSchema).parse(updatedItem);
    // }
    // public static async insertItemRecipe(recipe: ItemRecipe) {
    //   await db.set(`recipes.${recipe.itemId}`, recipe);
    //   return itemRecipeSchema.parse(recipe);
    // }
    // public static async getItemRecipe(itemId: string) {
    //   const recipe = await db.get<ItemRecipe>(`recipes.${itemId}`);
    //   if (!recipe) return null;
    //   return itemRecipeSchema.parse(recipe);
    // }
    // public static async deleteItemRecipe(itemId: string) {
    //   await db.delete(`recipes.${itemId}`);
    //   return;
    // }
    static async getNPCs(userId) {
        return await prisma.nPC.findMany({ where: { users: userId ? { some: { id: userId } } : undefined }, include: { users: true } });
    }
    static async insertNPC(npc) {
        const createdNPC = await prisma.nPC.create({ data: npc });
        return createdNPC;
    }
    static async getNPC(id) {
        return await prisma.nPC.findUnique({ where: { id }, include: { users: true } });
    }
    static async updateNPC(id, npc) {
        return await prisma.nPC.update({ where: { id }, data: npc });
    }
    static async deleteNPC(id) {
        await prisma.nPC.delete({ where: { id } });
        return;
    }
}
// export function seed() {
//   try {
//     // Object.values(sheets).forEach(async (user) => {
//     //   Object.values(user).forEach(async (sheet) => {
//     //     await Database.insertSheet(sheet.userId, {
//     //       name: sheet.name,
//     //       appearance: sheet.appearance,
//     //       backstory: sheet.backstory,
//     //       gender: sheet.gender,
//     //       imageUrl: sheet.imageUrl,
//     //       familySlug: "familySlug" in sheet && typeof sheet.familySlug === "string" ? sheet.familySlug : undefined,
//     //       isActive: sheet.isActive,
//     //       level: sheet.level,
//     //       origin: sheet.origin.replace("-", "_") as Origin,
//     //       isApproved: sheet.isApproved,
//     //       price: "price" in sheet && typeof sheet.price === "number" ? sheet.price : undefined,
//     //       profession: sheet.profession as Profession,
//     //       royalTitle: "royalTitle" in sheet && typeof sheet.royalTitle === "string" ? sheet.royalTitle : undefined,
//     //       type: "type" in sheet && typeof sheet.type === "string" ? (sheet.type as CharacterType) : undefined,
//     //       transformation: "transformation" in sheet && typeof sheet.transformation === "string" ? sheet.transformation : undefined,
//     //       userId: sheet.userId,
//     //       xp: sheet.xp,
//     //     });
//     //   });
//     // });
// Object.entries(users).forEach(async ([userId, user]) => {
//   await Database.insertUser(userId, {
//     id: userId,
//     achievements: "achievements" in user && Array.isArray(user.achievements) ? (user.achievements as never[]) : [],
//     doesNotUseEmbeds: "doesNotUseEmbeds" in user && typeof user.doesNotUseEmbeds === "boolean" ? user.doesNotUseEmbeds : false,
//     familyTokens: "familyTokens" in user && typeof user.familyTokens === "number" ? user.familyTokens : 0,
//     lastMessageAt: "lastMessageAt" in user && typeof user.lastMessageAt === "string" ? new Date(user.lastMessageAt) : new Date(),
//     money: "money" in user && typeof user.money === "number" ? user.money : 0,
//     royalTokens: "royalTokens" in user && typeof user.royalTokens === "number" ? user.royalTokens : 0,
//   });
// });
// Object.values(channels).forEach(async (channel) => {
//   await Database.insertChannel({
//     id: channel.id,
//     name: channel.name,
//     description: channel.description,
//     efficiency: channel.efficiency,
//     imageUrl: channel.image,
//     channelType: channel.type as ChannelType,
//     lastActive: new Date(),
//     level: channel.level,
//     placeholderMessageId: channel.placeholderMessageId,
//     resourceType: channel.resourceType as ResourceType,
//   });
// });
// Object.values(families).forEach(async (family) => {
//   await Database.setFamily(family.slug, {
//     title: family.title,
//     description: family.description,
//     imageUrl: family.image,
//     slug: family.slug,
//     entity: family.entity,
//     isApproved: family.isApproved,
//     food: family.food,
//     gold: family.gold,
//     iron: family.iron,
//     origin: family.origin.replace("-", "_") as Origin,
//     population: family.population,
//     populationCap: family.populationCap,
//     populationGrowth: family.populationGrowth,
//     stone: family.stone,
//     wood: family.wood,
//   });
// });
// Object.values(npcs).forEach(async (npc) => {
//   await Database.insertNPC({
//     description: npc.description,
//     imageUrl: npc.image,
//     name: npc.name,
//     title: npc.title,
//     price: npc.price,
//     users: {
//       connect: npc.usersWithAccess.map((userId: string) => ({ id: userId })).filter(Boolean),
//     },
//   });
// });
//   } catch (error) {
//     console.error(error);
//   }
// }
