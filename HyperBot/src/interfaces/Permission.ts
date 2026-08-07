import {
    GuildMember,
    Role,
    Snowflake
} from "discord.js";

import {
    Permission,
    PermissionNode,
    PermissionOverride,
    PermissionStatistics
} from "../types/Permission";

export interface PermissionService{

    /* --------------------------------------------------------
     * Permission Management
     * -------------------------------------------------------- */

    grant(

        permission:Permission

    ):Promise<void>;

    revoke(

        permissionId:string

    ):Promise<void>;

    update(

        permissionId:string,

        data:Partial<Permission>

    ):Promise<Permission>;

    /* --------------------------------------------------------
     * Permission Checks
     * -------------------------------------------------------- */

    has(

        member:GuildMember,

        node:string

    ):boolean;

    hasRole(

        role:Role,

        node:string

    ):boolean;

    /* --------------------------------------------------------
     * Permission Nodes
     * -------------------------------------------------------- */

    registerNode(

        node:PermissionNode

    ):void;

    getNode(

        node:string

    ):PermissionNode|undefined;

    getNodes():PermissionNode[];

    /* --------------------------------------------------------
     * Overrides
     * -------------------------------------------------------- */

    addOverride(

        override:PermissionOverride

    ):Promise<void>;

    removeOverride(

        overrideId:string

    ):Promise<void>;

    getOverrides(

        targetId:Snowflake

    ):PermissionOverride[];

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    getStatistics():PermissionStatistics;

}
