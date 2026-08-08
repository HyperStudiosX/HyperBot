import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    ColorResolvable,
    EmbedBuilder,
    Guild,
    GuildBasedChannel,
    GuildMember,
    Message,
    MessageActionRowComponentBuilder,
    PermissionFlagsBits,
    Role,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextChannel
} from "discord.js";

import { EventEmitter } from "events";
import crypto from "crypto";

import { TicketManager } from "./TicketManager";

export interface TicketOption {

    id: string;

    label: string;

    description: string;

    emoji?: string;

    categoryId: string;

    staffRoles: string[];

    questions: string[];

    priority:
        | "LOW"
        | "NORMAL"
        | "HIGH"
        | "URGENT";

}

export interface TicketPanel {

    id: string;

    guildId: string;

    channelId: string;

    messageId?: string;

    title: string;

    description: string;

    color: ColorResolvable;

    thumbnail?: string;

    image?: string;

    footer?: string;

    enabled: boolean;

    options: TicketOption[];

    createdAt: number;

    updatedAt: number;

}

export class PanelManager extends EventEmitter {

    private readonly client: Client;

    private readonly ticketManager: TicketManager;

    private readonly cache =
        new Map<
            string,
            TicketPanel
        >();

    private statistics = {

        created: 0,

        updated: 0,

        deleted: 0,

        rendered: 0,

        interactions: 0,

        selections: 0

    };

    constructor(

        client: Client,

        ticketManager: TicketManager

    ) {

        super();

        this.client = client;

        this.ticketManager = ticketManager;

    }

    public createPanel(

        guild: Guild,

        channel: TextChannel,

        title: string,

        description: string

    ): TicketPanel {

        const panel: TicketPanel = {

            id:
                crypto.randomUUID(),

            guildId:
                guild.id,

            channelId:
                channel.id,

            title,

            description,

            color:
                "#5865F2",

            enabled:
                true,

            options: [],

            createdAt:
                Date.now(),

            updatedAt:
                Date.now()

        };

        this.cache.set(

            panel.id,

            panel

        );

        this.statistics.created++;

        this.emit(

            "panelCreate",

            panel

        );

        return panel;

    }

    public getPanel(

        id: string

    ) {

        return this.cache.get(id);

    }

    public getPanels(

        guildId?: string

    ) {

        if (!guildId)

            return Array.from(

                this.cache.values()

            );

        return Array.from(

            this.cache.values()

        ).filter(

            panel =>

                panel.guildId === guildId

        );

    }

    public deletePanel(

        id: string

    ) {

        const panel =

            this.cache.get(id);

        if (!panel)

            return false;

        this.cache.delete(id);

        this.statistics.deleted++;

        this.emit(

            "panelDelete",

            panel

        );

        return true;

    }

    public renamePanel(

        id: string,

        title: string,

        description: string

    ) {

        const panel =

            this.cache.get(id);

        if (!panel)

            return false;

        panel.title = title;

        panel.description = description;

        panel.updatedAt = Date.now();

        this.statistics.updated++;

        this.emit(

            "panelUpdate",

            panel

        );

        return true;

    }

    public setColor(

        id: string,

        color: ColorResolvable

    ) {

        const panel =

            this.cache.get(id);

        if (!panel)

            return false;

        panel.color = color;

        panel.updatedAt = Date.now();

        return true;

    }

    public setThumbnail(

        id: string,

        url: string

    ) {

        const panel =

            this.cache.get(id);

        if (!panel)

            return false;

        panel.thumbnail = url;

        panel.updatedAt = Date.now();

        return true;

    }

    public setImage(

        id: string,

        url: string

    ) {

        const panel =

            this.cache.get(id);

        if (!panel)

            return false;

        panel.image = url;

        panel.updatedAt = Date.now();

        return true;

    }

    public setFooter(

        id: string,

        footer: string

    ) {

        const panel =

            this.cache.get(id);

        if (!panel)

            return false;

        panel.footer = footer;

        panel.updatedAt = Date.now();

        return true;

    }
      public addOption(

        panelId: string,

        option: TicketOption

    ): boolean {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return false;

        if (
            panel.options.find(
                x => x.id === option.id
            )
        )
            return false;

        panel.options.push(option);

        panel.updatedAt =
            Date.now();

        this.statistics.updated++;

        this.emit(
            "optionCreate",
            panel,
            option
        );

        return true;

    }

    public removeOption(

        panelId: string,

        optionId: string

    ): boolean {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return false;

        panel.options =
            panel.options.filter(

                option =>

                    option.id !== optionId

            );

        panel.updatedAt =
            Date.now();

        this.statistics.updated++;

        this.emit(
            "optionDelete",
            panel,
            optionId
        );

        return true;

    }

    public updateOption(

        panelId: string,

        option: TicketOption

    ): boolean {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return false;

        const index =
            panel.options.findIndex(

                x =>

                    x.id === option.id

            );

        if (index === -1)
            return false;

        panel.options[index] =
            option;

        panel.updatedAt =
            Date.now();

        this.statistics.updated++;

        this.emit(
            "optionUpdate",
            panel,
            option
        );

        return true;

    }

    public async sendPanel(

        panelId: string

    ): Promise<Message | null> {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return null;

        const channel =
            await this.client.channels.fetch(

                panel.channelId

            ) as TextChannel;

        if (!channel)
            return null;

        const embed =
            new EmbedBuilder()

                .setTitle(
                    panel.title
                )

                .setDescription(
                    panel.description
                )

                .setColor(
                    panel.color
                )

                .setTimestamp();

        if (
            panel.thumbnail
        ) {

            embed.setThumbnail(
                panel.thumbnail
            );

        }

        if (
            panel.image
        ) {

            embed.setImage(
                panel.image
            );

        }

        if (
            panel.footer
        ) {

            embed.setFooter({

                text:
                    panel.footer

            });

        }

        const menu =
            new StringSelectMenuBuilder()

                .setCustomId(

                    `panel:${panel.id}`

                )

                .setPlaceholder(

                    "Choose a ticket category"

                );

        for (

            const option

            of

            panel.options

        ) {

            menu.addOptions({

                label:
                    option.label,

                value:
                    option.id,

                description:
                    option.description,

                emoji:
                    option.emoji

            });

        }

        const row =
            new ActionRowBuilder<StringSelectMenuBuilder>()

                .addComponents(
                    menu
                );

        const message =
            await channel.send({

                embeds: [
                    embed
                ],

                components: [
                    row
                ]

            });

        panel.messageId =
            message.id;

        panel.updatedAt =
            Date.now();

        this.statistics.rendered++;

        this.emit(
            "panelRender",
            panel
        );

        return message;

    }

    public async refreshPanel(

        panelId: string

    ): Promise<boolean> {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return false;

        if (!panel.messageId)
            return false;

        const channel =
            await this.client.channels.fetch(

                panel.channelId

            ) as TextChannel;

        if (!channel)
            return false;

        const message =
            await channel.messages.fetch(

                panel.messageId

            );

        const embed =
            new EmbedBuilder()

                .setTitle(
                    panel.title
                )

                .setDescription(
                    panel.description
                )

                .setColor(
                    panel.color
                );

        if (
            panel.thumbnail
        ) {

            embed.setThumbnail(
                panel.thumbnail
            );

        }

        if (
            panel.image
        ) {

            embed.setImage(
                panel.image
            );

        }

        const menu =
            new StringSelectMenuBuilder()

                .setCustomId(

                    `panel:${panel.id}`

                )

                .setPlaceholder(

                    "Choose a ticket category"

                );

        for (

            const option

            of

            panel.options

        ) {

            menu.addOptions({

                label:
                    option.label,

                value:
                    option.id,

                description:
                    option.description,

                emoji:
                    option.emoji

            });

        }

        const row =
            new ActionRowBuilder<StringSelectMenuBuilder>()

                .addComponents(
                    menu
                );

        await message.edit({

            embeds: [
                embed
            ],

            components: [
                row
            ]

        });

        this.statistics.rendered++;

        return true;

    }
      public async clonePanel(

        panelId: string,

        channel?: TextChannel

    ): Promise<TicketPanel | null> {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return null;

        const clone: TicketPanel = {

            id:
                crypto.randomUUID(),

            guildId:
                panel.guildId,

            channelId:
                channel
                    ? channel.id
                    : panel.channelId,

            title:
                `${panel.title} (Copy)`,

            description:
                panel.description,

            color:
                panel.color,

            thumbnail:
                panel.thumbnail,

            image:
                panel.image,

            footer:
                panel.footer,

            enabled:
                panel.enabled,

            options:
                structuredClone(
                    panel.options
                ),

            createdAt:
                Date.now(),

            updatedAt:
                Date.now()

        };

        this.cache.set(

            clone.id,

            clone

        );

        this.statistics.created++;

        this.emit(

            "panelClone",

            clone

        );

        return clone;

    }

    public enablePanel(

        panelId: string

    ): boolean {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return false;

        panel.enabled = true;

        panel.updatedAt =
            Date.now();

        this.emit(
            "panelEnable",
            panel
        );

        return true;

    }

    public disablePanel(

        panelId: string

    ): boolean {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return false;

        panel.enabled = false;

        panel.updatedAt =
            Date.now();

        this.emit(
            "panelDisable",
            panel
        );

        return true;

    }

    public hasPermission(

        member: GuildMember

    ): boolean {

        if (

            member.permissions.has(

                PermissionFlagsBits.Administrator

            )

        ) {

            return true;

        }

        return member.permissions.has(

            PermissionFlagsBits.ManageChannels

        );

    }

    public async handleMenuInteraction(

        interaction:
            StringSelectMenuInteraction

    ) {

        if (

            !interaction.customId.startsWith(

                "panel:"

            )

        )

            return;

        const panelId =
            interaction.customId.split(":")[1];

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return;

        if (!panel.enabled) {

            await interaction.reply({

                content:
                    "This ticket panel is currently disabled.",

                ephemeral: true

            });

            return;

        }

        const selected =
            interaction.values[0];

        const option =
            panel.options.find(

                x =>

                    x.id === selected

            );

        if (!option)
            return;

        this.statistics.interactions++;

        this.statistics.selections++;

        this.emit(

            "panelInteraction",

            interaction,

            panel,

            option

        );

        await this.ticketManager.createTicket(

            interaction.guild!,

            interaction.member as GuildMember,

            option.label,

            option.categoryId,

            option.staffRoles,

            option.priority

        );

        await interaction.reply({

            content:
                "Your ticket has been created successfully.",

            ephemeral: true

        });

    }

    public exportPanel(

        panelId: string

    ): string | null {

        const panel =
            this.cache.get(panelId);

        if (!panel)
            return null;

        return JSON.stringify(

            panel,

            null,

            4

        );

    }

    public importPanel(

        json: string

    ): TicketPanel {

        const panel =
            JSON.parse(
                json
            ) as TicketPanel;

        panel.id =
            crypto.randomUUID();

        panel.createdAt =
            Date.now();

        panel.updatedAt =
            Date.now();

        this.cache.set(

            panel.id,

            panel

        );

        this.statistics.created++;

        this.emit(

            "panelImport",

            panel

        );

        return panel;

    }

    public getStatistics() {

        return {

            ...this.statistics,

            totalPanels:
                this.cache.size,

            totalOptions:
                Array.from(

                    this.cache.values()

                ).reduce(

                    (

                        total,

                        panel

                    ) =>

                        total +

                        panel.options.length,

                    0

                )

        };

    }

    public clearCache() {

        this.cache.clear();

    }

    public destroy() {

        this.removeAllListeners();

        this.cache.clear();

    }
