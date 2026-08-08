import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CategoryChannel,
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    Collection,
    EmbedBuilder,
    Guild,
    GuildMember,
    Message,
    ModalSubmitInteraction,
    OverwriteType,
    PermissionFlagsBits,
    PermissionsBitField,
    Role,
    SelectMenuInteraction,
    Snowflake,
    TextChannel,
    User
} from "discord.js";

import fs from "fs";
import path from "path";
import crypto from "crypto";
import EventEmitter from "events";

export interface Ticket {

    id: string;

    guildId: string;

    channelId: string;

    creatorId: string;

    claimedBy?: string;

    categoryId: string;

    panelId: string;

    optionId: string;

    status:
        | "OPEN"
        | "CLOSED"
        | "LOCKED"
        | "DELETED";

    priority:
        | "LOW"
        | "NORMAL"
        | "HIGH"
        | "URGENT";

    topic: string;

    reason: string;

    participants: string[];

    tags: string[];

    createdAt: number;

    updatedAt: number;

    closedAt?: number;

    deletedAt?: number;

    transcript?: string;

}

export interface TicketCreateOptions {

    guild: Guild;

    creator: User;

    category: CategoryChannel;

    topic: string;

    reason: string;

    panelId: string;

    optionId: string;

    priority?: string;

}

export class TicketManager extends EventEmitter {

    public readonly client: Client;

    private readonly cache =
        new Collection<string, Ticket>();

    private readonly blacklist =
        new Set<string>();

    private readonly opening =
        new Set<string>();

    private readonly statistics = {

        created: 0,

        closed: 0,

        deleted: 0,

        reopened: 0,

        claimed: 0,

        transferred: 0,

        renamed: 0,

        pinned: 0

    };

    constructor(client: Client) {

        super();

        this.client = client;

        this.initialize();

    }

    private initialize() {

        this.loadCache();

        this.loadBlacklist();

        this.registerEvents();

        this.startBackgroundTasks();

    }

    private loadCache() {

        this.cache.clear();

    }

    private loadBlacklist() {

        this.blacklist.clear();

    }

    private registerEvents() {

        this.client.on(
            "channelDelete",
            async channel => {

                if (
                    channel.type !==
                    ChannelType.GuildText
                )
                    return;

                const ticket =
                    this.findByChannel(
                        channel.id
                    );

                if (!ticket)
                    return;

                ticket.status =
                    "DELETED";

                ticket.deletedAt =
                    Date.now();

                this.statistics.deleted++;

                this.emit(
                    "ticketDeleted",
                    ticket
                );

            }
        );

    }

    private startBackgroundTasks() {

        setInterval(() => {

            this.cleanup();

        }, 60000);

    }

    public async createTicket(
        options: TicketCreateOptions
    ): Promise<Ticket> {

        if (
            this.opening.has(
                options.creator.id
            )
        ) {

            throw new Error(
                "Ticket creation already in progress."
            );

        }

        this.opening.add(
            options.creator.id
        );

        try {

            const existing =
                this.findOpenTicket(
                    options.guild.id,
                    options.creator.id
                );

            if (existing) {

                throw new Error(
                    "User already has an open ticket."
                );

            }

            const id =
                crypto.randomUUID();

            const channel =
                await options.guild.channels.create({

                    name:
                        `ticket-${options.creator.username}`,

                    type:
                        ChannelType.GuildText,

                    parent:
                        options.category.id,

                    permissionOverwrites: [

                        {

                            id:
                                options.guild.roles.everyone.id,

                            deny: [

                                PermissionFlagsBits.ViewChannel

                            ]

                        },

                        {

                            id:
                                options.creator.id,

                            allow: [

                                PermissionFlagsBits.ViewChannel,

                                PermissionFlagsBits.SendMessages,

                                PermissionFlagsBits.AttachFiles,

                                PermissionFlagsBits.ReadMessageHistory

                            ]

                        }

                    ]

                });

            const ticket: Ticket = {

                id,

                guildId:
                    options.guild.id,

                channelId:
                    channel.id,

                creatorId:
                    options.creator.id,

                categoryId:
                    options.category.id,

                panelId:
                    options.panelId,

                optionId:
                    options.optionId,

                priority:
                    (options.priority ??
                        "NORMAL") as any,

                topic:
                    options.topic,

                reason:
                    options.reason,

                participants: [

                    options.creator.id

                ],

                tags: [],

                status:
                    "OPEN",

                createdAt:
                    Date.now(),

                updatedAt:
                    Date.now()

            };

            this.cache.set(
                ticket.id,
                ticket
            );

            this.statistics.created++;

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        "Ticket Created"
                    )

                    .setDescription(

                        `Welcome ${options.creator}

A staff member will assist you shortly.`

                    )

                    .addFields(

                        {

                            name:
                                "Topic",

                            value:
                                ticket.topic

                        },

                        {

                            name:
                                "Reason",

                            value:
                                ticket.reason

                        },

                        {

                            name:
                                "Priority",

                            value:
                                ticket.priority

                        }

                    );

            const row =
                new ActionRowBuilder<ButtonBuilder>()

                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId(
                                "ticket-close"
                            )

                            .setLabel(
                                "Close"
                            )

                            .setStyle(
                                ButtonStyle.Danger
                            ),

                        new ButtonBuilder()

                            .setCustomId(
                                "ticket-claim"
                            )

                            .setLabel(
                                "Claim"
                            )

                            .setStyle(
                                ButtonStyle.Primary
                            ),

                        new ButtonBuilder()

                            .setCustomId(
                                "ticket-delete"
                            )

                            .setLabel(
                                "Delete"
                            )

                            .setStyle(
                                ButtonStyle.Secondary
                            )

                    );

            await channel.send({

                embeds: [

                    embed

                ],

                components: [

                    row

                ]

            });

            this.emit(
                "ticketCreate",
                ticket
            );

            return ticket;

        } finally {

            this.opening.delete(
                options.creator.id
            );

        }

    }
      public async closeTicket(
        ticketId: string,
        member: GuildMember,
        reason = "No reason provided"
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        if (
            ticket.status === "CLOSED"
        )
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        ticket.status = "CLOSED";
        ticket.closedAt = Date.now();
        ticket.updatedAt = Date.now();

        await channel.permissionOverwrites.edit(
            ticket.creatorId,
            {
                SendMessages: false
            }
        );

        const embed =
            new EmbedBuilder()

                .setTitle(
                    "Ticket Closed"
                )

                .setDescription(
                    `${member} closed this ticket.`
                )

                .addFields(
                    {
                        name: "Reason",
                        value: reason
                    }
                )

                .setTimestamp();

        await channel.send({
            embeds: [embed]
        });

        this.statistics.closed++;

        this.emit(
            "ticketClose",
            ticket
        );

        return true;

    }

    public async reopenTicket(
        ticketId: string,
        member: GuildMember
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        if (
            ticket.status !== "CLOSED"
        )
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        ticket.status = "OPEN";
        ticket.closedAt = undefined;
        ticket.updatedAt = Date.now();

        await channel.permissionOverwrites.edit(
            ticket.creatorId,
            {
                SendMessages: true
            }
        );

        await channel.send({

            embeds: [

                new EmbedBuilder()

                    .setTitle(
                        "Ticket Reopened"
                    )

                    .setDescription(
                        `${member} reopened the ticket.`
                    )

            ]

        });

        this.statistics.reopened++;

        this.emit(
            "ticketReopen",
            ticket
        );

        return true;

    }

    public async claimTicket(
        ticketId: string,
        member: GuildMember
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        if (
            ticket.claimedBy
        )
            return false;

        ticket.claimedBy =
            member.id;

        ticket.updatedAt =
            Date.now();

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (channel) {

            await channel.send({

                embeds: [

                    new EmbedBuilder()

                        .setTitle(
                            "Ticket Claimed"
                        )

                        .setDescription(
                            `${member} is now responsible for this ticket.`
                        )

                ]

            });

        }

        this.statistics.claimed++;

        this.emit(
            "ticketClaim",
            ticket
        );

        return true;

    }

    public async unclaimTicket(
        ticketId: string
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        ticket.claimedBy =
            undefined;

        ticket.updatedAt =
            Date.now();

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (channel) {

            await channel.send({

                embeds: [

                    new EmbedBuilder()

                        .setTitle(
                            "Ticket Unclaimed"
                        )

                ]

            });

        }

        this.emit(
            "ticketUnclaim",
            ticket
        );

        return true;

    }

    public async deleteTicket(
        ticketId: string,
        member: GuildMember
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (channel) {

            await channel.send({

                embeds: [

                    new EmbedBuilder()

                        .setTitle(
                            "Deleting Ticket..."
                        )

                        .setDescription(
                            `Requested by ${member}`
                        )

                ]

            });

            setTimeout(async () => {

                await channel.delete();

            }, 3000);

        }

        ticket.status =
            "DELETED";

        ticket.deletedAt =
            Date.now();

        ticket.updatedAt =
            Date.now();

        this.statistics.deleted++;

        this.emit(
            "ticketDelete",
            ticket
        );

        return true;

    }

    public async renameTicket(
        ticketId: string,
        newName: string
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        await channel.setName(
            newName
        );

        ticket.updatedAt =
            Date.now();

        this.statistics.renamed++;

        this.emit(
            "ticketRename",
            ticket
        );

        return true;

    }

    public async addParticipant(
        ticketId: string,
        user: User
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        if (
            ticket.participants.includes(
                user.id
            )
        )
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        await channel.permissionOverwrites.edit(
            user.id,
            {

                ViewChannel: true,

                SendMessages: true,

                ReadMessageHistory: true

            }

        );

        ticket.participants.push(
            user.id
        );

        ticket.updatedAt =
            Date.now();

        this.emit(
            "participantAdd",
            ticket,
            user
        );

        return true;

    }

    public async removeParticipant(
        ticketId: string,
        user: User
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        await channel.permissionOverwrites.delete(
            user.id
        );

        ticket.participants =
            ticket.participants.filter(
                x => x !== user.id
            );

        ticket.updatedAt =
            Date.now();

        this.emit(
            "participantRemove",
            ticket,
            user
        );

        return true;

    }
      public async lockTicket(
        ticketId: string,
        member: GuildMember
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        await channel.permissionOverwrites.edit(
            ticket.creatorId,
            {
                SendMessages: false,
                AddReactions: false
            }
        );

        ticket.status = "LOCKED";
        ticket.updatedAt = Date.now();

        await channel.send({

            embeds: [

                new EmbedBuilder()

                    .setTitle("🔒 Ticket Locked")

                    .setDescription(
                        `${member} locked this ticket.`
                    )

            ]

        });

        this.emit(
            "ticketLock",
            ticket
        );

        return true;

    }

    public async unlockTicket(
        ticketId: string,
        member: GuildMember
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        await channel.permissionOverwrites.edit(
            ticket.creatorId,
            {
                SendMessages: true,
                AddReactions: true
            }
        );

        ticket.status = "OPEN";
        ticket.updatedAt = Date.now();

        await channel.send({

            embeds: [

                new EmbedBuilder()

                    .setTitle("🔓 Ticket Unlocked")

                    .setDescription(
                        `${member} unlocked this ticket.`
                    )

            ]

        });

        this.emit(
            "ticketUnlock",
            ticket
        );

        return true;

    }

    public async transferTicket(
        ticketId: string,
        newStaff: GuildMember
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        ticket.claimedBy =
            newStaff.id;

        ticket.updatedAt =
            Date.now();

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (channel) {

            await channel.send({

                embeds: [

                    new EmbedBuilder()

                        .setTitle(
                            "Ticket Transferred"
                        )

                        .setDescription(
                            `Ticket transferred to ${newStaff}`
                        )

                ]

            });

        }

        this.statistics.transferred++;

        this.emit(
            "ticketTransfer",
            ticket
        );

        return true;

    }

    public async moveCategory(
        ticketId: string,
        category: CategoryChannel
    ): Promise<boolean> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        await channel.setParent(
            category.id
        );

        ticket.categoryId =
            category.id;

        ticket.updatedAt =
            Date.now();

        this.emit(
            "ticketMove",
            ticket
        );

        return true;

    }

    public async pinTicket(
        ticketId: string
    ) {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        const messages =
            await channel.messages.fetch({
                limit: 1
            });

        const first =
            messages.first();

        if (first)
            await first.pin();

        this.statistics.pinned++;

        this.emit(
            "ticketPin",
            ticket
        );

        return true;

    }

    public async unpinTicket(
        ticketId: string
    ) {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return false;

        const pins =
            await channel.messages.fetchPinned();

        for (const msg of pins.values()) {

            await msg.unpin();

        }

        this.emit(
            "ticketUnpin",
            ticket
        );

        return true;

    }

    public setPriority(
        ticketId: string,
        priority:
            | "LOW"
            | "NORMAL"
            | "HIGH"
            | "URGENT"
    ) {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        ticket.priority =
            priority;

        ticket.updatedAt =
            Date.now();

        this.emit(
            "priorityChange",
            ticket
        );

        return true;

    }

    public addTag(
        ticketId: string,
        tag: string
    ) {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        if (
            ticket.tags.includes(tag)
        )
            return false;

        ticket.tags.push(tag);

        ticket.updatedAt =
            Date.now();

        return true;

    }

    public removeTag(
        ticketId: string,
        tag: string
    ) {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return false;

        ticket.tags =
            ticket.tags.filter(
                t => t !== tag
            );

        ticket.updatedAt =
            Date.now();

        return true;

    }

    public findTicket(
        id: string
    ): Ticket | undefined {

        return this.cache.get(id);

    }

    public findByChannel(
        channelId: string
    ): Ticket | undefined {

        return Array.from(
            this.cache.values()
        ).find(
            t => t.channelId === channelId
        );

    }

    public findOpenTicket(
        guildId: string,
        creatorId: string
    ) {

        return Array.from(
            this.cache.values()
        ).find(t =>

            t.guildId === guildId &&

            t.creatorId === creatorId &&

            t.status === "OPEN"

        );

    }

    public getTickets() {

        return Array.from(
            this.cache.values()
        );

    }

    public getStatistics() {

        return {

            ...this.statistics,

            cached:
                this.cache.size,

            uptime:
                process.uptime()

        };

    }

    private cleanup() {

        for (const ticket of this.cache.values()) {

            if (
                ticket.status === "DELETED"
            ) {

                const age =
                    Date.now() -
                    ticket.deletedAt!;

                if (
                    age >
                    1000 * 60 * 60 * 24
                ) {

                    this.cache.delete(
                        ticket.id
                    );

                }

            }
    public async generateTranscript(
        ticketId: string
    ): Promise<string | null> {

        const ticket =
            this.cache.get(ticketId);

        if (!ticket)
            return null;

        const channel =
            await this.client.channels.fetch(
                ticket.channelId
            ) as TextChannel;

        if (!channel)
            return null;

        const fetched =
            await channel.messages.fetch({
                limit: 100
            });

        const messages =
            Array.from(
                fetched.values()
            ).reverse();

        let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Transcript</title>
<style>

body{
background:#1e1f22;
color:white;
font-family:Arial;
padding:25px;
}

.message{
margin-bottom:20px;
padding:12px;
background:#2b2d31;
border-radius:8px;
}

.author{
font-weight:bold;
font-size:15px;
}

.time{
font-size:12px;
color:#999;
}

.content{
margin-top:8px;
white-space:pre-wrap;
}

</style>
</head>
<body>

<h1>HyperTickets Transcript</h1>

`;

        for (const msg of messages) {

            html += `

<div class="message">

<div class="author">

${msg.author.tag}

</div>

<div class="time">

${new Date(
msg.createdTimestamp
).toLocaleString()}

</div>

<div class="content">

${msg.content
.replaceAll("<","&lt;")
.replaceAll(">","&gt;")}

</div>

</div>

`;

        }

        html += `
</body>
</html>
`;

        const folder =
            path.join(
                process.cwd(),
                "transcripts"
            );

        if (
            !fs.existsSync(folder)
        ) {

            fs.mkdirSync(
                folder,
                {
                    recursive:true
                }
            );

        }

        const file =
            path.join(
                folder,
                `${ticket.id}.html`
            );

        fs.writeFileSync(
            file,
            html
        );

        ticket.transcript =
            file;

        ticket.updatedAt =
            Date.now();

        this.emit(
            "transcriptGenerate",
            ticket
        );

        return file;

    }

    public async syncDatabase() {

        for (const ticket of this.cache.values()) {

            /*
             Save ticket into database.

             Prisma

             SQLite

             PostgreSQL

             MySQL

             support will be implemented
             here.

            */

        }

    }

    public async backupTickets() {

        const backup = {

            created:
                Date.now(),

            tickets:
                this.getTickets()

        };

        const folder =
            path.join(
                process.cwd(),
                "backups"
            );

        if (
            !fs.existsSync(folder)
        ) {

            fs.mkdirSync(
                folder,
                {
                    recursive:true
                }
            );

        }

        const file =
            path.join(
                folder,
                `tickets-${Date.now()}.json`
            );

        fs.writeFileSync(

            file,

            JSON.stringify(
                backup,
                null,
                4
            )

        );

        this.emit(
            "backupCreate",
            file
        );

        return file;

    }

    public async restoreBackup(
        file:string
    ){

        if(
            !fs.existsSync(file)
        )
            return false;

        const json=
            JSON.parse(

                fs.readFileSync(
                    file,
                    "utf8"
                )

            );

        this.cache.clear();

        for(
            const ticket
            of json.tickets
        ){

            this.cache.set(
                ticket.id,
                ticket
            );

        }

        this.emit(
            "backupRestore",
            file
        );

        return true;

    }

    public search(
        keyword:string
    ){

        keyword=
            keyword.toLowerCase();

        return this.getTickets()

        .filter(ticket=>

            ticket.topic
            .toLowerCase()
            .includes(keyword)

            ||

            ticket.reason
            .toLowerCase()
            .includes(keyword)

            ||

            ticket.creatorId
            .includes(keyword)

        );

    }

    public filterByStatus(
        status:
        "OPEN"|
        "CLOSED"|
        "LOCKED"|
        "DELETED"
    ){

        return this.getTickets()

        .filter(

            ticket=>

            ticket.status===status

        );

    }

    public filterByPriority(
        priority:
        "LOW"|
        "NORMAL"|
        "HIGH"|
        "URGENT"
    ){

        return this.getTickets()

        .filter(

            ticket=>

            ticket.priority===priority

        );

    }

    public recentlyCreated(
        amount=10
    ){

        return this.getTickets()

        .sort(

            (
                a,
                b
            )=>

            b.createdAt-
            a.createdAt

        )

        .slice(
            0,
            amount
        );

    }

    public recentlyClosed(
        amount=10
    ){

        return this.getTickets()

        .filter(

            x=>

            x.closedAt

        )

        .sort(

            (
                a,
                b
            )=>

            (b.closedAt??0)-

            (a.closedAt??0)

        )

        .slice(
            0,
            amount
        );

    }

    public totalOpen(){

        return this.filterByStatus(
            "OPEN"
        ).length;

    }

    public totalClosed(){

        return this.filterByStatus(
            "CLOSED"
        ).length;

    }

    public totalLocked(){

        return this.filterByStatus(
            "LOCKED"
        ).length;

    }

    public totalDeleted(){

        return this.filterByStatus(
            "DELETED"
        ).length;

    }

    public clearCache(){

        this.cache.clear();

    }

    public destroy(){

        this.removeAllListeners();

        this.cache.clear();

        this.blacklist.clear();

        this.opening.clear();

        }
        }

}
    /* --------------------------------------------------------
     * Analytics
     * -------------------------------------------------------- */

    private analytics = {

        averageResponseTime: 0,

        averageCloseTime: 0,

        totalMessages: 0,

        totalAttachments: 0,

        ticketsToday: 0,

        ticketsThisWeek: 0,

        ticketsThisMonth: 0,

        peakOpenTickets: 0,

        busiestHour: -1,

        staffResponses: new Map<string, number>(),

        creatorMessages: new Map<string, number>()

    };

    public updateAnalytics() {

        const open =
            this.totalOpen();

        if (
            open >
            this.analytics.peakOpenTickets
        ) {

            this.analytics.peakOpenTickets =
                open;

        }

        const hour =
            new Date().getHours();

        this.analytics.busiestHour =
            hour;

    }

    public recordStaffResponse(
        member: GuildMember
    ) {

        const amount =
            this.analytics.staffResponses.get(
                member.id
            ) ?? 0;

        this.analytics.staffResponses.set(

            member.id,

            amount + 1

        );

    }

    public recordCreatorMessage(
        user: User
    ) {

        const amount =
            this.analytics.creatorMessages.get(
                user.id
            ) ?? 0;

        this.analytics.creatorMessages.set(

            user.id,

            amount + 1

        );

    }

    public getAnalytics() {

        return {

            ...this.analytics,

            cacheSize:
                this.cache.size,

            statistics:
                this.statistics

        };

    }

    /* --------------------------------------------------------
     * Auto Close
     * -------------------------------------------------------- */

    public enableAutoClose(
        hours: number
    ) {

        setInterval(

            async () => {

                const now =
                    Date.now();

                for (

                    const ticket

                    of

                    this.cache.values()

                ) {

                    if (

                        ticket.status !==
                        "OPEN"

                    )
                        continue;

                    const age =

                        now -

                        ticket.updatedAt;

                    if (

                        age >

                        hours *

                        60 *

                        60 *

                        1000

                    ) {

                        const guild =
                            this.client.guilds.cache.get(
                                ticket.guildId
                            );

                        if (!guild)
                            continue;

                        const bot =
                            guild.members.me;

                        if (!bot)
                            continue;

                        await this.closeTicket(

                            ticket.id,

                            bot,

                            "Automatically closed."

                        );

                    }

                }

            },

            60000

        );

    }

    /* --------------------------------------------------------
     * Auto Delete
     * -------------------------------------------------------- */

    public enableAutoDelete(
        days: number
    ) {

        setInterval(

            async () => {

                const now =
                    Date.now();

                for (

                    const ticket

                    of

                    this.cache.values()

                ) {

                    if (

                        ticket.status !==
                        "CLOSED"

                    )
                        continue;

                    if (
                        !ticket.closedAt
                    )
                        continue;

                    const age =

                        now -

                        ticket.closedAt;

                    if (

                        age >

                        days *

                        24 *

                        60 *

                        60 *

                        1000

                    ) {

                        const guild =
                            this.client.guilds.cache.get(
                                ticket.guildId
                            );

                        if (!guild)
                            continue;

                        const bot =
                            guild.members.me;

                        if (!bot)
                            continue;

                        await this.deleteTicket(

                            ticket.id,

                            bot

                        );

                    }

                }

            },

            60000

        );

    }

    /* --------------------------------------------------------
     * Webhook Logger
     * -------------------------------------------------------- */

    public async logWebhook(

        webhook: string,

        title: string,

        description: string

    ) {

        try {

            await fetch(

                webhook,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":

                            "application/json"

                    },

                    body: JSON.stringify({

                        embeds: [

                            {

                                title,

                                description,

                                timestamp:
                                    new Date()

                            }

                        ]

                    })

                }

            );

        } catch {

        }

    }

    /* --------------------------------------------------------
     * Bulk Operations
     * -------------------------------------------------------- */

    public async closeAllOpenTickets(
        member: GuildMember
    ) {

        for (

            const ticket

            of

            this.cache.values()

        ) {

            if (

                ticket.status ===
                "OPEN"

            ) {

                await this.closeTicket(

                    ticket.id,

                    member,

                    "Bulk close"

                );

            }

        }

    }

    public async deleteClosedTickets(
        member: GuildMember
    ) {

        for (

            const ticket

            of

            this.cache.values()

        ) {

            if (

                ticket.status ===
                "CLOSED"

            ) {

                await this.deleteTicket(

                    ticket.id,

                    member

                );

            }

        }

    }

    public async reopenAllTickets(
        member: GuildMember
    ) {

        for (

            const ticket

            of

            this.cache.values()

        ) {

            if (

                ticket.status ===
                "CLOSED"

            ) {

                await this.reopenTicket(

                    ticket.id,

                    member

                );

            }

        }

    }

    /* --------------------------------------------------------
     * Plugin Hooks
     * -------------------------------------------------------- */

    public executeHook(

        hook: string,

        ...args: any[]

    ) {

        this.emit(

            `plugin:${hook}`,

            ...args

        );

    }

    public registerHook(

        hook: string,

        callback: (...args: any[]) => void

    ) {

        this.on(

            `plugin:${hook}`,

            callback

        );

    }

    /* --------------------------------------------------------
     * Health
     * -------------------------------------------------------- */

    public health() {

        return {

            cache:

                this.cache.size,

            blacklist:

                this.blacklist.size,

            opening:

                this.opening.size,

            uptime:

                process.uptime(),

            memory:

                process.memoryUsage(),

            analytics:

                this.analytics,

            statistics:

                this.statistics

        };

    }
        /* --------------------------------------------------------
     * Ticket Rating System
     * -------------------------------------------------------- */

    private ratings =
        new Map<
            string,
            {
                stars:number;
                comment:string;
                user:string;
                created:number;
            }
        >();

    public submitRating(
        ticketId:string,
        stars:number,
        comment:string,
        userId:string
    ){

        if(stars < 1)
            stars = 1;

        if(stars > 5)
            stars = 5;

        this.ratings.set(
            ticketId,
            {
                stars,
                comment,
                user:userId,
                created:Date.now()
            }
        );

        this.emit(
            "ticketRating",
            ticketId
        );

        return true;

    }

    public getRating(
        ticketId:string
    ){

        return this.ratings.get(
            ticketId
        );

    }

    public averageRating(){

        if(
            this.ratings.size===0
        )
            return 0;

        let total = 0;

        for(
            const rating
            of
            this.ratings.values()
        ){

            total +=
                rating.stars;

        }

        return Number(

            (
                total /
                this.ratings.size
            ).toFixed(2)

        );

    }

    /* --------------------------------------------------------
     * Ticket Queue
     * -------------------------------------------------------- */

    private queue:string[]=[];

    public addToQueue(
        ticketId:string
    ){

        if(
            this.queue.includes(
                ticketId
            )
        )
            return;

        this.queue.push(
            ticketId
        );

        this.emit(
            "queueAdd",
            ticketId
        );

    }

    public removeFromQueue(
        ticketId:string
    ){

        this.queue=
            this.queue.filter(
                x=>x!==ticketId
            );

        this.emit(
            "queueRemove",
            ticketId
        );

    }

    public nextTicket(){

        return this.queue.shift();

    }

    public queueLength(){

        return this.queue.length;

    }

    /* --------------------------------------------------------
     * SLA Timers
     * -------------------------------------------------------- */

    private slaTimers=
        new Map<
            string,
            number
        >();

    public startSLA(
        ticketId:string
    ){

        this.slaTimers.set(
            ticketId,
            Date.now()
        );

    }

    public stopSLA(
        ticketId:string
    ){

        const start=
            this.slaTimers.get(
                ticketId
            );

        if(!start)
            return 0;

        this.slaTimers.delete(
            ticketId
        );

        return Date.now()-start;

    }

    /* --------------------------------------------------------
     * Dashboard Live Sync
     * -------------------------------------------------------- */

    public broadcastDashboard(){

        this.emit(
            "dashboard:update",
            {

                statistics:
                    this.statistics,

                analytics:
                    this.analytics,

                queue:
                    this.queue,

                ratings:
                    this.averageRating(),

                tickets:
                    this.getTickets()

            }
        );

    }

    /* --------------------------------------------------------
     * Export
     * -------------------------------------------------------- */

    public exportJSON(){

        return JSON.stringify({

            exported:
                Date.now(),

            tickets:
                this.getTickets(),

            statistics:
                this.statistics,

            analytics:
                this.analytics,

            ratings:
                Array.from(
                    this.ratings.entries()
                )

        },null,4);

    }

    public exportCSV(){

        const rows:string[]=[];

        rows.push(
            "id,status,creator,priority,created"
        );

        for(
            const ticket
            of
            this.cache.values()
        ){

            rows.push(

`${ticket.id},${ticket.status},${ticket.creatorId},${ticket.priority},${ticket.createdAt}`

            );

        }

        return rows.join("\n");

    }

    /* --------------------------------------------------------
     * Permission Check
     * -------------------------------------------------------- */

    public canManageTicket(
        member:GuildMember
    ){

        if(
            member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        )
            return true;

        return member.permissions.has(

            PermissionsBitField.Flags.ManageChannels

        );

    }

    /* --------------------------------------------------------
     * Statistics Reset
     * -------------------------------------------------------- */

    public resetStatistics(){

        this.statistics.created=0;
        this.statistics.closed=0;
        this.statistics.deleted=0;
        this.statistics.claimed=0;
        this.statistics.reopened=0;
        this.statistics.transferred=0;
        this.statistics.renamed=0;
        this.statistics.pinned=0;

        this.analytics.totalMessages=0;
        this.analytics.totalAttachments=0;
        this.analytics.ticketsToday=0;
        this.analytics.ticketsThisWeek=0;
        this.analytics.ticketsThisMonth=0;

        this.emit(
            "statisticsReset"
        );

    }

    /* --------------------------------------------------------
     * Save Cache
     * -------------------------------------------------------- */

    public saveCache(){

        const folder=
            path.join(
                process.cwd(),
                "cache"
            );

        if(
            !fs.existsSync(folder)
        ){

            fs.mkdirSync(
                folder,
                {
                    recursive:true
                }
            );

        }

        fs.writeFileSync(

            path.join(
                folder,
                "tickets.json"
            ),

            JSON.stringify(
                this.getTickets(),
                null,
                4
            )

        );

    }

    public loadSavedCache(){

        const file=
            path.join(
                process.cwd(),
                "cache",
                "tickets.json"
            );

        if(
            !fs.existsSync(file)
        )
            return;

        const tickets=
            JSON.parse(

                fs.readFileSync(
                    file,
                    "utf8"
                )

            );

        this.cache.clear();

        for(
            const ticket
            of tickets
        ){

            this.cache.set(
                ticket.id,
                ticket
            );

        }

            }
        /* --------------------------------------------------------
     * Escalation System
     * -------------------------------------------------------- */

    private escalations =
        new Map<
            string,
            {
                level:number;
                reason:string;
                escalatedBy:string;
                timestamp:number;
            }
        >();

    public escalateTicket(
        ticketId:string,
        member:GuildMember,
        reason:string
    ){

        const ticket =
            this.cache.get(ticketId);

        if(!ticket)
            return false;

        const current =
            this.escalations.get(ticketId);

        const level =
            current
                ? current.level + 1
                : 1;

        this.escalations.set(

            ticketId,

            {

                level,

                reason,

                escalatedBy:member.id,

                timestamp:Date.now()

            }

        );

        ticket.updatedAt =
            Date.now();

        this.emit(

            "ticketEscalated",

            ticket,

            level

        );

        return true;

    }

    public removeEscalation(
        ticketId:string
    ){

        this.escalations.delete(
            ticketId
        );

        return true;

    }

    public getEscalation(
        ticketId:string
    ){

        return this.escalations.get(
            ticketId
        );

    }

    /* --------------------------------------------------------
     * Ticket Notes
     * -------------------------------------------------------- */

    private notes =
        new Map<
            string,
            {

                author:string;

                content:string;

                created:number;

            }[]

        >();

    public addNote(

        ticketId:string,

        member:GuildMember,

        note:string

    ){

        const list =

            this.notes.get(ticketId)

            ??

            [];

        list.push({

            author:member.id,

            content:note,

            created:Date.now()

        });

        this.notes.set(

            ticketId,

            list

        );

        this.emit(

            "noteAdded",

            ticketId

        );

    }

    public getNotes(
        ticketId:string
    ){

        return this.notes.get(
            ticketId
        ) ?? [];

    }

    public clearNotes(
        ticketId:string
    ){

        this.notes.delete(
            ticketId
        );

    }

    /* --------------------------------------------------------
     * Custom Fields
     * -------------------------------------------------------- */

    private customFields =
        new Map<
            string,
            Record<
                string,
                string
            >
        >();

    public setField(

        ticketId:string,

        key:string,

        value:string

    ){

        const fields =

            this.customFields.get(
                ticketId
            )

            ??

            {};

        fields[key] =
            value;

        this.customFields.set(

            ticketId,

            fields

        );

    }

    public getField(

        ticketId:string,

        key:string

    ){

        return this.customFields
            .get(ticketId)
            ?.[key];

    }

    public getFields(
        ticketId:string
    ){

        return this.customFields.get(
            ticketId
        ) ?? {};

    }

    /* --------------------------------------------------------
     * Ticket Templates
     * -------------------------------------------------------- */

    private templates =
        new Map<
            string,
            {

                title:string;

                description:string;

                priority:string;

            }
        >();

    public registerTemplate(

        id:string,

        title:string,

        description:string,

        priority:string

    ){

        this.templates.set(

            id,

            {

                title,

                description,

                priority

            }

        );

    }

    public getTemplate(
        id:string
    ){

        return this.templates.get(id);

    }

    public removeTemplate(
        id:string
    ){

        this.templates.delete(id);

    }

    /* --------------------------------------------------------
     * Ticket History
     * -------------------------------------------------------- */

    private history =
        new Map<
            string,
            string[]
        >();

    public pushHistory(

        ticketId:string,

        entry:string

    ){

        const list =

            this.history.get(ticketId)

            ??

            [];

        list.push(

            `[${new Date().toISOString()}] ${entry}`

        );

        this.history.set(

            ticketId,

            list

        );

    }

    public getHistory(
        ticketId:string
    ){

        return this.history.get(
            ticketId
        ) ?? [];

    }

    /* --------------------------------------------------------
     * Audit Logger
     * -------------------------------------------------------- */

    public audit(

        action:string,

        user:string,

        ticket:string,

        details:string

    ){

        const line =

`${new Date().toISOString()} | ${action} | ${user} | ${ticket} | ${details}\n`;

        const folder =
            path.join(

                process.cwd(),

                "logs"

            );

        if(

            !fs.existsSync(folder)

        ){

            fs.mkdirSync(

                folder,

                {

                    recursive:true

                }

            );

        }

        fs.appendFileSync(

            path.join(

                folder,

                "audit.log"

            ),

            line

        );

    }

    /* --------------------------------------------------------
     * Dashboard Events
     * -------------------------------------------------------- */

    public dashboardPayload(){

        return{

            tickets:

                this.getTickets(),

            queue:

                this.queue,

            analytics:

                this.analytics,

            ratings:

                Array.from(
                    this.ratings.values()
                ),

            templates:

                Array.from(
                    this.templates.values()
                ),

            escalations:

                Array.from(
                    this.escalations.entries()
                )

        };

    }

    public heartbeat(){

        this.emit(

            "dashboardHeartbeat",

            {

                time:Date.now(),

                uptime:process.uptime(),

                memory:process.memoryUsage(),

                open:this.totalOpen(),

                closed:this.totalClosed()

            }

        );

    }
        /* --------------------------------------------------------
     * Notification Center
     * -------------------------------------------------------- */

    private notifications =
        new Map<
            string,
            {
                id:string;
                title:string;
                description:string;
                created:number;
                read:boolean;
            }[]
        >();

    public sendNotification(

        userId:string,

        title:string,

        description:string

    ){

        const list =

            this.notifications.get(
                userId
            ) ?? [];

        list.push({

            id:crypto.randomUUID(),

            title,

            description,

            created:Date.now(),

            read:false

        });

        this.notifications.set(
            userId,
            list
        );

        this.emit(
            "notificationCreate",
            userId
        );

    }

    public getNotifications(
        userId:string
    ){

        return this.notifications.get(
            userId
        ) ?? [];

    }

    public markNotificationRead(

        userId:string,

        notificationId:string

    ){

        const list =
            this.notifications.get(
                userId
            );

        if(!list)
            return false;

        const notification =
            list.find(
                x=>x.id===notificationId
            );

        if(!notification)
            return false;

        notification.read=true;

        return true;

    }

    public clearNotifications(
        userId:string
    ){

        this.notifications.delete(
            userId
        );

    }

    /* --------------------------------------------------------
     * Workflow Automation
     * -------------------------------------------------------- */

    private workflows =
        new Map<
            string,
            () => Promise<void>
        >();

    public registerWorkflow(

        id:string,

        callback:() => Promise<void>

    ){

        this.workflows.set(
            id,
            callback
        );

    }

    public async executeWorkflow(
        id:string
    ){

        const workflow =
            this.workflows.get(id);

        if(!workflow)
            return false;

        await workflow();

        return true;

    }

    public workflowNames(){

        return Array.from(
            this.workflows.keys()
        );

    }

    /* --------------------------------------------------------
     * Scheduled Tasks
     * -------------------------------------------------------- */

    private scheduled =
        new Map<
            string,
            NodeJS.Timeout
        >();

    public scheduleTask(

        id:string,

        delay:number,

        callback:() => void

    ){

        if(
            this.scheduled.has(id)
        ){

            clearTimeout(

                this.scheduled.get(id)!

            );

        }

        const timeout =
            setTimeout(

                callback,

                delay

            );

        this.scheduled.set(
            id,
            timeout
        );

    }

    public cancelTask(
        id:string
    ){

        const timeout =
            this.scheduled.get(id);

        if(!timeout)
            return;

        clearTimeout(timeout);

        this.scheduled.delete(id);

    }

    /* --------------------------------------------------------
     * Staff Statistics
     * -------------------------------------------------------- */

    public getTopStaff(){

        return Array.from(

            this.analytics
                .staffResponses
                .entries()

        )

        .sort(

            (a,b)=>

            b[1]-a[1]

        );

    }

    public getTopCreators(){

        return Array.from(

            this.analytics
                .creatorMessages
                .entries()

        )

        .sort(

            (a,b)=>

            b[1]-a[1]

        );

    }

    /* --------------------------------------------------------
     * Cache Statistics
     * -------------------------------------------------------- */

    public cacheStatistics(){

        let open=0;
        let closed=0;
        let locked=0;
        let deleted=0;

        for(
            const ticket
            of this.cache.values()
        ){

            switch(ticket.status){

                case "OPEN":
                    open++;
                    break;

                case "CLOSED":
                    closed++;
                    break;

                case "LOCKED":
                    locked++;
                    break;

                case "DELETED":
                    deleted++;
                    break;

            }

        }

        return{

            total:
                this.cache.size,

            open,

            closed,

            locked,

            deleted

        };

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public async shutdown(){

        this.saveCache();

        await this.syncDatabase();

        this.removeAllListeners();

        for(

            const timeout

            of

            this.scheduled.values()

        ){

            clearTimeout(timeout);

        }

        this.scheduled.clear();

        this.cache.clear();

        this.queue.length=0;

        this.emit(
            "shutdown"
        );

    }

}
