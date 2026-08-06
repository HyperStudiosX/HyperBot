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

        }

}
