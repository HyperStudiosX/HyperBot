import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    EmbedBuilder,
    Guild,
    Message,
    Snowflake,
    TextChannel
} from "discord.js";

import { EventEmitter } from "events";

import { PanelManager } from "../managers/PanelManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { AuditManager } from "../managers/AuditManager";
import { CacheManager } from "../managers/CacheManager";
import { NotificationManager } from "../managers/NotificationManager";

export class PanelService extends EventEmitter{

    private readonly client:Client;

    private readonly panels:PanelManager;

    private readonly database:DatabaseManager;

    private readonly audits:AuditManager;

    private readonly cache:CacheManager;

    private readonly notifications:NotificationManager;

    constructor(

        client:Client,

        panels:PanelManager,

        database:DatabaseManager,

        audits:AuditManager,

        cache:CacheManager,

        notifications:NotificationManager

    ){

        super();

        this.client=client;

        this.panels=panels;

        this.database=database;

        this.audits=audits;

        this.cache=cache;

        this.notifications=notifications;

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    public async initialize(){

        await this.restorePanels();

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Restore Panels
     * -------------------------------------------------------- */

    private async restorePanels(){

        const panels=

            await this.database.getPanels();

        for(

            const panel

            of

            panels

        ){

            this.panels.register(

                panel

            );

        }

        this.emit(

            "panelsRestored",

            panels.length

        );

    }

    /* --------------------------------------------------------
     * Create Panel
     * -------------------------------------------------------- */

    public async createPanel(

        data:any

    ){

        const panel=

            this.panels.create(

                data

            );

        await this.database.savePanel(

            panel

        );

        this.cache.set(

            panel.id,

            panel

        );

        this.emit(

            "panelCreated",

            panel

        );

        return panel;

    }

    /* --------------------------------------------------------
     * Send Panel
     * -------------------------------------------------------- */

    public async sendPanel(

        channel:TextChannel,

        panelId:string

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel

        ){

            throw new Error(

                "Panel not found."

            );

        }

        const embed=

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

        const button=

            new ButtonBuilder()

                .setCustomId(

                    `ticket:${panel.id}`

                )

                .setLabel(

                    panel.button.label

                )

                .setStyle(

                    ButtonStyle.Primary

                );

        const row=

            new ActionRowBuilder<ButtonBuilder>()

                .addComponents(

                    button

                );

        const message=

            await channel.send({

                embeds:[

                    embed

                ],

                components:[

                    row

                ]

            });

        panel.messageId=

            message.id;

        panel.channelId=

            channel.id;

        await this.database.updatePanel(

            panel

        );

        this.emit(

            "panelSent",

            panel

        );

        return message;

    }
    /* --------------------------------------------------------
     * Update Panel
     * -------------------------------------------------------- */

    public async updatePanel(

        panelId:string,

        data:any

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel

        ){

            return null;

        }

        Object.assign(

            panel,

            data

        );

        await this.database.updatePanel(

            panel

        );

        this.cache.set(

            panel.id,

            panel

        );

        this.audits.logSystem(

            "0",

            "UPDATE_PANEL",

            {

                panelId

            }

        );

        this.emit(

            "panelUpdated",

            panel

        );

        return panel;

    }

    /* --------------------------------------------------------
     * Delete Panel
     * -------------------------------------------------------- */

    public async deletePanel(

        panelId:string

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel

        ){

            return false;

        }

        await this.database.deletePanel(

            panelId

        );

        this.cache.delete(

            panelId

        );

        this.panels.delete(

            panelId

        );

        this.emit(

            "panelDeleted",

            panelId

        );

        return true;

    }

    /* --------------------------------------------------------
     * Duplicate Panel
     * -------------------------------------------------------- */

    public async duplicatePanel(

        panelId:string

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel

        ){

            return null;

        }

        const copy=

            await this.createPanel({

                ...panel,

                id:undefined,

                messageId:undefined

            });

        this.emit(

            "panelDuplicated",

            copy

        );

        return copy;

    }

    /* --------------------------------------------------------
     * Enable Panel
     * -------------------------------------------------------- */

    public async enablePanel(

        panelId:string

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel

        ){

            return false;

        }

        panel.enabled=true;

        await this.database.updatePanel(

            panel

        );

        this.emit(

            "panelEnabled",

            panel

        );

        return true;

    }

    /* --------------------------------------------------------
     * Disable Panel
     * -------------------------------------------------------- */

    public async disablePanel(

        panelId:string

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel

        ){

            return false;

        }

        panel.enabled=false;

        await this.database.updatePanel(

            panel

        );

        this.emit(

            "panelDisabled",

            panel

        );

        return true;

    }

    /* --------------------------------------------------------
     * Refresh Panel Message
     * -------------------------------------------------------- */

    public async refreshPanel(

        panelId:string

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel||

            !panel.channelId||

            !panel.messageId

        ){

            return false;

        }

        const channel=

            await this.client.channels.fetch(

                panel.channelId

            ) as TextChannel;

        const message=

            await channel.messages.fetch(

                panel.messageId

            );

        const embed=

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

        await message.edit({

            embeds:[

                embed

            ]

        });

        this.emit(

            "panelRefreshed",

            panel

        );

        return true;

    }
      /* --------------------------------------------------------
     * Apply Theme
     * -------------------------------------------------------- */

    public async applyTheme(

        panelId:string,

        theme:{

            color:number;

            emoji?:string;

            buttonStyle?:ButtonStyle;

        }

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel

        ){

            return false;

        }

        panel.color=

            theme.color;

        if(

            theme.emoji

        ){

            panel.button.emoji=

                theme.emoji;

        }

        if(

            theme.buttonStyle

        ){

            panel.button.style=

                theme.buttonStyle;

        }

        await this.database.updatePanel(

            panel

        );

        this.emit(

            "themeApplied",

            panel

        );

        return true;

    }

    /* --------------------------------------------------------
     * Update Button
     * -------------------------------------------------------- */

    public async updateButton(

        panelId:string,

        label:string,

        style:ButtonStyle,

        emoji?:string

    ){

        const panel=

            this.panels.get(

                panelId

            );

        if(

            !panel

        ){

            return false;

        }

        panel.button.label=

            label;

        panel.button.style=

            style;

        panel.button.emoji=

            emoji;

        await this.database.updatePanel(

            panel

        );

        this.emit(

            "buttonUpdated",

            panel

        );

        return true;

    }

    /* --------------------------------------------------------
     * Export Panels
     * -------------------------------------------------------- */

    public exportPanels(){

        return this.panels.getAll();

    }

    /* --------------------------------------------------------
     * Import Panels
     * -------------------------------------------------------- */

    public async importPanels(

        panels:any[]

    ){

        for(

            const panel

            of

            panels

        ){

            this.panels.register(

                panel

            );

            await this.database.savePanel(

                panel

            );

        }

        this.emit(

            "panelsImported",

            panels.length

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        const panels=

            this.panels.getAll();

        return{

            total:

                panels.length,

            enabled:

                panels.filter(

                    panel=>

                        panel.enabled

                ).length,

            disabled:

                panels.filter(

                    panel=>

                        !panel.enabled

                ).length

        };

    }

    /* --------------------------------------------------------
     * Notify Administrators
     * -------------------------------------------------------- */

    public async notifyAdmins(

        users:User[],

        title:string,

        description:string

    ){

        const embed=

            this.notifications.buildEmbed(

                title,

                description

            );

        await this.notifications.sendBulkDM(

            users,

            embed

        );

        this.emit(

            "adminsNotified",

            users.length

        );

    }
      /* --------------------------------------------------------
     * Synchronize Panels
     * -------------------------------------------------------- */

    public async synchronize(){

        const panels=

            this.panels.getAll();

        for(

            const panel

            of

            panels

        ){

            await this.database.updatePanel(

                panel

            );

        }

        this.emit(

            "panelsSynchronized",

            panels.length

        );

    }

    /* --------------------------------------------------------
     * Find Panel
     * -------------------------------------------------------- */

    public findByChannel(

        channelId:Snowflake

    ){

        return this.panels

            .getAll()

            .find(

                panel=>

                    panel.channelId===

                    channelId

            );

    }

    public findByMessage(

        messageId:Snowflake

    ){

        return this.panels

            .getAll()

            .find(

                panel=>

                    panel.messageId===

                    messageId

            );

    }

    /* --------------------------------------------------------
     * Reload
     * -------------------------------------------------------- */

    public async reload(){

        this.cache.clear();

        await this.restorePanels();

        this.emit(

            "reloaded"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.cache.clear();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public async shutdown(){

        await this.synchronize();

        this.cleanup();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
