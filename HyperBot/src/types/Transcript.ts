import {
    Snowflake
} from "discord.js";

/* --------------------------------------------------------
 * Transcript Format
 * -------------------------------------------------------- */

export enum TranscriptFormat{

    HTML="HTML",

    JSON="JSON",

    TXT="TXT",

    PDF="PDF"

}

/* --------------------------------------------------------
 * Transcript Message
 * -------------------------------------------------------- */

export interface TranscriptMessage{

    id:Snowflake;

    authorId:Snowflake;

    authorTag:string;

    content:string;

    attachments:string[];

    embeds:number;

    timestamp:number;

}

/* --------------------------------------------------------
 * Transcript
 * -------------------------------------------------------- */

export interface Transcript{

    id:string;

    guildId:Snowflake;

    ticketId:string;

    channelId:Snowflake;

    ownerId:Snowflake;

    format:TranscriptFormat;

    fileName:string;

    filePath:string;

    fileSize:number;

    messageCount:number;

    archived:boolean;

    generatedBy:Snowflake;

    generatedAt:number;

    createdAt:number;

    messages:TranscriptMessage[];

    metadata:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Transcript Creation Options
 * -------------------------------------------------------- */

export interface CreateTranscriptOptions{

    ticketId:string;

    channelId:Snowflake;

    ownerId:Snowflake;

    format?:TranscriptFormat;

    includeAttachments?:boolean;

    includeEmbeds?:boolean;

}

/* --------------------------------------------------------
 * Transcript Statistics
 * -------------------------------------------------------- */

export interface TranscriptStatistics{

    total:number;

    html:number;

    json:number;

    txt:number;

    pdf:number;

    archived:number;

    totalMessages:number;

    totalSize:number;

}
