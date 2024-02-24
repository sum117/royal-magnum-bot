import { ChannelType } from "discord.js";
import { EventEmitter } from "events";
import lodash from "lodash";
import { CHANNEL_IDS } from "./data/constants";
import Database from "./database";
import { bot } from "./main";
import { storeCharacterSheetSchema } from "./schemas/characterSheetSchema";
import Utils from "./utils";
export var AchievementEvents;
(function (AchievementEvents) {
    AchievementEvents["onCharacterMessage"] = "onCharacterMessage";
    AchievementEvents["onCharacterLevelUp"] = "onCharacterLevelUp";
    AchievementEvents["onCharacterCreate"] = "onCharacterCreate";
    AchievementEvents["onBuyCharacter"] = "onBuyCharacter";
    AchievementEvents["onAny"] = "onAny";
})(AchievementEvents || (AchievementEvents = {}));
export class Achievement {
    title;
    description;
    condition;
    constructor(title, description, condition) {
        this.title = title;
        this.description = description;
        this.condition = condition;
    }
    get id() {
        return lodash.kebabCase(this.title);
    }
    check() {
        return this.condition?.() ?? true;
    }
}
export default class AchievementEmitter extends EventEmitter {
    constructor() {
        super();
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    on(event, listener) {
        super.emit(AchievementEvents.onAny, listener);
        return super.on(event, listener);
    }
}
export async function handleBuyCharacterAchievements(args) {
    const userStoreCharacters = await Database.getAllUserStoreSheets(args.user.id);
    const buyCharacterAchievements = [
        new Achievement("Primeira Compra", "Você comprou seu primeiro personagem!", () => userStoreCharacters.length === 1),
        new Achievement("Aspirante", "Você comprou 5 personagens!", () => userStoreCharacters.length === 5),
        new Achievement("Colecionador", "Você comprou 10 personagens!", () => userStoreCharacters.length === 10),
    ];
    await handleAchievements(buyCharacterAchievements, args.user);
}
export async function handleCharacterLevelUpAchievements(args) {
    const characterLevelUpAchievements = [
        new Achievement("Primeiro Nível", `Seu personagem ${args.character.name} subiu de nível pela primeira vez!`, () => args.character.level === 2),
        new Achievement("Nível 25", `Seu personagem ${args.character.name} atingiu o nível 25!`, () => args.character.level === 25),
        new Achievement("Nível 50", `Seu personagem ${args.character.name} atingiu o nível 50!`, () => args.character.level === 50),
        new Achievement("Nível 75", `Seu personagem ${args.character.name} atingiu o nível 75!`, () => args.character.level === 75),
        new Achievement("Nível 100", `Seu personagem ${args.character.name} atingiu o último nível!`, () => args.character.level === 100),
    ];
    await handleAchievements(characterLevelUpAchievements, args.user);
}
export async function handleCharacterCreate(args) {
    const userSheets = (await Database.getSheets(args.user.id)).filter((sheet) => !storeCharacterSheetSchema.safeParse(sheet).success);
    const characterCreateAchievements = [
        new Achievement("Primeiro Personagem", "Você criou seu primeiro personagem!", () => userSheets.length === 1),
        new Achievement("Aventureiro", "Você criou 5 personagens!", () => userSheets.length === 5),
        new Achievement("Explorador", "Você criou 10 personagens!", () => userSheets.length === 10),
    ];
    await handleAchievements(characterCreateAchievements, args.user);
}
export async function handleCharacterMessageAchievements(args) {
    const userMessages = await Database.getAllUserMessages(args.user.id);
    const userActiveSheet = await Database.getActiveSheet(args.user.id);
    const origins = await Utils.fetchOrigins();
    const originData = origins.find((origin) => origin.id === userActiveSheet?.origin);
    const hasSaid = (word) => {
        const content = args.embedMessage.embeds[0]?.description ?? args.embedMessage.content;
        return Boolean(content.includes(word));
    };
    const messageAchievements = [
        new Achievement("Primeira Mensagem", "Você enviou sua primeira mensagem!", () => userMessages.length === 1),
        new Achievement("Mensageiro", "Você enviou 100 mensagens!", () => userMessages.length === 100),
        new Achievement("Comunicador", "Você enviou 500 mensagens com!", () => userMessages.length === 500),
        new Achievement("Eu Não Tenho Medo Dele", "Você mencionou o nome proibido...", () => hasSaid("Marjorie")),
        new Achievement("Mommy. Please. Mommy. Please.", "Algumas pessoas não conseguem resistir a um polvo bonito.", () => hasSaid("Ada")),
        new Achievement("Aqui Não É O Lugar", "Tire esse nome da sua boca!", () => hasSaid("Lilith")),
        new Achievement("Masoria", "Essa história já acabou. Não fale mais sobre isso.", () => hasSaid("Masoria")),
    ];
    if (originData && args.embedMessage.inGuild() && args.embedMessage.channel.parent?.type === ChannelType.GuildCategory) {
        const originChannel = bot.channels.cache.get(originData.channelId);
        const isSameCategory = args.embedMessage.channel.parent?.id === originChannel?.parent?.id;
        messageAchievements.push(new Achievement("Intruso", `Você está em um local desconhecido, longe de casa, pela primeira vez!`, () => !isSameCategory), new Achievement("Em Casa", `Tudo aqui é familiar, você está em casa!`, () => isSameCategory));
    }
    await handleAchievements(messageAchievements, args.user, args.embedMessage);
}
export async function handleAchievements(achievements, user, embedMessage = null) {
    for (const achievement of achievements) {
        if (!achievement.check())
            continue;
        if (await Database.assignAchievement(achievement, user.id)) {
            const achievementMessage = `🎉 ${user.toString()} desbloqueou a conquista ${achievement.title}!\n\n> ${achievement.description}`;
            await sendAchievementMessage(embedMessage, achievementMessage);
        }
    }
}
export async function sendAchievementMessage(embedMessage = null, content) {
    if (embedMessage) {
        await embedMessage.channel.send({ content });
    }
    await bot.systemChannels.get(CHANNEL_IDS.achievementsChannel)?.send({ content });
}
