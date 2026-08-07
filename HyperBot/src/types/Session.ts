import {
    Snowflake
} from "discord.js";

/* --------------------------------------------------------
 * Session Status
 * -------------------------------------------------------- */

export enum SessionStatus{

    ACTIVE="ACTIVE",

    EXPIRED="EXPIRED",

    REVOKED="REVOKED"

}

/* --------------------------------------------------------
 * Session Device
 * -------------------------------------------------------- */

export interface SessionDevice{

    platform:string;

    browser:string;

    operatingSystem:string;

    ipAddress:string;

    userAgent:string;

}

/* --------------------------------------------------------
 * Session
 * -------------------------------------------------------- */

export interface Session{

    id:string;

    userId:Snowflake;

    guildId?:Snowflake;

    status:SessionStatus;

    accessToken:string;

    refreshToken?:string;

    device:SessionDevice;

    lastAccess:number;

    expiresAt:number;

    createdAt:number;

    updatedAt:number;

    metadata:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Session Creation Options
 * -------------------------------------------------------- */

export interface CreateSessionOptions{

    userId:Snowflake;

    guildId?:Snowflake;

    accessToken:string;

    refreshToken?:string;

    expiresAt:number;

    device:SessionDevice;

}

/* --------------------------------------------------------
 * Session Statistics
 * -------------------------------------------------------- */

export interface SessionStatistics{

    total:number;

    active:number;

    expired:number;

    revoked:number;

}
