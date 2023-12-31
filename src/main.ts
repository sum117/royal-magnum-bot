import { dirname, importx } from "@discordx/importer";
import type { Channel as DiscordChannel, Interaction, Message, TextChannel } from "discord.js";
import { Client as DiscordClient, IntentsBitField, Partials } from "discord.js";
import { Client } from "discordx";
import "dotenv/config";
import cron from "node-cron";
import Channel from "./commands/channel";
import { CRON_EXPRESSIONS } from "./data/constants";

export const bot = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent
  ],
  silent: false,
  simpleCommand: {
    prefix: "!"
  },
  partials: [Partials.Reaction, Partials.Message]
});

bot.once("ready", async (readyClient) => {
  await bot.initApplicationCommands();
  console.log("Bot started");
  await registerSchedules(readyClient);
});

bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction);
});

bot.on("messageCreate", async (message: Message) => {
  await bot.executeCommand(message);
});

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
    { runOnInit: true }
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
