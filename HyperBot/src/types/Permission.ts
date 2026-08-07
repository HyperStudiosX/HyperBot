import {
    Snowflake
} from "discord.js";

/* --------------------------------------------------------
 * Permission Target
 * -------------------------------------------------------- */

export enum PermissionTarget{

    USER="USER",

    ROLE="ROLE",

    EVERYONE="EVERYONE"

}

/* --------------------------------------------------------
 * Permission Effect
 * -------------------------------------------------------- */

export enum PermissionEffect{

    ALLOW="ALLOW",

    DENY="DENY"

}

/* --------------------------------------------------------
 * Permission Node
 * -------------------------------------------------------- */

export interface PermissionNode{

    id:string;

    node:string;

    description:string;

    default:boolean;

}

/* --------------------------------------------------------
 * Permission Entry
 * -------------------------------------------------------- */

export interface Permission{

    id:string;

    targetId:Snowflake;

    targetType:PermissionTarget;

    node:string;

    effect:PermissionEffect;

    inherited:boolean;

    expiresAt?:number;

    createdBy:Snowflake;

    createdAt:number;

    updatedAt:number;

    metadata:Record<string,unknown>;

}

/* --------------------------------------------------------
 * Permission Override
 * -------------------------------------------------------- */

export interface PermissionOverride{

    id:string;

    targetId:Snowflake;

    node:string;

    allowed:boolean;

    reason?:string;

    createdBy:Snowflake;

    createdAt:number;

}

/* --------------------------------------------------------
 * Permission Statistics
 * -------------------------------------------------------- */

export interface PermissionStatistics{

    total:number;

    userPermissions:number;

    rolePermissions:number;

    inheritedPermissions:number;

    overrides:number;

}
