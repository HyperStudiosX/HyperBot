import {
    Snowflake
} from "discord.js";

import {
    Notification,
    NotificationStatistics,
    NotificationTemplate
} from "../types/Notification";

export interface NotificationService{

    /* --------------------------------------------------------
     * Notifications
     * -------------------------------------------------------- */

    send(

        notification:Notification

    ):Promise<boolean>;

    schedule(

        notification:Notification,

        timestamp:number

    ):Promise<void>;

    cancel(

        notificationId:string

    ):Promise<boolean>;

    retry(

        notificationId:string

    ):Promise<boolean>;

    /* --------------------------------------------------------
     * Templates
     * -------------------------------------------------------- */

    registerTemplate(

        template:NotificationTemplate

    ):void;

    getTemplate(

        id:string

    ):NotificationTemplate|undefined;

    getTemplates():NotificationTemplate[];

    /* --------------------------------------------------------
     * Queue
     * -------------------------------------------------------- */

    clearQueue():void;

    queueSize():number;

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    getStatistics():NotificationStatistics;

}
