import {
    Client,
    EmbedBuilder,
    GuildMember,
    MessageCreateOptions,
    Snowflake,
    TextChannel,
    User,
    WebhookClient
} from "discord.js";

import { EventEmitter } from "events";

export interface Notification{

    id:string;

    type:
        |"dm"
        |"channel"
        |"webhook"
        |"dashboard"
        |"email";

    title:string;

    content:string;

    created:number;

    sender:string;

    recipient:string;

    sent:boolean;

    metadata:Record<string,any>;

}

export class NotificationManager extends EventEmitter{

    private readonly client:Client;

    private readonly notifications=

        new Map<
            string,
            Notification
        >();

    private statistics={

        created:0,

        sent:0,

        failed:0,

        queued:0,

        webhook:0,

        directMessages:0,

        channelMessages:0

    };

    constructor(

        client:Client

    ){

        super();

        this.client=client;

    }

    /* --------------------------------------------------------
     * Create Notification
     * -------------------------------------------------------- */

    public create(

        notification:Notification

    ){

        this.notifications.set(

            notification.id,

            notification

        );

        this.statistics.created++;

        this.statistics.queued++;

        this.emit(

            "notificationCreate",

            notification

        );

        return notification;

    }

    /* --------------------------------------------------------
     * Lookup
     * -------------------------------------------------------- */

    public get(

        id:string

    ){

        return this.notifications.get(

            id

        );

    }

    public getAll(){

        return Array.from(

            this.notifications.values()

        );

    }

    public delete(

        id:string

    ){

        this.notifications.delete(

            id

        );

        this.emit(

            "notificationDelete",

            id

        );

    }

    /* --------------------------------------------------------
     * Direct Message
     * -------------------------------------------------------- */

    public async sendDM(

        user:User,

        embed:EmbedBuilder

    ){

        try{

            await user.send({

                embeds:[

                    embed

                ]

            });

            this.statistics.sent++;

            this.statistics.directMessages++;

            this.emit(

                "dmSent",

                user.id

            );

        }

        catch(error){

            this.statistics.failed++;

            this.emit(

                "dmFailed",

                user.id,

                error

            );

        }

    }

    /* --------------------------------------------------------
     * Channel Message
     * -------------------------------------------------------- */

    public async sendChannel(

        channel:TextChannel,

        options:MessageCreateOptions

    ){

        try{

            await channel.send(

                options

            );

            this.statistics.sent++;

            this.statistics.channelMessages++;

            this.emit(

                "channelMessage",

                channel.id

            );

        }

        catch(error){

            this.statistics.failed++;

            this.emit(

                "channelFailed",

                channel.id,

                error

            );

        }

    }

    /* --------------------------------------------------------
     * Webhook Message
     * -------------------------------------------------------- */

    public async sendWebhook(

        webhook:WebhookClient,

        options:MessageCreateOptions

    ){

        try{

            await webhook.send(

                options

            );

            this.statistics.sent++;

            this.statistics.webhook++;

            this.emit(

                "webhookSent"

            );

        }

        catch(error){

            this.statistics.failed++;

            this.emit(

                "webhookFailed",

                error

            );

        }

    }

    /* --------------------------------------------------------
     * Embed Builder
     * -------------------------------------------------------- */

    public buildEmbed(

        title:string,

        description:string,

        color:number=

            0x5865F2

    ){

        return new EmbedBuilder()

            .setTitle(

                title

            )

            .setDescription(

                description

            )

            .setColor(

                color

            )

            .setTimestamp();

    }
      /* --------------------------------------------------------
     * Notification Queue
     * -------------------------------------------------------- */

    private readonly queue:

        Notification[]=[];

    public enqueue(

        notification:Notification

    ){

        this.queue.push(

            notification

        );

        this.statistics.queued++;

        this.emit(

            "notificationQueued",

            notification.id

        );

    }

    public dequeue(){

        const notification=

            this.queue.shift();

        if(

            notification

        ){

            this.statistics.queued--;

        }

        return notification;

    }

    public getQueue(){

        return[

            ...this.queue

        ];

    }

    /* --------------------------------------------------------
     * Bulk Notifications
     * -------------------------------------------------------- */

    public async sendBulkDM(

        users:User[],

        embed:EmbedBuilder

    ){

        for(

            const user

            of

            users

        ){

            await this.sendDM(

                user,

                embed

            );

        }

        this.emit(

            "bulkDMSent",

            users.length

        );

    }

    public async sendBulkChannel(

        channels:TextChannel[],

        options:MessageCreateOptions

    ){

        for(

            const channel

            of

            channels

        ){

            await this.sendChannel(

                channel,

                options

            );

        }

        this.emit(

            "bulkChannelSent",

            channels.length

        );

    }

    /* --------------------------------------------------------
     * Dashboard Notifications
     * -------------------------------------------------------- */

    private readonly dashboard=

        new Map<
            Snowflake,
            Notification[]
        >();

    public addDashboardNotification(

        userId:Snowflake,

        notification:Notification

    ){

        const list=

            this.dashboard.get(

                userId

            )??

            [];

        list.push(

            notification

        );

        this.dashboard.set(

            userId,

            list

        );

        this.emit(

            "dashboardNotification",

            userId

        );

    }

    public getDashboardNotifications(

        userId:Snowflake

    ){

        return this.dashboard.get(

            userId

        )??

        [];

    }

    public clearDashboardNotifications(

        userId:Snowflake

    ){

        this.dashboard.delete(

            userId

        );

        this.emit(

            "dashboardClear",

            userId

        );

    }

    /* --------------------------------------------------------
     * Notification Templates
     * -------------------------------------------------------- */

    private readonly templates=

        new Map<
            string,
            EmbedBuilder
        >();

    public registerTemplate(

        name:string,

        embed:EmbedBuilder

    ){

        this.templates.set(

            name,

            embed

        );

        this.emit(

            "templateRegister",

            name

        );

    }

    public getTemplate(

        name:string

    ){

        return this.templates.get(

            name

        );

    }

    public hasTemplate(

        name:string

    ){

        return this.templates.has(

            name

        );

    }
      /* --------------------------------------------------------
     * Retry System
     * -------------------------------------------------------- */

    private readonly retries=

        new Map<
            string,
            number
        >();

    public async retry(

        id:string,

        callback:()=>Promise<void>,

        maxRetries:number=3

    ){

        const current=

            this.retries.get(

                id

            )??0;

        try{

            await callback();

            this.retries.delete(

                id

            );

            this.emit(

                "notificationRetrySuccess",

                id

            );

            return true;

        }

        catch(error){

            if(

                current>=

                maxRetries

            ){

                this.statistics.failed++;

                this.emit(

                    "notificationRetryFailed",

                    id,

                    error

                );

                return false;

            }

            this.retries.set(

                id,

                current+1

            );

            this.emit(

                "notificationRetry",

                id,

                current+1

            );

            return false;

        }

    }

    /* --------------------------------------------------------
     * Scheduled Notifications
     * -------------------------------------------------------- */

    private readonly scheduled=

        new Map<
            string,
            NodeJS.Timeout
        >();

    public schedule(

        id:string,

        delay:number,

        callback:()=>Promise<void>|void

    ){

        const timeout=

            setTimeout(

                async()=>{

                    await callback();

                    this.scheduled.delete(

                        id

                    );

                    this.emit(

                        "notificationExecuted",

                        id

                    );

                },

                delay

            );

        this.scheduled.set(

            id,

            timeout

        );

        this.emit(

            "notificationScheduled",

            id

        );

    }

    public cancelSchedule(

        id:string

    ){

        const timeout=

            this.scheduled.get(

                id

            );

        if(

            !timeout

        ){

            return false;

        }

        clearTimeout(

            timeout

        );

        this.scheduled.delete(

            id

        );

        this.emit(

            "notificationCancelled",

            id

        );

        return true;

    }

    /* --------------------------------------------------------
     * Rate Limiting
     * -------------------------------------------------------- */

    private readonly rateLimits=

        new Map<
            string,
            number
        >();

    public canSend(

        key:string,

        interval:number=

            5000

    ){

        const last=

            this.rateLimits.get(

                key

            )??0;

        if(

            Date.now()-last<

            interval

        ){

            return false;

        }

        this.rateLimits.set(

            key,

            Date.now()

        );

        return true;

    }

    /* --------------------------------------------------------
     * Delivery Tracking
     * -------------------------------------------------------- */

    public markDelivered(

        id:string

    ){

        const notification=

            this.get(

                id

            );

        if(

            !notification

        ){

            return false;

        }

        notification.sent=true;

        notification.metadata.delivered=

            Date.now();

        this.emit(

            "notificationDelivered",

            id

        );

        return true;

    }

    public getPending(){

        return this.getAll().filter(

            notification=>

                !notification.sent

        );

    }
      /* --------------------------------------------------------
     * Export Notifications
     * -------------------------------------------------------- */

    public exportNotifications(){

        return this.getAll();

    }

    /* --------------------------------------------------------
     * Import Notifications
     * -------------------------------------------------------- */

    public importNotifications(

        notifications:Notification[]

    ){

        for(

            const notification

            of

            notifications

        ){

            this.notifications.set(

                notification.id,

                notification

            );

        }

        this.emit(

            "notificationsImported",

            notifications.length

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            created:

                this.statistics.created,

            sent:

                this.statistics.sent,

            failed:

                this.statistics.failed,

            queued:

                this.queue.length,

            directMessages:

                this.statistics.directMessages,

            channelMessages:

                this.statistics.channelMessages,

            webhookMessages:

                this.statistics.webhook,

            scheduled:

                this.scheduled.size,

            dashboardNotifications:

                this.dashboard.size,

            templates:

                this.templates.size,

            pending:

                this.getPending().length,

            stored:

                this.notifications.size

        };

    }

    public resetStatistics(){

        this.statistics={

            created:0,

            sent:0,

            failed:0,

            queued:0,

            webhook:0,

            directMessages:0,

            channelMessages:0

        };

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        for(

            const timeout

            of

            this.scheduled.values()

        ){

            clearTimeout(

                timeout

            );

        }

        this.scheduled.clear();

        this.retries.clear();

        this.rateLimits.clear();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Clear All
     * -------------------------------------------------------- */

    public clear(){

        this.notifications.clear();

        this.queue.length=0;

        this.dashboard.clear();

        this.templates.clear();

        this.emit(

            "notificationsCleared"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        this.clear();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
