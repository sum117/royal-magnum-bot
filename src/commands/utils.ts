import { CommandInteraction } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { COMMANDS, COMMAND_OPTIONS } from "../data/commands";
import { imageGifUrl } from "../schemas/utils";

@Discord()
export default class Utils {
  @Slash(COMMANDS.changePicture)
  public async changePicture(@SlashOption(COMMAND_OPTIONS.changePictureURL) url: string, interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const isImage = imageGifUrl.safeParse(url).success;
    if (!isImage) {
      await interaction.editReply("URL inválida");
      return;
    }
    await interaction.guild?.setIcon(url);
    await interaction.client.user?.setAvatar(url);
    await interaction.editReply("Imagem alterada com sucesso.");
  }
}
