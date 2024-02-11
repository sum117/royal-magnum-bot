import { Collection, TextChannel } from "discord.js";
import { Queue } from "./queue";

declare module "discordx" {
  export interface Client {
    systemChannels: Collection<string, TextChannel>;
    messageQueue: Queue;
  }
}
