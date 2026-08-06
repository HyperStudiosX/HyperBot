import { PrismaClient } from "@prisma/client";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";

export interface DatabaseStatistics{

    connects:number;

    disconnects:number;

    reconnects:number;

    queries:number;

    transactions:number;

    failedQueries:number;

    cacheHits:number;

    cacheMisses:number;

}

export class DatabaseManager extends EventEmitter{

    private readonly prisma:PrismaClient;

    private readonly cache=

        new Map<
            string,
            any
        >();

    private connected=false;

    private reconnectAttempts=0;

    private readonly statistics:DatabaseStatistics={

        connects:0,

        disconnects:0,

        reconnects:0,

        queries:0,

        transactions:0,

        failedQueries:0,

        cacheHits:0,

        cacheMisses:0

    };

    constructor(){

        super();

        this.prisma=

            new PrismaClient({

                log:[

                    "query",

                    "warn",

                    "error"

                ]

            });

    }

    /* --------------------------------------------------------
     * Connection
     * -------------------------------------------------------- */

    public async connect(){

        try{

            await this.prisma.$connect();

            this.connected=true;

            this.statistics.connects++;

            this.emit(

                "connected"

            );

            console.log(

                "[Database] Connected."

            );

        }

        catch(error){

            this.connected=false;

            this.statistics.failedQueries++;

            this.emit(

                "connectionError",

                error

            );

            throw error;

        }

    }

    public async disconnect(){

        await this.prisma.$disconnect();

        this.connected=false;

        this.statistics.disconnects++;

        this.emit(

            "disconnected"

        );

    }

    public async reconnect(){

        this.reconnectAttempts++;

        this.statistics.reconnects++;

        try{

            await this.disconnect();

        }catch{}

        await this.connect();

    }

    public isConnected(){

        return this.connected;

    }

    /* --------------------------------------------------------
     * Cache
     * -------------------------------------------------------- */

    public setCache(

        key:string,

        value:any

    ){

        this.cache.set(

            key,

            value

        );

    }

    public getCache(

        key:string

    ){

        if(

            this.cache.has(key)

        ){

            this.statistics.cacheHits++;

            return this.cache.get(key);

        }

        this.statistics.cacheMisses++;

        return undefined;

    }

    public deleteCache(

        key:string

    ){

        this.cache.delete(

            key

        );

    }

    public clearCache(){

        this.cache.clear();

    }

    /* --------------------------------------------------------
     * Generic Query
     * -------------------------------------------------------- */

    public async execute<T>(

        callback:()=>Promise<T>

    ):Promise<T>{

        this.statistics.queries++;

        try{

            return await callback();

        }

        catch(error){

            this.statistics.failedQueries++;

            this.emit(

                "queryError",

                error

            );

            throw error;

        }

    }

    /* --------------------------------------------------------
     * Transactions
     * -------------------------------------------------------- */

    public async transaction<T>(

        callback:(

            prisma:PrismaClient

        )=>Promise<T>

    ){

        this.statistics.transactions++;

        return this.prisma.$transaction(

            async()=>{

                return callback(

                    this.prisma

                );

            }

        );

    }

    public client(){

        return this.prisma;

    }
      /* --------------------------------------------------------
     * Ticket CRUD
     * -------------------------------------------------------- */

    public async createTicket(

        data:any

    ){

        return this.execute(

            async()=>{

                return this.prisma.ticket.create({

                    data

                });

            }

        );

    }

    public async getTicket(

        id:string

    ){

        return this.execute(

            async()=>{

                return this.prisma.ticket.findUnique({

                    where:{

                        id

                    }

                });

            }

        );

    }

    public async getTickets(){

        return this.execute(

            async()=>{

                return this.prisma.ticket.findMany({

                    orderBy:{

                        createdAt:"desc"

                    }

                });

            }

        );

    }

    public async updateTicket(

        id:string,

        data:any

    ){

        return this.execute(

            async()=>{

                return this.prisma.ticket.update({

                    where:{

                        id

                    },

                    data

                });

            }

        );

    }

    public async deleteTicket(

        id:string

    ){

        return this.execute(

            async()=>{

                return this.prisma.ticket.delete({

                    where:{

                        id

                    }

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Panel CRUD
     * -------------------------------------------------------- */

    public async createPanel(

        data:any

    ){

        return this.execute(

            async()=>{

                return this.prisma.panel.create({

                    data

                });

            }

        );

    }

    public async getPanels(){

        return this.execute(

            async()=>{

                return this.prisma.panel.findMany();

            }

        );

    }

    public async getPanel(

        id:string

    ){

        return this.execute(

            async()=>{

                return this.prisma.panel.findUnique({

                    where:{

                        id

                    }

                });

            }

        );

    }

    public async updatePanel(

        id:string,

        data:any

    ){

        return this.execute(

            async()=>{

                return this.prisma.panel.update({

                    where:{

                        id

                    },

                    data

                });

            }

        );

    }

    public async deletePanel(

        id:string

    ){

        return this.execute(

            async()=>{

                return this.prisma.panel.delete({

                    where:{

                        id

                    }

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Transcript CRUD
     * -------------------------------------------------------- */

    public async createTranscript(

        data:any

    ){

        return this.execute(

            async()=>{

                return this.prisma.transcript.create({

                    data

                });

            }

        );

    }

    public async getTranscript(

        id:string

    ){

        return this.execute(

            async()=>{

                return this.prisma.transcript.findUnique({

                    where:{

                        id

                    }

                });

            }

        );

    }

    public async getTranscripts(){

        return this.execute(

            async()=>{

                return this.prisma.transcript.findMany({

                    orderBy:{

                        createdAt:"desc"

                    }

                });

            }

        );

    }

    public async deleteTranscript(

        id:string

    ){

        return this.execute(

            async()=>{

                return this.prisma.transcript.delete({

                    where:{

                        id

                    }

                });

            }

        );

    }

    /* --------------------------------------------------------
     * User Preferences
     * -------------------------------------------------------- */

    public async getUser(

        id:string

    ){

        return this.execute(

            async()=>{

                return this.prisma.user.findUnique({

                    where:{

                        id

                    }

                });

            }

        );

    }

    public async createUser(

        data:any

    ){

        return this.execute(

            async()=>{

                return this.prisma.user.create({

                    data

                });

            }

        );

    }

    public async updateUser(

        id:string,

        data:any

    ){

        return this.execute(

            async()=>{

                return this.prisma.user.update({

                    where:{

                        id

                    },

                    data

                });

            }

        );

    }

    public async deleteUser(

        id:string

    ){

        return this.execute(

            async()=>{

                return this.prisma.user.delete({

                    where:{

                        id

                    }

                });

            }

        );

    }
      /* --------------------------------------------------------
     * Audit Logs
     * -------------------------------------------------------- */

    public async createAuditLog(

        data:any

    ){

        return this.execute(

            async()=>{

                return this.prisma.auditLog.create({

                    data

                });

            }

        );

    }

    public async getAuditLogs(

        limit:number=100

    ){

        return this.execute(

            async()=>{

                return this.prisma.auditLog.findMany({

                    take:limit,

                    orderBy:{

                        createdAt:"desc"

                    }

                });

            }

        );

    }

    public async deleteAuditLogs(){

        return this.execute(

            async()=>{

                return this.prisma.auditLog.deleteMany();

            }

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public async ticketStatistics(){

        return this.execute(

            async()=>{

                const open=

                    await this.prisma.ticket.count({

                        where:{

                            status:"OPEN"

                        }

                    });

                const closed=

                    await this.prisma.ticket.count({

                        where:{

                            status:"CLOSED"

                        }

                    });

                const deleted=

                    await this.prisma.ticket.count({

                        where:{

                            status:"DELETED"

                        }

                    });

                return{

                    open,

                    closed,

                    deleted,

                    total:

                        open+

                        closed+

                        deleted

                };

            }

        );

    }

    public async userStatistics(){

        return this.execute(

            async()=>{

                return{

                    users:

                        await this.prisma.user.count(),

                    panels:

                        await this.prisma.panel.count(),

                    transcripts:

                        await this.prisma.transcript.count(),

                    tickets:

                        await this.prisma.ticket.count()

                };

            }

        );

    }

    /* --------------------------------------------------------
     * Health
     * -------------------------------------------------------- */

    public async health(){

        const started=

            Date.now();

        try{

            await this.prisma.$queryRaw`SELECT 1`;

            return{

                healthy:true,

                latency:

                    Date.now()-started,

                connected:

                    this.connected,

                reconnects:

                    this.reconnectAttempts

            };

        }

        catch{

            return{

                healthy:false,

                latency:

                    -1,

                connected:false

            };

        }

    }

    /* --------------------------------------------------------
     * Bulk Operations
     * -------------------------------------------------------- */

    public async deleteClosedTickets(){

        return this.execute(

            async()=>{

                return this.prisma.ticket.deleteMany({

                    where:{

                        status:"CLOSED"

                    }

                });

            }

        );

    }

    public async deleteOldTranscripts(

        before:Date

    ){

        return this.execute(

            async()=>{

                return this.prisma.transcript.deleteMany({

                    where:{

                        closedAt:{

                            lt:before

                        }

                    }

                });

            }

        );

    }

    public async clearDatabase(){

        await this.transaction(

            async(prisma)=>{

                await prisma.auditLog.deleteMany();

                await prisma.transcript.deleteMany();

                await prisma.ticket.deleteMany();

                await prisma.panel.deleteMany();

                await prisma.user.deleteMany();

            }

        );

    }

    /* --------------------------------------------------------
     * Backup
     * -------------------------------------------------------- */

    public async backup(){

        const backup={

            tickets:

                await this.getTickets(),

            panels:

                await this.getPanels(),

            transcripts:

                await this.getTranscripts(),

            users:

                await this.execute(

                    ()=>this.prisma.user.findMany()

                ),

            exportedAt:

                new Date()

        };

        const folder=

            path.join(

                process.cwd(),

                "database-backups"

            );

        if(

            !fs.existsSync(folder)

        ){

            fs.mkdirSync(

                folder,

                {

                    recursive:true

                }

            );

        }

        const file=

            path.join(

                folder,

                `backup-${Date.now()}.json`

            );

        fs.writeFileSync(

            file,

            JSON.stringify(

                backup,

                null,

                4

            )

        );

        return file;

    }
      /* --------------------------------------------------------
     * Restore Backup
     * -------------------------------------------------------- */

    public async restoreBackup(

        file:string

    ){

        const backup=

            JSON.parse(

                fs.readFileSync(

                    file,

                    "utf8"

                )

            );

        await this.transaction(

            async(prisma)=>{

                if(

                    backup.users?.length

                ){

                    await prisma.user.createMany({

                        data:

                            backup.users,

                        skipDuplicates:true

                    });

                }

                if(

                    backup.panels?.length

                ){

                    await prisma.panel.createMany({

                        data:

                            backup.panels,

                        skipDuplicates:true

                    });

                }

                if(

                    backup.tickets?.length

                ){

                    await prisma.ticket.createMany({

                        data:

                            backup.tickets,

                        skipDuplicates:true

                    });

                }

                if(

                    backup.transcripts?.length

                ){

                    await prisma.transcript.createMany({

                        data:

                            backup.transcripts,

                        skipDuplicates:true

                    });

                }

            }

        );

        this.emit(

            "backupRestored",

            file

        );

    }

    /* --------------------------------------------------------
     * Performance
     * -------------------------------------------------------- */

    public performance(){

        return{

            connected:

                this.connected,

            reconnectAttempts:

                this.reconnectAttempts,

            cacheSize:

                this.cache.size,

            statistics:

                this.statistics,

            uptime:

                process.uptime(),

            memory:

                process.memoryUsage(),

            cpu:

                process.cpuUsage()

        };

    }

    /* --------------------------------------------------------
     * Scheduled Maintenance
     * -------------------------------------------------------- */

    public startMaintenance(

        interval:number=

            3600000

    ){

        setInterval(

            async()=>{

                try{

                    await this.health();

                    this.clearCache();

                    this.emit(

                        "maintenance"

                    );

                }

                catch(error){

                    this.emit(

                        "maintenanceError",

                        error

                    );

                }

            },

            interval

        );

    }

    /* --------------------------------------------------------
     * Query Timer
     * -------------------------------------------------------- */

    public async timedQuery<T>(

        callback:()=>Promise<T>

    ){

        const start=

            performance.now();

        const result=

            await this.execute(

                callback

            );

        const end=

            performance.now();

        this.emit(

            "queryTime",

            end-start

        );

        return result;

    }

    /* --------------------------------------------------------
     * Version
     * -------------------------------------------------------- */

    public databaseVersion(){

        return{

            prisma:

                Prisma.prismaVersion.client,

            connected:

                this.connected

        };

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public async cleanup(){

        this.clearCache();

        await this.deleteOldTranscripts(

            new Date(

                Date.now()

                -

                30*

                24*

                60*

                60*

                1000

            )

        );

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            ...this.statistics,

            cacheEntries:

                this.cache.size,

            connected:

                this.connected,

            reconnectAttempts:

                this.reconnectAttempts

        };

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public async shutdown(){

        this.clearCache();

        await this.disconnect();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
