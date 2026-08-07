import {
    Snowflake
} from "discord.js";

/* --------------------------------------------------------
 * Dashboard Status
 * -------------------------------------------------------- */

export enum DashboardStatus{

    ONLINE="ONLINE",

    OFFLINE="OFFLINE",

    MAINTENANCE="MAINTENANCE"

}

/* --------------------------------------------------------
 * Dashboard Widget
 * -------------------------------------------------------- */

export interface DashboardWidget{

    id:string;

    type:string;

    title:string;

    enabled:boolean;

    position:number;

    settings:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Dashboard Settings
 * -------------------------------------------------------- */

export interface DashboardSettings{

    theme:string;

    language:string;

    timezone:string;

    notifications:boolean;

    autoRefresh:boolean;

    refreshInterval:number;

}

/* --------------------------------------------------------
 * Dashboard
 * -------------------------------------------------------- */

export interface Dashboard{

    guildId:Snowflake;

    name:string;

    description:string;

    status:DashboardStatus;

    enabled:boolean;

    widgets:DashboardWidget[];

    settings:DashboardSettings;

    admins:Snowflake[];

    viewers:Snowflake[];

    lastOpened:number;

    lastRefresh:number;

    createdAt:number;

    updatedAt:number;

    metadata:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Dashboard Creation Options
 * -------------------------------------------------------- */

export interface CreateDashboardOptions{

    guildId:Snowflake;

    name:string;

    description?:string;

    enabled?:boolean;

}

/* --------------------------------------------------------
 * Dashboard Statistics
 * -------------------------------------------------------- */

export interface DashboardStatistics{

    total:number;

    online:number;

    offline:number;

    maintenance:number;

    totalWidgets:number;

    activeSessions:number;

}
