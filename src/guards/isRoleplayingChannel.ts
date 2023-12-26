import { Message, MessageReaction } from "discord.js";
import { ArgsOf, GuardFunction } from "discordx";

export const isRoleplayingChannel: GuardFunction<ArgsOf<"messageCreate" | "messageReactionAdd">> = async ([argument], _client, next) => {
  const isRPChannel = (msg: Message) => {
    return msg.inGuild() && msg.channel.parent?.name.startsWith("RP |");
  };

  if (argument instanceof MessageReaction) {
    const message = await argument.message.fetch();
    if (isRPChannel(message)) {
      await next();
    }
    return;
  }

  if (argument instanceof Message && isRPChannel(argument)) {
    await next();
  }
};
