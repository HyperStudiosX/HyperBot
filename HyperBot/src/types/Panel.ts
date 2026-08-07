import {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    Snowflake,
    StringSelectMenuBuilder
} from "discord.js";

/* --------------------------------------------------------
 * Panel Status
 * -------------------------------------------------------- */

export enum PanelStatus{

    ENABLED="ENABLED",

    DISABLED="DISABLED",

    ARCHIVED="ARCHIVED"

}

/* --------------------------------------------------------
 * Panel Button
 * -------------------------------------------------------- */

export interface PanelButton{

    id:string;

    label:string;

    emoji?:string;

    style:number;

    category:string;

    disabled:boolean;

}

/* --------------------------------------------------------
 * Panel Select Option
 * -------------------------------------------------------- */

export interface PanelSelectOption{

    label:string;

    value:string;

    description?:string;

    emoji?:string;

}

/* --------------------------------------------------------
 * Panel
 * -------------------------------------------------------- */

export interface Panel{

    id:string;

    guildId:Snowflake;

    channelId:Snowflake;

    messageId?:Snowflake;

    name:string;

    description:string;

    category:string;

    status:PanelStatus;

    embed:EmbedBuilder;

    buttons:PanelButton[];

    selectOptions:PanelSelectOption[];

    components:(
        ActionRowBuilder<ButtonBuilder>|
        ActionRowBuilder<StringSelectMenuBuilder>
    )[];

    allowedRoles:Snowflake[];

    deniedRoles:Snowflake[];

    ticketLimit:number;

    enabled:boolean;

    createdBy:Snowflake;

    createdAt:number;

    updatedAt:number;

    metadata:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Panel Creation Options
 * -------------------------------------------------------- */

export interface CreatePanelOptions{

    guildId:Snowflake;

    channelId:Snowflake;

    name:string;

    description?:string;

    category?:string;

    ticketLimit?:number;

}

/* --------------------------------------------------------
 * Panel Statistics
 * -------------------------------------------------------- */

export interface PanelStatistics{

    total:number;

    enabled:number;

    disabled:number;

    archived:number;

    totalButtons:number;

    totalSelectMenus:number;

}
