var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Discord, On, Once } from "discordx";
import lodash from "lodash";
import { CHANNEL_IDS, ROLE_IDS } from "../data/constants";
import { bot } from "../main";
let InviteEvents = class InviteEvents {
    guildInvites;
    constructor() {
        this.guildInvites = new Map();
    }
    async fetchInvites([client]) {
        const guild = client.guilds.cache.first();
        if (!guild)
            return;
        const invites = await guild.invites.fetch({ cache: true });
        invites.each((invite) => this.guildInvites.set(invite.code, { uses: invite.uses ?? 0, maxUses: invite.maxUses ?? null }));
    }
    async inviteCreate([invite]) {
        this.guildInvites.set(invite.code, { uses: invite.uses ?? 0, maxUses: invite.maxUses ?? null });
        const logChannel = bot.systemChannels.get(CHANNEL_IDS.logChannel);
        if (invite.maxUses && invite.maxUses <= 1) {
            await invite.delete();
            await logChannel?.send(`${invite.inviter?.toString()}, você não pode criar um convite de uso único neste servidor. Fizemos isso para impedir raids.`);
            return;
        }
        if (!invite.inviter)
            return;
        await logChannel?.send(`${invite.inviter.toString()} criou um convite de código \`${invite.code}\``);
    }
    async inviteDelete([invite]) {
        this.guildInvites.delete(invite.code);
    }
    async guildMemberAdd([member]) {
        const invites = await member.guild.invites.fetch();
        const invite = invites.find((guildInvite) => {
            const cachedInvite = this.guildInvites.get(guildInvite.code);
            if (!cachedInvite || typeof cachedInvite.uses !== "number" || !guildInvite.uses)
                return false;
            return cachedInvite.uses < guildInvite.uses;
        });
        const logChannel = member.guild.channels.cache.get(CHANNEL_IDS.logChannel);
        if (!logChannel || !logChannel.isTextBased())
            return;
        if (!invite) {
            await logChannel.send(`${member.user.toString()} entrou no servidor, mas não foi possível encontrar o convite usado (PROVAVELMENTE FOI O VANITY).`);
            return;
        }
        this.guildInvites.set(invite.code, { uses: invite.uses ?? 0, maxUses: invite.maxUses ?? null });
        await logChannel.send(`${member.user.toString()} entrou no servidor usando o convite de ${invite.inviter?.toString()} com o código \`${invite.code}\``);
        if (!invite.inviter)
            return;
        await invite.inviter
            .send(`${member.user.toString()} entrou no servidor usando o seu convite com o código \`${invite.code}\``)
            .catch((error) => console.error("Failed to send inviter message", error));
    }
    async onMentorRequest([_oldMember, newMember]) {
        await newMember.fetch(true);
        await newMember.guild.roles.fetch(undefined, { cache: true, force: true });
        await newMember.guild.members.fetch();
        if (!newMember.roles.cache.has(ROLE_IDS.pupil) || _oldMember.roles.cache.has(ROLE_IDS.pupil))
            return;
        const mentorRole = newMember.guild.roles.cache.get(ROLE_IDS.mentor);
        const adminRole = newMember.guild.roles.cache.get(ROLE_IDS.admin);
        if (!mentorRole || !adminRole)
            return;
        const mentors = mentorRole.members.filter((member) => !member.roles.cache.has(ROLE_IDS.pupil));
        const admins = adminRole.members.filter((member) => !member.roles.cache.has(ROLE_IDS.pupil));
        const possibleMentors = new Set([...mentors.values(), ...admins.values()]);
        const randomMentor = lodash.sample(Array.from(possibleMentors));
        if (!randomMentor)
            return;
        const mentorChannel = newMember.guild.channels.cache.get(CHANNEL_IDS.questionsChannel);
        if (!mentorChannel || !mentorChannel.isTextBased())
            return;
        await mentorChannel.send(`${randomMentor.toString()}, ${newMember.user.toString()} pediu um mentor e você foi atribuído a ele(a)!\n\nAtenção, ${newMember.user.toString()}, o seu mentor pode demorar um pouco para te responder, então tenha paciência!`);
    }
};
__decorate([
    Once({ event: "ready" })
], InviteEvents.prototype, "fetchInvites", null);
__decorate([
    On({ event: "inviteCreate" })
], InviteEvents.prototype, "inviteCreate", null);
__decorate([
    On({ event: "inviteDelete" })
], InviteEvents.prototype, "inviteDelete", null);
__decorate([
    On({ event: "guildMemberAdd" })
], InviteEvents.prototype, "guildMemberAdd", null);
__decorate([
    On({ event: "guildMemberUpdate" })
], InviteEvents.prototype, "onMentorRequest", null);
InviteEvents = __decorate([
    Discord()
], InviteEvents);
export default InviteEvents;
