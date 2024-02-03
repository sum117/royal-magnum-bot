import { Collection, TextChannel } from "discord.js";

declare module "discordx" {
  export interface Client {
    systemChannels: Collection<string, TextChannel>;
    timeOuts: Map<string, NodeJS.Timeout>;
  }
}
