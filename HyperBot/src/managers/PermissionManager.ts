import {
    ChannelType,
    Client,
    Guild,
    GuildMember,
    PermissionFlagsBits,
    PermissionsBitField,
    Role,
    TextChannel,
    User,
    OverwriteResolvable
} from "discord.js";

import { EventEmitter } from "events";

export interface PermissionProfile{

    id:string;

    name:string;

    permissions:bigint[];

    priority:number;

    inherit:string[];

}

export interface TicketPermission{

    ticketId:string;

    userId:string;

    allow:bigint[];

    deny:bigint[];

}

export class PermissionManager extends EventEmitter{

    private readonly client:Client;

    private readonly profiles=

        new Map<
            string,
            PermissionProfile
        >();

    private readonly ticketPermissions=

        new Map<
            string,
            TicketPermission[]
        >();

    private statistics={

        profiles:0,

        checks:0,

        grants:0,

        revokes:0,

        syncs:0,

        errors:0

    };

    constructor(

        client:Client

    ){

        super();

        this.client=client;

    }

    /* --------------------------------------------------------
     * Permission Profiles
     * -------------------------------------------------------- */

    public createProfile(

        profile:PermissionProfile

    ){

        this.profiles.set(

            profile.id,

            profile

        );

        this.statistics.profiles++;

        this.emit(

            "profileCreate",

            profile

        );

    }

    public deleteProfile(

        id:string

    ){

        this.profiles.delete(

            id

        );

        this.emit(

            "profileDelete",

            id

        );

    }

    public getProfile(

        id:string

    ){

        return this.profiles.get(

            id

        );

    }

    public getProfiles(){

        return Array.from(

            this.profiles.values()

        );

    }

    /* --------------------------------------------------------
     * Permission Checking
     * -------------------------------------------------------- */

    public has(

        member:GuildMember,

        permission:bigint

    ){

        this.statistics.checks++;

        return member.permissions.has(

            permission

        );

    }

    public hasAny(

        member:GuildMember,

        permissions:bigint[]

    ){

        this.statistics.checks++;

        return permissions.some(

            permission=>

                member.permissions.has(

                    permission

                )

        );

    }

    public hasAll(

        member:GuildMember,

        permissions:bigint[]

    ){

        this.statistics.checks++;

        return permissions.every(

            permission=>

                member.permissions.has(

                    permission

                )

        );

    }

    /* --------------------------------------------------------
     * Administrator
     * -------------------------------------------------------- */

    public isAdministrator(

        member:GuildMember

    ){

        return member.permissions.has(

            PermissionFlagsBits.Administrator

        );

    }

    /* --------------------------------------------------------
     * Moderation
     * -------------------------------------------------------- */

    public canManageTickets(

        member:GuildMember

    ){

        return this.hasAny(

            member,

            [

                PermissionFlagsBits.ManageChannels,

                PermissionFlagsBits.ManageGuild,

                PermissionFlagsBits.Administrator

            ]

        );

    }

    public canManagePanels(

        member:GuildMember

    ){

        return this.has(

            member,

            PermissionFlagsBits.Administrator

        );

    }

    public canViewLogs(

        member:GuildMember

    ){

        return this.hasAny(

            member,

            [

                PermissionFlagsBits.ViewAuditLog,

                PermissionFlagsBits.Administrator

            ]

        );

    }
      /* --------------------------------------------------------
     * Ticket Permissions
     * -------------------------------------------------------- */

    public addTicketPermission(

        ticketId:string,

        userId:string,

        allow:bigint[]=[],

        deny:bigint[]=[]

    ){

        const list=

            this.ticketPermissions.get(

                ticketId

            )??

            [];

        list.push({

            ticketId,

            userId,

            allow,

            deny

        });

        this.ticketPermissions.set(

            ticketId,

            list

        );

        this.statistics.grants++;

        this.emit(

            "ticketPermissionAdd",

            ticketId,

            userId

        );

    }

    public removeTicketPermission(

        ticketId:string,

        userId:string

    ){

        const list=

            this.ticketPermissions.get(

                ticketId

            );

        if(

            !list

        ){

            return;

        }

        this.ticketPermissions.set(

            ticketId,

            list.filter(

                permission=>

                    permission.userId!==

                    userId

            )

        );

        this.statistics.revokes++;

        this.emit(

            "ticketPermissionRemove",

            ticketId,

            userId

        );

    }

    public getTicketPermissions(

        ticketId:string

    ){

        return this.ticketPermissions.get(

            ticketId

        )??

        [];

    }

    /* --------------------------------------------------------
     * Channel Overwrites
     * -------------------------------------------------------- */

    public async grantChannelAccess(

        channel:TextChannel,

        user:User

    ){

        await channel.permissionOverwrites.edit(

            user.id,

            {

                ViewChannel:true,

                SendMessages:true,

                ReadMessageHistory:true,

                AttachFiles:true,

                EmbedLinks:true

            }

        );

        this.statistics.grants++;

        this.emit(

            "channelGrant",

            channel.id,

            user.id

        );

    }

    public async revokeChannelAccess(

        channel:TextChannel,

        user:User

    ){

        await channel.permissionOverwrites.delete(

            user.id

        );

        this.statistics.revokes++;

        this.emit(

            "channelRevoke",

            channel.id,

            user.id

        );

    }

    /* --------------------------------------------------------
     * Role Access
     * -------------------------------------------------------- */

    public async grantRole(

        member:GuildMember,

        role:Role

    ){

        if(

            member.roles.cache.has(

                role.id

            )

        ){

            return;

        }

        await member.roles.add(

            role

        );

        this.statistics.grants++;

        this.emit(

            "roleGrant",

            member.id,

            role.id

        );

    }

    public async revokeRole(

        member:GuildMember,

        role:Role

    ){

        if(

            !member.roles.cache.has(

                role.id

            )

        ){

            return;

        }

        await member.roles.remove(

            role

        );

        this.statistics.revokes++;

        this.emit(

            "roleRevoke",

            member.id,

            role.id

        );

    }

    /* --------------------------------------------------------
     * Bulk Channel Sync
     * -------------------------------------------------------- */

    public async synchronizeChannel(

        channel:TextChannel,

        users:User[]

    ){

        for(

            const user

            of

            users

        ){

            await this.grantChannelAccess(

                channel,

                user

            );

        }

        this.statistics.syncs++;

        this.emit(

            "channelSync",

            channel.id

        );

    }
      /* --------------------------------------------------------
     * Permission Inheritance
     * -------------------------------------------------------- */

    public getInheritedPermissions(

        profileId:string

    ):bigint[]{

        const profile=

            this.getProfile(

                profileId

            );

        if(

            !profile

        ){

            return [];

        }

        const permissions=[

            ...profile.permissions

        ];

        for(

            const inherit

            of

            profile.inherit

        ){

            const parent=

                this.getProfile(

                    inherit

                );

            if(

                !parent

            ){

                continue;

            }

            for(

                const permission

                of

                parent.permissions

            ){

                if(

                    !permissions.includes(

                        permission

                    )

                ){

                    permissions.push(

                        permission

                    );

                }

            }

        }

        return permissions;

    }

    /* --------------------------------------------------------
     * Permission Templates
     * -------------------------------------------------------- */

    public applyProfile(

        member:GuildMember,

        profileId:string

    ){

        const permissions=

            this.getInheritedPermissions(

                profileId

            );

        this.emit(

            "profileApplied",

            member.id,

            profileId,

            permissions

        );

        return permissions;

    }

    /* --------------------------------------------------------
     * Effective Permissions
     * -------------------------------------------------------- */

    public getEffectivePermissions(

        member:GuildMember,

        profileId?:string

    ){

        const effective=

            new Set<bigint>();

        for(

            const permission

            of

            member.permissions.toArray()

        ){

            effective.add(

                permission

            );

        }

        if(

            profileId

        ){

            for(

                const permission

                of

                this.getInheritedPermissions(

                    profileId

                )

            ){

                effective.add(

                    permission

                );

            }

        }

        return Array.from(

            effective

        );

    }

    /* --------------------------------------------------------
     * Ticket Participants
     * -------------------------------------------------------- */

    public async addParticipant(

        channel:TextChannel,

        member:GuildMember

    ){

        await channel.permissionOverwrites.edit(

            member.id,

            {

                ViewChannel:true,

                SendMessages:true,

                ReadMessageHistory:true,

                AttachFiles:true,

                EmbedLinks:true,

                AddReactions:true

            }

        );

        this.statistics.grants++;

        this.emit(

            "participantAdd",

            channel.id,

            member.id

        );

    }

    public async removeParticipant(

        channel:TextChannel,

        member:GuildMember

    ){

        await channel.permissionOverwrites.delete(

            member.id

        );

        this.statistics.revokes++;

        this.emit(

            "participantRemove",

            channel.id,

            member.id

        );

    }

    /* --------------------------------------------------------
     * Synchronize Ticket
     * -------------------------------------------------------- */

    public async synchronizeTicket(

        channel:TextChannel,

        participants:GuildMember[]

    ){

        for(

            const participant

            of

            participants

        ){

            await this.addParticipant(

                channel,

                participant

            );

        }

        this.statistics.syncs++;

        this.emit(

            "ticketSync",

            channel.id

        );

    }

    /* --------------------------------------------------------
     * Validation
     * -------------------------------------------------------- */

    public validateProfile(

        profile:PermissionProfile

    ){

        if(

            !profile.id||

            !profile.name

        ){

            throw new Error(

                "Invalid permission profile."

            );

        }

        if(

            profile.priority<0

        ){

            throw new Error(

                "Priority cannot be negative."

            );

        }

        return true;

    }
      /* --------------------------------------------------------
     * Export Permission Profiles
     * -------------------------------------------------------- */

    public exportProfiles(){

        return this.getProfiles().map(

            profile=>({

                id:

                    profile.id,

                name:

                    profile.name,

                priority:

                    profile.priority,

                inherit:

                    [...profile.inherit],

                permissions:

                    [...profile.permissions]

            })

        );

    }

    /* --------------------------------------------------------
     * Import Permission Profiles
     * -------------------------------------------------------- */

    public importProfiles(

        profiles:PermissionProfile[]

    ){

        for(

            const profile

            of

            profiles

        ){

            this.validateProfile(

                profile

            );

            this.profiles.set(

                profile.id,

                profile

            );

        }

        this.statistics.profiles=

            this.profiles.size;

        this.emit(

            "profilesImported",

            profiles.length

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            profiles:

                this.statistics.profiles,

            checks:

                this.statistics.checks,

            grants:

                this.statistics.grants,

            revokes:

                this.statistics.revokes,

            syncs:

                this.statistics.syncs,

            errors:

                this.statistics.errors,

            cachedProfiles:

                this.profiles.size,

            cachedTickets:

                this.ticketPermissions.size

        };

    }

    public resetStatistics(){

        this.statistics={

            profiles:0,

            checks:0,

            grants:0,

            revokes:0,

            syncs:0,

            errors:0

        };

    }

    /* --------------------------------------------------------
     * Clear Ticket Permissions
     * -------------------------------------------------------- */

    public clearTicketPermissions(

        ticketId:string

    ){

        this.ticketPermissions.delete(

            ticketId

        );

        this.emit(

            "ticketPermissionsCleared",

            ticketId

        );

    }

    public clearAllTicketPermissions(){

        this.ticketPermissions.clear();

        this.emit(

            "allTicketPermissionsCleared"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.clearAllTicketPermissions();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        this.profiles.clear();

        this.ticketPermissions.clear();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
