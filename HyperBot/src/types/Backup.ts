import {
    Snowflake
} from "discord.js";

/* --------------------------------------------------------
 * Backup Status
 * -------------------------------------------------------- */

export enum BackupStatus{

    CREATING="CREATING",

    COMPLETED="COMPLETED",

    FAILED="FAILED",

    RESTORED="RESTORED"

}

/* --------------------------------------------------------
 * Backup Format
 * -------------------------------------------------------- */

export enum BackupFormat{

    JSON="JSON",

    ZIP="ZIP"

}

/* --------------------------------------------------------
 * Backup
 * -------------------------------------------------------- */

export interface Backup{

    id:string;

    guildId:Snowflake;

    status:BackupStatus;

    format:BackupFormat;

    fileName:string;

    filePath:string;

    fileSize:number;

    checksum:string;

    tickets:number;

    panels:number;

    transcripts:number;

    createdBy:Snowflake;

    createdAt:number;

    restoredAt?:number;

    metadata:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Backup Creation Options
 * -------------------------------------------------------- */

export interface CreateBackupOptions{

    guildId:Snowflake;

    format?:BackupFormat;

    includeTickets?:boolean;

    includePanels?:boolean;

    includeTranscripts?:boolean;

}

/* --------------------------------------------------------
 * Backup Statistics
 * -------------------------------------------------------- */

export interface BackupStatistics{

    total:number;

    completed:number;

    failed:number;

    restored:number;

    totalSize:number;

}
