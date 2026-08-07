import {
    Client,
    Guild,
    GuildMember,
    PermissionFlagsBits,
    Role,
    Snowflake,
    User
} from "discord.js";

import { EventEmitter } from "events";

import { PermissionManager } from "../managers/PermissionManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { AuditManager } from "../managers/AuditManager";
import { CacheManager } from "../managers/CacheManager";

export class PermissionService extends EventEmitter{

    private readonly client:Client;

    private readonly permissions:PermissionManager;

    private readonly database:DatabaseManager;

    private readonly audits:AuditManager;

    private readonly cache:CacheManager;

    constructor(

        client:Client,

        permissions:PermissionManager,

        database:DatabaseManager,

        audits:AuditManager,

        cache:CacheManager

    ){

        super();

        this.client=client;

        this.permissions=permissions;

        this.database=database;

        this.audits=audits;

        this.cache=cache;

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    public async initialize(){

        await this.restorePermissions();

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Restore Permissions
     * -------------------------------------------------------- */

    private async restorePermissions(){

        const permissions=

            await this.database.getPermissions();

        for(

            const permission

            of

            permissions

        ){

            this.permissions.register(

                permission

            );

        }

        this.emit(

            "permissionsRestored",

            permissions.length

        );

    }

    /* --------------------------------------------------------
     * Check Permission
     * -------------------------------------------------------- */

    public async hasPermission(

        member:GuildMember,

        node:string

    ){

        if(

            member.permissions.has(

                PermissionFlagsBits.Administrator

            )

        ){

            return true;

        }

        return this.permissions.has(

            member,

            node

        );

    }

    /* --------------------------------------------------------
     * Grant Permission
     * -------------------------------------------------------- */

    public async grant(

        target:Snowflake,

        node:string

    ){

        this.permissions.grant(

            target,

            node

        );

        await this.database.savePermission({

            target,

            node

        });

        this.emit(

            "permissionGranted",

            target,

            node

        );

    }

    /* --------------------------------------------------------
     * Revoke Permission
     * -------------------------------------------------------- */

    public async revoke(

        target:Snowflake,

        node:string

    ){

        this.permissions.revoke(

            target,

            node

        );

        await this.database.deletePermission(

            target,

            node

        );

        this.emit(

            "permissionRevoked",

            target,

            node

        );

    }

    /* --------------------------------------------------------
     * Sync Member
     * -------------------------------------------------------- */

    public async synchronizeMember(

        member:GuildMember

    ){

        this.cache.set(

            member.id,

            member.permissions

        );

        this.emit(

            "memberSynchronized",

            member.id

        );

    }
      /* --------------------------------------------------------
     * Synchronize Role
     * -------------------------------------------------------- */

    public async synchronizeRole(

        role:Role

    ){

        this.cache.set(

            role.id,

            role.permissions

        );

        this.emit(

            "roleSynchronized",

            role.id

        );

    }

    /* --------------------------------------------------------
     * Add Role Permission
     * -------------------------------------------------------- */

    public async grantRole(

        role:Role,

        node:string

    ){

        this.permissions.grant(

            role.id,

            node

        );

        await this.database.savePermission({

            target:

                role.id,

            node

        });

        this.audits.logSystem(

            "0",

            "ROLE_PERMISSION_GRANTED",

            {

                roleId:

                    role.id,

                node

            }

        );

        this.emit(

            "rolePermissionGranted",

            role.id,

            node

        );

    }

    /* --------------------------------------------------------
     * Remove Role Permission
     * -------------------------------------------------------- */

    public async revokeRole(

        role:Role,

        node:string

    ){

        this.permissions.revoke(

            role.id,

            node

        );

        await this.database.deletePermission(

            role.id,

            node

        );

        this.emit(

            "rolePermissionRevoked",

            role.id,

            node

        );

    }

    /* --------------------------------------------------------
     * Validate Permission
     * -------------------------------------------------------- */

    public validate(

        node:string

    ){

        return /^[a-z0-9.*_-]+$/i.test(

            node

        );

    }

    /* --------------------------------------------------------
     * Member Permission List
     * -------------------------------------------------------- */

    public getMemberPermissions(

        member:GuildMember

    ){

        return this.permissions.getAll(

            member.id

        );

    }

    /* --------------------------------------------------------
     * Role Permission List
     * -------------------------------------------------------- */

    public getRolePermissions(

        role:Role

    ){

        return this.permissions.getAll(

            role.id

        );

    }
      /* --------------------------------------------------------
     * Resolve Inherited Permissions
     * -------------------------------------------------------- */

    public resolvePermissions(

        member:GuildMember

    ){

        const resolved=

            new Set<string>();

        for(

            const role

            of

            member.roles.cache.values()

        ){

            const permissions=

                this.permissions.getAll(

                    role.id

                );

            for(

                const node

                of

                permissions

            ){

                resolved.add(

                    node

                );

            }

        }

        const memberPermissions=

            this.permissions.getAll(

                member.id

            );

        for(

            const node

            of

            memberPermissions

        ){

            resolved.add(

                node

            );

        }

        return Array.from(

            resolved

        );

    }

    /* --------------------------------------------------------
     * Set Override
     * -------------------------------------------------------- */

    public async setOverride(

        target:Snowflake,

        node:string,

        allowed:boolean

    ){

        await this.database.savePermissionOverride({

            target,

            node,

            allowed

        });

        this.emit(

            "permissionOverride",

            target,

            node,

            allowed

        );

    }

    /* --------------------------------------------------------
     * Remove Override
     * -------------------------------------------------------- */

    public async removeOverride(

        target:Snowflake,

        node:string

    ){

        await this.database.deletePermissionOverride(

            target,

            node

        );

        this.emit(

            "permissionOverrideRemoved",

            target,

            node

        );

    }

    /* --------------------------------------------------------
     * Export Permissions
     * -------------------------------------------------------- */

    public exportPermissions(){

        return this.permissions.exportPermissions();

    }

    /* --------------------------------------------------------
     * Import Permissions
     * -------------------------------------------------------- */

    public async importPermissions(

        permissions:any[]

    ){

        for(

            const permission

            of

            permissions

        ){

            this.permissions.register(

                permission

            );

        }

        this.emit(

            "permissionsImported",

            permissions.length

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return this.permissions.getStatistics();

    }
      /* --------------------------------------------------------
     * Synchronize Permissions
     * -------------------------------------------------------- */

    public async synchronize(){

        const permissions=

            this.permissions.exportPermissions();

        for(

            const permission

            of

            permissions

        ){

            await this.database.savePermission(

                permission

            );

        }

        this.emit(

            "permissionsSynchronized",

            permissions.length

        );

    }

    /* --------------------------------------------------------
     * Reload
     * -------------------------------------------------------- */

    public async reload(){

        this.cache.clear();

        this.permissions.clear();

        await this.restorePermissions();

        this.emit(

            "reloaded"

        );

    }

    /* --------------------------------------------------------
     * Clear Cache
     * -------------------------------------------------------- */

    public clearCache(){

        this.cache.clear();

        this.emit(

            "cacheCleared"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.clearCache();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public async shutdown(){

        await this.synchronize();

        this.cleanup();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
