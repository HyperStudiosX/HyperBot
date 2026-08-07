import {
    Client,
    Guild,
    Snowflake
} from "discord.js";

import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import crypto from "crypto";

import { BackupManager } from "../managers/BackupManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { TicketManager } from "../managers/TicketManager";
import { PanelManager } from "../managers/PanelManager";
import { TranscriptManager } from "../managers/TranscriptManager";
import { AuditManager } from "../managers/AuditManager";

export class BackupService extends EventEmitter{

    private readonly client:Client;

    private readonly backups:BackupManager;

    private readonly database:DatabaseManager;

    private readonly tickets:TicketManager;

    private readonly panels:PanelManager;

    private readonly transcripts:TranscriptManager;

    private readonly audits:AuditManager;

    constructor(

        client:Client,

        backups:BackupManager,

        database:DatabaseManager,

        tickets:TicketManager,

        panels:PanelManager,

        transcripts:TranscriptManager,

        audits:AuditManager

    ){

        super();

        this.client=client;

        this.backups=backups;

        this.database=database;

        this.tickets=tickets;

        this.panels=panels;

        this.transcripts=transcripts;

        this.audits=audits;

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    public async initialize(){

        await this.restoreBackups();

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Restore Backups
     * -------------------------------------------------------- */

    private async restoreBackups(){

        const backups=

            await this.database.getBackups();

        for(

            const backup

            of

            backups

        ){

            this.backups.register(

                backup

            );

        }

        this.emit(

            "backupsRestored",

            backups.length

        );

    }

    /* --------------------------------------------------------
     * Create Backup
     * -------------------------------------------------------- */

    public async createBackup(

        guildId:Snowflake

    ){

        const backup={

            id:

                crypto.randomUUID(),

            guildId,

            createdAt:

                Date.now(),

            tickets:

                this.tickets.getAll()

                    .filter(

                        ticket=>

                            ticket.guildId===

                            guildId

                    ),

            panels:

                this.panels.getAll()

                    .filter(

                        panel=>

                            panel.guildId===

                            guildId

                    ),

            transcripts:

                this.transcripts.getAll()

                    .filter(

                        transcript=>

                            transcript.guildId===

                            guildId

                    )

        };

        this.backups.register(

            backup

        );

        await this.database.saveBackup(

            backup

        );

        this.emit(

            "backupCreated",

            backup

        );

        return backup;

    }

    /* --------------------------------------------------------
     * Save Backup File
     * -------------------------------------------------------- */

    public async saveBackup(

        backup:any,

        directory:string

    ){

        if(

            !fs.existsSync(

                directory

            )

        ){

            fs.mkdirSync(

                directory,

                {

                    recursive:true

                }

            );

        }

        const file=

            path.join(

                directory,

                `${backup.id}.json`

            );

        fs.writeFileSync(

            file,

            JSON.stringify(

                backup,

                null,

                4

            )

        );

        this.emit(

            "backupSaved",

            file

        );

        return file;

    }
      /* --------------------------------------------------------
     * Create ZIP Archive
     * -------------------------------------------------------- */

    public async createArchive(

        backup:any,

        output:string

    ){

        return new Promise<string>(

            (

                resolve,

                reject

            )=>{

                const stream=

                    fs.createWriteStream(

                        output

                    );

                const archive=

                    archiver(

                        "zip",

                        {

                            zlib:{

                                level:9

                            }

                        }

                    );

                stream.on(

                    "close",

                    ()=>{

                        this.emit(

                            "archiveCreated",

                            output

                        );

                        resolve(

                            output

                        );

                    }

                );

                archive.on(

                    "error",

                    reject

                );

                archive.pipe(

                    stream

                );

                archive.append(

                    JSON.stringify(

                        backup,

                        null,

                        4

                    ),

                    {

                        name:

                            "backup.json"

                    }

                );

                archive.finalize();

            }

        );

    }

    /* --------------------------------------------------------
     * Restore Backup
     * -------------------------------------------------------- */

    public async restoreBackup(

        backup:any

    ){

        for(

            const ticket

            of

            backup.tickets

        ){

            await this.database.saveTicket(

                ticket

            );

        }

        for(

            const panel

            of

            backup.panels

        ){

            await this.database.savePanel(

                panel

            );

        }

        for(

            const transcript

            of

            backup.transcripts

        ){

            await this.database.saveTranscript(

                transcript

            );

        }

        this.emit(

            "backupRestored",

            backup.id

        );

    }

    /* --------------------------------------------------------
     * Delete Backup
     * -------------------------------------------------------- */

    public async deleteBackup(

        backupId:string

    ){

        this.backups.delete(

            backupId

        );

        await this.database.deleteBackup(

            backupId

        );

        this.emit(

            "backupDeleted",

            backupId

        );

    }

    /* --------------------------------------------------------
     * Get Backup
     * -------------------------------------------------------- */

    public getBackup(

        backupId:string

    ){

        return this.backups.get(

            backupId

        );

    }

    /* --------------------------------------------------------
     * List Backups
     * -------------------------------------------------------- */

    public getBackups(){

        return this.backups.getAll();

    }

    /* --------------------------------------------------------
     * Backup Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        const backups=

            this.backups.getAll();

        return{

            total:

                backups.length,

            latest:

                backups.at(

                    -1

                )??null

        };

    }
      /* --------------------------------------------------------
     * Export Backup
     * -------------------------------------------------------- */

    public exportBackup(

        backupId:string

    ){

        return this.backups.get(

            backupId

        );

    }

    /* --------------------------------------------------------
     * Import Backup
     * -------------------------------------------------------- */

    public async importBackup(

        backup:any

    ){

        this.backups.register(

            backup

        );

        await this.database.saveBackup(

            backup

        );

        this.emit(

            "backupImported",

            backup.id

        );

    }

    /* --------------------------------------------------------
     * Schedule Automatic Backup
     * -------------------------------------------------------- */

    public scheduleBackup(

        guildId:Snowflake,

        interval:number

    ){

        return setInterval(

            async()=>{

                try{

                    await this.createBackup(

                        guildId

                    );

                }

                catch(

                    error

                ){

                    this.emit(

                        "backupError",

                        error

                    );

                }

            },

            interval

        );

    }

    /* --------------------------------------------------------
     * Cancel Scheduled Backup
     * -------------------------------------------------------- */

    public cancelSchedule(

        timer:NodeJS.Timeout

    ){

        clearInterval(

            timer

        );

        this.emit(

            "backupScheduleCancelled"

        );

    }

    /* --------------------------------------------------------
     * Synchronize
     * -------------------------------------------------------- */

    public async synchronize(){

        const backups=

            this.backups.getAll();

        for(

            const backup

            of

            backups

        ){

            await this.database.updateBackup(

                backup

            );

        }

        this.emit(

            "backupsSynchronized",

            backups.length

        );

    }

    /* --------------------------------------------------------
     * Verify Backup
     * -------------------------------------------------------- */

    public verifyBackup(

        backup:any

    ){

        return(

            Array.isArray(

                backup.tickets

            )&&

            Array.isArray(

                backup.panels

            )&&

            Array.isArray(

                backup.transcripts

            )

        );

    }
      /* --------------------------------------------------------
     * Backup Analytics
     * -------------------------------------------------------- */

    public getAnalytics(){

        const backups=

            this.backups.getAll();

        const totalSize=

            backups.reduce(

                (

                    size,

                    backup

                )=>

                    size+

                    JSON.stringify(

                        backup

                    ).length,

                0

            );

        return{

            totalBackups:

                backups.length,

            estimatedSize:

                totalSize,

            latestBackup:

                backups.length>0

                    ?backups[

                        backups.length-1

                    ]

                    :null

        };

    }

    /* --------------------------------------------------------
     * Reload
     * -------------------------------------------------------- */

    public async reload(){

        this.backups.clear();

        await this.restoreBackups();

        this.emit(

            "reloaded"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

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
