import {
    Snowflake
} from "discord.js";

/* --------------------------------------------------------
 * Notification Type
 * -------------------------------------------------------- */

export enum NotificationType{

    INFO="INFO",

    SUCCESS="SUCCESS",

    WARNING="WARNING",

    ERROR="ERROR"

}

/* --------------------------------------------------------
 * Notification Channel
 * -------------------------------------------------------- */

export enum NotificationChannel{

    DIRECT_MESSAGE="DIRECT_MESSAGE",

    TEXT_CHANNEL="TEXT_CHANNEL",

    WEBHOOK="WEBHOOK"

}

/* --------------------------------------------------------
 * Notification Status
 * -------------------------------------------------------- */

export enum NotificationStatus{

    QUEUED="QUEUED",

    SENT="SENT",

    FAILED="FAILED",

    CANCELLED="CANCELLED"

}

/* --------------------------------------------------------
 * Notification
 * -------------------------------------------------------- */

export interface Notification{

    id:string;

    guildId?:Snowflake;

    recipientId?:Snowflake;

    channelId?:Snowflake;

    webhookUrl?:string;

    title:string;

    message:string;

    type:NotificationType;

    channel:NotificationChannel;

    status:NotificationStatus;

    scheduled:boolean;

    scheduledAt?:number;

    sentAt?:number;

    retries:number;

    createdAt:number;

    metadata:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Notification Template
 * -------------------------------------------------------- */

export interface NotificationTemplate{

    id:string;

    name:string;

    title:string;

    description:string;

    enabled:boolean;

    variables:string[];

}

/* --------------------------------------------------------
 * Notification Statistics
 * -------------------------------------------------------- */

export interface NotificationStatistics{

    total:number;

    queued:number;

    sent:number;

    failed:number;

    cancelled:number;

    scheduled:number;

    directMessages:number;

    channelMessages:number;

    webhookMessages:number;

}
