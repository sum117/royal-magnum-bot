import { Message, MessageReaction } from "discord.js";
export const isRoleplayingChannel = async ([argument], _client, next) => {
    const isRPChannel = (msg) => {
        return msg.inGuild() && msg.channel.parent?.name.startsWith("RP |");
    };
    if (argument instanceof MessageReaction) {
        const message = await argument.message.fetch().catch(() => null);
        if (!message)
            return;
        if (isRPChannel(message)) {
            await next();
        }
        return;
    }
    if (argument instanceof Message && isRPChannel(argument)) {
        await next();
    }
};
