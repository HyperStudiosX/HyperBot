import {
    Client,
    Collection,
    Guild,
    GuildAuditLogsEntry,
    GuildMember,
    Snowflake,
    User
} from "discord.js";

import { EventEmitter } from "events";
import crypto from "crypto";

export interface AuditEntry{

    id:string;

    guildId:Snowflake;

    userId:Snowflake;

    targetId?:Snowflake;

    action:string;

    category:
        |"ticket"
        |"command"
        |"dashboard"
        |"moderation"
        |"security"
        |"system";

    reason?:string;

    metadata:Record<string,any>;

    created:number;

}

export class AuditManager extends EventEmitter{

    private readonly client:Client;

    private readonly entries=

        new Collection<
            string,
            AuditEntry
        >();

    private statistics={

        created:0,

        deleted:0,

        searches:0,

        exports:0,

        imported:0

    };

    constructor(

        client:Client

    ){

        super();

        this.client=client;

    }

    /* --------------------------------------------------------
     * Create Audit Entry
     * -------------------------------------------------------- */

    public create(

        data:Omit<
            AuditEntry,
            "id"|
            "created"
        >

    ){

        const entry:AuditEntry={

            id:

                crypto.randomUUID(),

            created:

                Date.now(),

            ...data

        };

        this.entries.set(

            entry.id,

            entry

        );

        this.statistics.created++;

        this.emit(

            "auditCreate",

            entry

        );

        return entry;

    }

    /* --------------------------------------------------------
     * Lookup
     * -------------------------------------------------------- */

    public get(

        id:string

    ){

        return this.entries.get(

            id

        );

    }

    public getAll(){

        return Array.from(

            this.entries.values()

        );

    }

    public delete(

        id:string

    ){

        if(

            this.entries.delete(

                id

            )

        ){

            this.statistics.deleted++;

            this.emit(

                "auditDelete",

                id

            );

            return true;

        }

        return false;

    }

    /* --------------------------------------------------------
     * Search
     * -------------------------------------------------------- */

    public byUser(

        userId:Snowflake

    ){

        this.statistics.searches++;

        return this.getAll().filter(

            entry=>

                entry.userId===

                userId

        );

    }

    public byGuild(

        guildId:Snowflake

    ){

        this.statistics.searches++;

        return this.getAll().filter(

            entry=>

                entry.guildId===

                guildId

        );

    }

    public byCategory(

        category:

            AuditEntry["category"]

    ){

        this.statistics.searches++;

        return this.getAll().filter(

            entry=>

                entry.category===

                category

        );

    }

    /* --------------------------------------------------------
     * Ticket Logs
     * -------------------------------------------------------- */

    public logTicket(

        guildId:Snowflake,

        userId:Snowflake,

        action:string,

        metadata:Record<string,any>={}

    ){

        return this.create({

            guildId,

            userId,

            action,

            category:

                "ticket",

            metadata

        });

    }

    /* --------------------------------------------------------
     * Command Logs
     * -------------------------------------------------------- */

    public logCommand(

        guildId:Snowflake,

        userId:Snowflake,

        command:string,

        metadata:Record<string,any>={}

    ){

        return this.create({

            guildId,

            userId,

            action:

                command,

            category:

                "command",

            metadata

        });

    }
      /* --------------------------------------------------------
     * Dashboard Logs
     * -------------------------------------------------------- */

    public logDashboard(

        guildId:Snowflake,

        userId:Snowflake,

        action:string,

        metadata:Record<string,any>={}

    ){

        return this.create({

            guildId,

            userId,

            action,

            category:

                "dashboard",

            metadata

        });

    }

    /* --------------------------------------------------------
     * Moderation Logs
     * -------------------------------------------------------- */

    public logModeration(

        guildId:Snowflake,

        moderatorId:Snowflake,

        targetId:Snowflake,

        action:string,

        reason:string="No reason provided.",

        metadata:Record<string,any>={}

    ){

        return this.create({

            guildId,

            userId:

                moderatorId,

            targetId,

            action,

            reason,

            category:

                "moderation",

            metadata

        });

    }

    /* --------------------------------------------------------
     * Security Logs
     * -------------------------------------------------------- */

    public logSecurity(

        guildId:Snowflake,

        userId:Snowflake,

        action:string,

        metadata:Record<string,any>={}

    ){

        return this.create({

            guildId,

            userId,

            action,

            category:

                "security",

            metadata

        });

    }

    /* --------------------------------------------------------
     * System Logs
     * -------------------------------------------------------- */

    public logSystem(

        guildId:Snowflake,

        action:string,

        metadata:Record<string,any>={}

    ){

        return this.create({

            guildId,

            userId:

                this.client.user?.id??

                "0",

            action,

            category:

                "system",

            metadata

        });

    }

    /* --------------------------------------------------------
     * Date Filters
     * -------------------------------------------------------- */

    public since(

        timestamp:number

    ){

        this.statistics.searches++;

        return this.getAll().filter(

            entry=>

                entry.created>=

                timestamp

        );

    }

    public between(

        start:number,

        end:number

    ){

        this.statistics.searches++;

        return this.getAll().filter(

            entry=>

                entry.created>=start&&

                entry.created<=end

        );

    }

    /* --------------------------------------------------------
     * Target Filters
     * -------------------------------------------------------- */

    public byTarget(

        targetId:Snowflake

    ){

        this.statistics.searches++;

        return this.getAll().filter(

            entry=>

                entry.targetId===

                targetId

        );

    }

    public byAction(

        action:string

    ){

        this.statistics.searches++;

        return this.getAll().filter(

            entry=>

                entry.action===

                action

        );

    }

    /* --------------------------------------------------------
     * Recent Logs
     * -------------------------------------------------------- */

    public recent(

        amount:number=25

    ){

        return this.getAll()

            .sort(

                (

                    a,

                    b

                )=>

                    b.created-

                    a.created

            )

            .slice(

                0,

                amount

            );

    }
      /* --------------------------------------------------------
     * Discord Audit Log Integration
     * -------------------------------------------------------- */

    public async fetchDiscordAuditLogs(

        guild:Guild,

        limit:number=100

    ){

        const logs=

            await guild.fetchAuditLogs({

                limit

            });

        return logs.entries;

    }

    public async cacheDiscordAuditLogs(

        guild:Guild,

        limit:number=100

    ){

        const logs=

            await this.fetchDiscordAuditLogs(

                guild,

                limit

            );

        for(

            const [

                id,

                entry

            ]

            of

            logs

        ){

            this.create({

                guildId:

                    guild.id,

                userId:

                    entry.executor?.id??

                    "0",

                targetId:

                    entry.target?.id??

                    undefined,

                action:

                    entry.action.toString(),

                category:

                    "moderation",

                reason:

                    entry.reason??

                    undefined,

                metadata:{

                    discordAudit:true,

                    auditId:id

                }

            });

        }

        this.emit(

            "discordAuditImported",

            guild.id

        );
    }

    /* --------------------------------------------------------
     * Login Sessions
     * -------------------------------------------------------- */

    public logLogin(

        guildId:Snowflake,

        userId:Snowflake,

        ip:string,

        userAgent:string

    ){

        return this.create({

            guildId,

            userId,

            action:

                "LOGIN",

            category:

                "security",

            metadata:{

                ip,

                userAgent

            }

        });

    }

    public logLogout(

        guildId:Snowflake,

        userId:Snowflake

    ){

        return this.create({

            guildId,

            userId,

            action:

                "LOGOUT",

            category:

                "security",

            metadata:{}

        });

    }

    /* --------------------------------------------------------
     * Advanced Search
     * -------------------------------------------------------- */

    public search(

        query:string

    ){

        this.statistics.searches++;

        const search=

            query.toLowerCase();

        return this.getAll().filter(

            entry=>

                entry.action

                    .toLowerCase()

                    .includes(

                        search

                    )||

                entry.category

                    .toLowerCase()

                    .includes(

                        search

                    )||

                entry.reason

                    ?.toLowerCase()

                    .includes(

                        search

                    )

        );

    }

    /* --------------------------------------------------------
     * Analytics
     * -------------------------------------------------------- */

    public getCategoryCount(){

        const counts=

            new Map<string,number>();

        for(

            const entry

            of

            this.entries.values()

        ){

            counts.set(

                entry.category,

                (

                    counts.get(

                        entry.category

                    )??

                    0

                )+1

            );

        }

        return counts;

    }

    public getUserActivity(

        userId:Snowflake

    ){

        return this.byUser(

            userId

        ).length;

    }
      /* --------------------------------------------------------
     * Export Audit Logs
     * -------------------------------------------------------- */

    public exportJSON(){

        this.statistics.exports++;

        return JSON.stringify(

            this.getAll(),

            null,

            4

        );

    }

    public exportCSV(){

        this.statistics.exports++;

        const rows=[

            "id,guildId,userId,targetId,category,action,reason,created"

        ];

        for(

            const entry

            of

            this.entries.values()

        ){

            rows.push(

                [

                    entry.id,

                    entry.guildId,

                    entry.userId,

                    entry.targetId??

                    "",

                    entry.category,

                    entry.action,

                    entry.reason??

                    "",

                    entry.created

                ].join(",")

            );

        }

        return rows.join(

            "\n"

        );

    }

    /* --------------------------------------------------------
     * Import Audit Entries
     * -------------------------------------------------------- */

    public importEntries(

        entries:AuditEntry[]

    ){

        for(

            const entry

            of

            entries

        ){

            this.entries.set(

                entry.id,

                entry

            );

        }

        this.statistics.imported+=

            entries.length;

        this.emit(

            "auditImported",

            entries.length

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            total:

                this.entries.size,

            created:

                this.statistics.created,

            deleted:

                this.statistics.deleted,

            searches:

                this.statistics.searches,

            exports:

                this.statistics.exports,

            imported:

                this.statistics.imported,

            categories:

                this.getCategoryCount()

        };

    }

    public resetStatistics(){

        this.statistics={

            created:0,

            deleted:0,

            searches:0,

            exports:0,

            imported:0

        };

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(

        maxAge:number=

            1000*60*60*24*30

    ){

        const now=

            Date.now();

        for(

            const [

                id,

                entry

            ]

            of

            this.entries

        ){

            if(

                now-entry.created>

                maxAge

            ){

                this.entries.delete(

                    id

                );

            }

        }

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Clear Audit Logs
     * -------------------------------------------------------- */

    public clear(){

        this.entries.clear();

        this.emit(

            "auditCleared"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        this.clear();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
