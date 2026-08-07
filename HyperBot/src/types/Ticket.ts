import {
    Snowflake
} from "discord.js";

/* --------------------------------------------------------
 * Ticket Status
 * -------------------------------------------------------- */

export enum TicketStatus{

    OPEN="OPEN",

    CLAIMED="CLAIMED",

    PENDING="PENDING",

    CLOSED="CLOSED",

    LOCKED="LOCKED",

    ARCHIVED="ARCHIVED"

}

/* --------------------------------------------------------
 * Ticket Priority
 * -------------------------------------------------------- */

export enum TicketPriority{

    LOW="LOW",

    MEDIUM="MEDIUM",

    HIGH="HIGH",

    URGENT="URGENT"

}

/* --------------------------------------------------------
 * Ticket Type
 * -------------------------------------------------------- */

export interface Ticket{

    id:string;

    guildId:Snowflake;

    channelId:Snowflake;

    ownerId:Snowflake;

    panelId:string;

    category:string;

    subject:string;

    description:string;

    status:TicketStatus;

    priority:TicketPriority;

    claimedBy?:Snowflake;

    closedBy?:Snowflake;

    locked:boolean;

    archived:boolean;

    tags:string[];

    participants:Snowflake[];

    transcriptId?:string;

    createdAt:number;

    updatedAt:number;

    closedAt?:number;

    metadata:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Ticket Creation Options
 * -------------------------------------------------------- */

export interface CreateTicketOptions{

    guildId:Snowflake;

    ownerId:Snowflake;

    panelId:string;

    subject:string;

    description?:string;

    category?:string;

    priority?:TicketPriority;

    tags?:string[];

}

/* --------------------------------------------------------
 * Ticket Update Options
 * -------------------------------------------------------- */

export interface UpdateTicketOptions{

    subject?:string;

    description?:string;

    category?:string;

    priority?:TicketPriority;

    status?:TicketStatus;

    claimedBy?:Snowflake;

    locked?:boolean;

    archived?:boolean;

    tags?:string[];

}

/* --------------------------------------------------------
 * Ticket Statistics
 * -------------------------------------------------------- */

export interface TicketStatistics{

    total:number;

    open:number;

    claimed:number;

    pending:number;

    closed:number;

    locked:number;

    archived:number;

}
