import {
    Snowflake
} from "discord.js";

/* --------------------------------------------------------
 * API Status
 * -------------------------------------------------------- */

export enum APIStatus{

    ONLINE="ONLINE",

    OFFLINE="OFFLINE",

    MAINTENANCE="MAINTENANCE"

}

/* --------------------------------------------------------
 * API Token
 * -------------------------------------------------------- */

export interface APIToken{

    id:string;

    userId:Snowflake;

    token:string;

    name:string;

    scopes:string[];

    enabled:boolean;

    lastUsed?:number;

    expiresAt?:number;

    createdAt:number;

}

/* --------------------------------------------------------
 * API Request Log
 * -------------------------------------------------------- */

export interface APIRequestLog{

    id:string;

    method:string;

    endpoint:string;

    ip:string;

    userId?:Snowflake;

    statusCode:number;

    responseTime:number;

    timestamp:number;

}

/* --------------------------------------------------------
 * API Response
 * -------------------------------------------------------- */

export interface APIResponse<T=unknown>{

    success:boolean;

    message:string;

    data?:T;

    error?:string;

    timestamp:number;

}

/* --------------------------------------------------------
 * API Rate Limit
 * -------------------------------------------------------- */

export interface APIRateLimit{

    limit:number;

    remaining:number;

    reset:number;

}

/* --------------------------------------------------------
 * API Statistics
 * -------------------------------------------------------- */

export interface APIStatistics{

    totalRequests:number;

    successfulRequests:number;

    failedRequests:number;

    activeTokens:number;

    averageResponseTime:number;

    uptime:number;

}
