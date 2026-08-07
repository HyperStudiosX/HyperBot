import {
    Client,
    EmbedBuilder,
    Guild,
    GuildMember,
    Snowflake,
    TextChannel,
    User,
    WebhookClient
} from "discord.js";

import { EventEmitter } from "events";

import { NotificationManager } from "../managers/NotificationManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { AuditManager } from "../managers/AuditManager";
import { CacheManager } from "../managers/CacheManager";

export class NotificationService extends EventEmitter{

    private readonly client:Client;

    private readonly notifications:NotificationManager;

    private readonly database:DatabaseManager;

    private readonly audits:AuditManager;

    private readonly cache:CacheManager;

    constructor(

        client:Client,

        notifications:NotificationManager,

        database:DatabaseManager,

        audits:AuditManager,

        cache:CacheManager

    ){

        super();

        this.client=client;

        this.notifications=notifications;

        this.database=database;

        this.audits=audits;

        this.cache=cache;

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    public async initialize(){

        await this.restoreQueue();

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Restore Queue
     * -------------------------------------------------------- */

    private async restoreQueue(){

        const queue=

            await this.database.getNotifications();

        for(

            const notification

            of

            queue

        ){

            this.notifications.enqueue(

                notification

            );

        }

        this.emit(

            "queueRestored",

            queue.length

        );

    }

    /* --------------------------------------------------------
     * Send Direct Message
     * -------------------------------------------------------- */

    public async sendDM(

        user:User,

        title:string,

        description:string

    ){

        const embed=

            this.notifications.buildEmbed(

                title,

                description

            );

        await this.notifications.sendDM(

            user,

            embed

        );

        this.audits.logSystem(

            "0",

            "SEND_DM",

            {

                userId:

                    user.id

            }

        );

        this.emit(

            "dmSent",

            user.id

        );

    }

    /* --------------------------------------------------------
     * Send Channel Message
     * -------------------------------------------------------- */

    public async sendChannel(

        channel:TextChannel,

        title:string,

        description:string

    ){

        const embed=

            this.notifications.buildEmbed(

                title,

                description

            );

        await this.notifications.sendChannel(

            channel,

            {

                embeds:[

                    embed

                ]

            }

        );

        this.emit(

            "channelNotification",

            channel.id

        );

    }

    /* --------------------------------------------------------
     * Send Webhook
     * -------------------------------------------------------- */

    public async sendWebhook(

        webhook:WebhookClient,

        title:string,

        description:string

    ){

        const embed=

            this.notifications.buildEmbed(

                title,

                description

            );

        await webhook.send({

            embeds:[

                embed

            ]

        });

        this.emit(

            "webhookNotification"

        );

  }
      /* --------------------------------------------------------
     * Broadcast to Guild
     * -------------------------------------------------------- */

    public async broadcastGuild(

        guild:Guild,

        title:string,

        description:string

    ){

        const embed=

            this.notifications.buildEmbed(

                title,

                description

            );

        for(

            const [

                ,

                channel

            ]

            of

            guild.channels.cache

        ){

            if(

                channel instanceof

                TextChannel

            ){

                try{

                    await this.notifications.sendChannel(

                        channel,

                        {

                            embeds:[

                                embed

                            ]

                        }

                    );

                }

                catch{

                    continue;

                }

            }

        }

        this.emit(

            "guildBroadcast",

            guild.id

        );

    }

    /* --------------------------------------------------------
     * Broadcast to Users
     * -------------------------------------------------------- */

    public async broadcastUsers(

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

            "userBroadcast",

            users.length

        );

    }

    /* --------------------------------------------------------
     * Queue Notification
     * -------------------------------------------------------- */

    public async queue(

        notification:any

    ){

        this.notifications.enqueue(

            notification

        );

        await this.database.saveNotification(

            notification

        );

        this.emit(

            "notificationQueued",

            notification.id

        );

    }

    /* --------------------------------------------------------
     * Process Queue
     * -------------------------------------------------------- */

    public async processQueue(){

        while(

            this.notifications

                .getQueue()

                .length>

            0

        ){

            const notification=

                this.notifications.dequeue();

            if(

                !notification

            ){

                break;

            }

            await this.database.updateNotification(

                notification

            );

        }

        this.emit(

            "queueProcessed"

        );

    }

    /* --------------------------------------------------------
     * Schedule Notification
     * -------------------------------------------------------- */

    public schedule(

        id:string,

        delay:number,

        callback:()=>Promise<void>

    ){

        this.notifications.schedule(

            id,

            delay,

            callback

        );

        this.emit(

            "notificationScheduled",

            id

        );

    }

    /* --------------------------------------------------------
     * Cancel Scheduled Notification
     * -------------------------------------------------------- */

    public cancelSchedule(

        id:string

    ){

        return this.notifications.cancelSchedule(

            id

        );

    }
      /* --------------------------------------------------------
     * Retry Notification
     * -------------------------------------------------------- */

    public async retry(

        notificationId:string,

        callback:()=>Promise<void>

    ){

        const result=

            await this.notifications.retry(

                notificationId,

                callback

            );

        this.emit(

            "notificationRetried",

            notificationId,

            result

        );

        return result;

    }

    /* --------------------------------------------------------
     * Notification Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return this.notifications.getStatistics();

    }

    /* --------------------------------------------------------
     * Create Template
     * -------------------------------------------------------- */

    public createTemplate(

        name:string,

        title:string,

        description:string

    ){

        this.notifications.createTemplate(

            name,

            {

                title,

                description

            }

        );

        this.emit(

            "templateCreated",

            name

        );

    }

    /* --------------------------------------------------------
     * Send Reminder
     * -------------------------------------------------------- */

    public async sendReminder(

        user:User,

        title:string,

        description:string

    ){

        const embed=

            this.notifications.buildEmbed(

                title,

                description

            );

        await this.notifications.sendDM(

            user,

            embed

        );

        this.audits.logSystem(

            "0",

            "SEND_REMINDER",

            {

                userId:

                    user.id

            }

        );

        this.emit(

            "reminderSent",

            user.id

        );

    }

    /* --------------------------------------------------------
     * Export Notifications
     * -------------------------------------------------------- */

    public exportNotifications(){

        return this.notifications.exportNotifications();

    }

    /* --------------------------------------------------------
     * Import Notifications
     * -------------------------------------------------------- */

    public importNotifications(

        notifications:any[]

    ){

        this.notifications.importNotifications(

            notifications

        );

        this.emit(

            "notificationsImported",

            notifications.length

        );

    }
      /* --------------------------------------------------------
     * Synchronize Notifications
     * -------------------------------------------------------- */

    public async synchronize(){

        const notifications=

            this.notifications.exportNotifications();

        for(

            const notification

            of

            notifications

        ){

            await this.database.updateNotification(

                notification

            );

        }

        this.emit(

            "notificationsSynchronized",

            notifications.length

        );

    }

    /* --------------------------------------------------------
     * Analytics
     * -------------------------------------------------------- */

    public getAnalytics(){

        const statistics=

            this.notifications.getStatistics();

        return{

            total:

                statistics.stored,

            queued:

                statistics.queued,

            sent:

                statistics.sent,

            failed:

                statistics.failed,

            scheduled:

                statistics.scheduled,

            pending:

                statistics.pending,

            directMessages:

                statistics.directMessages,

            channelMessages:

                statistics.channelMessages,

            webhookMessages:

                statistics.webhookMessages

        };

    }

    /* --------------------------------------------------------
     * Reload
     * -------------------------------------------------------- */

    public async reload(){

        this.notifications.clear();

        await this.restoreQueue();

        this.emit(

            "reloaded"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.notifications.cleanup();

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
