import { dirname, importx } from "@discordx/importer";
import type { Channel as DiscordChannel, Interaction, Message, TextChannel } from "discord.js";
import { Client as DiscordClient, IntentsBitField, Partials } from "discord.js";
import { Client } from "discordx";
import "dotenv/config";
import cron from "node-cron";
import AchievementEmitter, {
  AchievementEvents,
  handleBuyCharacterAchievements,
  handleCharacterCreate,
  handleCharacterLevelUpAchievements,
  handleCharacterMessageAchievements,
} from "./achievements";
import Channel from "./commands/channel";
import { CHANNEL_IDS, CRON_EXPRESSIONS } from "./data/constants";
import { Queue } from "./queue";

export const bot = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildInvites,
  ],
  silent: false,
  simpleCommand: {
    prefix: "!",
  },
  partials: [Partials.Reaction, Partials.Message],
});

bot.once("ready", async (readyClient) => {
  bot.messageQueue = new Queue();
  assignSystemChannels(readyClient);
  //await seedStaticData();
  await bot.initApplicationCommands();
  await registerSchedules(readyClient);
  console.log("Bot started");
});

bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction);
});

bot.on("messageCreate", async (message: Message) => {
  await bot.executeCommand(message);
});

export const achievements = new AchievementEmitter();

achievements.on(AchievementEvents.onBuyCharacter, handleBuyCharacterAchievements);
achievements.on(AchievementEvents.onCharacterLevelUp, handleCharacterLevelUpAchievements);
achievements.on(AchievementEvents.onCharacterMessage, handleCharacterMessageAchievements);
achievements.on(AchievementEvents.onCharacterCreate, handleCharacterCreate);

// async function seedStaticData() {
//   const families = await Utils.fetchBaseFamilies();
//   await Promise.all(families.map((family) => Database.setFamily(family.slug, family)));
// }

function assignSystemChannels(readyClient: DiscordClient<true>) {
  const guild = readyClient.guilds.cache.first();
  console.log(`Found guild: ${guild?.name}`);
  if (!guild) return;
  bot.systemChannels = guild.channels.cache.filter((channel): channel is TextChannel => {
    type PropertyChannelType = (typeof CHANNEL_IDS)[keyof typeof CHANNEL_IDS];
    return Object.values(CHANNEL_IDS).includes(channel.id as PropertyChannelType) && channel.isTextBased();
  });
  bot.systemChannels.forEach((channel) => {
    console.log(`Found system channel: ${channel.name} and assigned to bot.systemChannels successfully.`);
  });
}

async function registerSchedules(readyClient: DiscordClient<true>) {
  const isRoleplayingChannel = (channel: DiscordChannel): channel is TextChannel =>
    !channel.isDMBased() && channel.isTextBased() && !channel.isThread() && Boolean(channel.parent?.name.startsWith("RP |"));

  const roleplayingChannels = readyClient.guilds.cache.first()?.channels.cache.filter(isRoleplayingChannel);
  if (!roleplayingChannels) return;

  cron.schedule(
    CRON_EXPRESSIONS.EveryFourHours,
    async () => {
      for (const [_id, rpChannel] of roleplayingChannels) await Channel.manageChannelPlaceholder(rpChannel);
    },
    { runOnInit: true },
  );
}

async function run() {
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

  if (!process.env.BOT_TOKEN) {
    throw Error("Could not find BOT_TOKEN in your environment");
  }
  await bot.login(process.env.BOT_TOKEN);
}

bot.on("error", console.error);
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
void run();
