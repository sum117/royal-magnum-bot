import { ArgsOf, Discord, On, Once } from "discordx";
import lodash from "lodash";
import { CHANNEL_IDS, ROLE_IDS } from "../data/constants";
import { bot } from "../main";

const guildInvites = new Map<string, { uses: number; maxUses: number | null }>();
@Discord()
export default class InviteEvents {
  @Once({ event: "ready" })
  async fetchInvites([client]: ArgsOf<"ready">) {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const invites = await guild.invites.fetch({ cache: true });
    invites.each((invite) => guildInvites.set(invite.code, { uses: invite.uses ?? 0, maxUses: invite.maxUses ?? null }));
  }

  @On({ event: "inviteCreate" })
  async inviteCreate([invite]: ArgsOf<"inviteCreate">) {
    guildInvites.set(invite.code, { uses: invite.uses ?? 0, maxUses: invite.maxUses ?? null });
    const logChannel = bot.systemChannels.get(CHANNEL_IDS.logChannel);

    if (invite.maxUses && invite.maxUses <= 1) {
      await invite.delete();
      await logChannel?.send(`${invite.inviter?.toString()}, você não pode criar um convite de uso único neste servidor. Fizemos isso para impedir raids.`);
      return;
    }

    if (!invite.inviter) return;

    await logChannel?.send(`${invite.inviter.toString()} criou um convite de código \`${invite.code}\``);
  }

  @On({ event: "inviteDelete" })
  async inviteDelete([invite]: ArgsOf<"inviteDelete">) {
    guildInvites.delete(invite.code);
  }

  @On({ event: "guildMemberAdd" })
  async guildMemberAdd([member]: ArgsOf<"guildMemberAdd">) {
    const invites = await member.guild.invites.fetch();
    const invite = invites.find((guildInvite) => {
      const cachedInvite = guildInvites.get(guildInvite.code);
      if (!cachedInvite || typeof cachedInvite.uses !== "number" || !guildInvite.uses) return false;
      return cachedInvite.uses < guildInvite.uses;
    });
    if (!invite) return;

    const logChannel = member.guild.channels.cache.get(CHANNEL_IDS.logChannel);
    if (!logChannel || !logChannel.isTextBased()) return;

    guildInvites.set(invite.code, { uses: invite.uses ?? 0, maxUses: invite.maxUses ?? null });

    await logChannel.send(`${member.user.toString()} entrou no servidor usando o convite de ${invite.inviter?.toString()} com o código \`${invite.code}\``);

    if (!invite.inviter) return;

    await invite.inviter
      .send(`${member.user.toString()} entrou no servidor usando o seu convite com o código \`${invite.code}\``)
      .catch((error) => console.error("Failed to send inviter message", error));
  }

  @On({ event: "guildMemberUpdate" })
  async onMentorRequest([_oldMember, newMember]: ArgsOf<"guildMemberUpdate">) {
    await newMember.fetch(true);
    await newMember.guild.roles.fetch(undefined, { cache: true, force: true });
    await newMember.guild.members.fetch();
    if (!newMember.roles.cache.has(ROLE_IDS.pupil) || _oldMember.roles.cache.has(ROLE_IDS.pupil)) return;

    const mentorRole = newMember.guild.roles.cache.get(ROLE_IDS.mentor);
    const adminRole = newMember.guild.roles.cache.get(ROLE_IDS.admin);
    if (!mentorRole || !adminRole) return;

    const mentors = mentorRole.members.filter((member) => !member.roles.cache.has(ROLE_IDS.pupil));
    const admins = adminRole.members.filter((member) => !member.roles.cache.has(ROLE_IDS.pupil));
    const possibleMentors = new Set([...mentors.values(), ...admins.values()]);

    const randomMentor = lodash.sample(Array.from(possibleMentors));
    if (!randomMentor) return;

    const mentorChannel = newMember.guild.channels.cache.get(CHANNEL_IDS.questionsChannel);
    if (!mentorChannel || !mentorChannel.isTextBased()) return;

    await mentorChannel.send(
      `${randomMentor.toString()}, ${newMember.user.toString()} pediu um mentor e você foi atribuído a ele(a)!\n\nAtenção, ${newMember.user.toString()}, o seu mentor pode demorar um pouco para te responder, então tenha paciência!`,
    );
  }
}
