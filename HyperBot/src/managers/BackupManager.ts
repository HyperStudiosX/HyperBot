import fs from "fs";
import path from "path";
import crypto from "crypto";
import { EventEmitter } from "events";

export interface Backup{

    id:string;

    name:string;

    type:
        |"database"
        |"config"
        |"transcripts"
        |"attachments"
        |"full";

    file:string;

    size:number;

    checksum:string;

    compressed:boolean;

    created:number;

    metadata:Record<string,any>;

}

export class BackupManager extends EventEmitter{

    private readonly backups=

        new Map<
            string,
            Backup
        >();

    private statistics={

        created:0,

        restored:0,

        deleted:0,

        verified:0,

        failed:0

    };

    constructor(){

        super();

    }

    /* --------------------------------------------------------
     * Create Backup
     * -------------------------------------------------------- */

    public create(

        backup:Backup

    ){

        this.backups.set(

            backup.id,

            backup

        );

        this.statistics.created++;

        this.emit(

            "backupCreate",

            backup

        );

        return backup;

    }

    /* --------------------------------------------------------
     * Scan Backup Folder
     * -------------------------------------------------------- */

    public scan(

        directory:string

    ){

        if(

            !fs.existsSync(

                directory

            )

        ){

            return[];

        }

        return fs.readdirSync(

            directory

        );

    }

    /* --------------------------------------------------------
     * Lookup
     * -------------------------------------------------------- */

    public get(

        id:string

    ){

        return this.backups.get(

            id

        );

    }

    public getAll(){

        return Array.from(

            this.backups.values()

        );

    }

    public exists(

        id:string

    ){

        return this.backups.has(

            id

        );

    }

    /* --------------------------------------------------------
     * Generate Backup ID
     * -------------------------------------------------------- */

    public generateId(){

        return crypto.randomUUID();

    }

    /* --------------------------------------------------------
     * Generate SHA256
     * -------------------------------------------------------- */

    public checksum(

        file:string

    ){

        const buffer=

            fs.readFileSync(

                file

            );

        return crypto

            .createHash(

                "sha256"

            )

            .update(

                buffer

            )

            .digest(

                "hex"

            );

    }

    /* --------------------------------------------------------
     * Save Backup
     * -------------------------------------------------------- */

    public save(

        file:string,

        destination:string

    ){

        fs.copyFileSync(

            file,

            destination

        );

        this.emit(

            "backupSaved",

            destination

        );

    }

    /* --------------------------------------------------------
     * Delete Backup
     * -------------------------------------------------------- */

    public delete(

        id:string

    ){

        const backup=

            this.get(

                id

            );

        if(

            !backup

        ){

            return false;

        }

        if(

            fs.existsSync(

                backup.file

            )

        ){

            fs.unlinkSync(

                backup.file

            );

        }

        this.backups.delete(

            id

        );

        this.statistics.deleted++;

        this.emit(

            "backupDelete",

            id

        );

        return true;

    }
      /* --------------------------------------------------------
     * Database Backup
     * -------------------------------------------------------- */

    public backupDatabase(

        source:string,

        destination:string

    ){

        this.save(

            source,

            destination

        );

        this.emit(

            "databaseBackup",

            destination

        );

    }

    /* --------------------------------------------------------
     * Configuration Backup
     * -------------------------------------------------------- */

    public backupConfig(

        source:string,

        destination:string

    ){

        this.save(

            source,

            destination

        );

        this.emit(

            "configBackup",

            destination

        );

    }

    /* --------------------------------------------------------
     * Transcript Backup
     * -------------------------------------------------------- */

    public backupTranscripts(

        source:string,

        destination:string

    ){

        this.save(

            source,

            destination

        );

        this.emit(

            "transcriptBackup",

            destination

        );

    }

    /* --------------------------------------------------------
     * Restore Backup
     * -------------------------------------------------------- */

    public restore(

        backupId:string,

        destination:string

    ){

        const backup=

            this.get(

                backupId

            );

        if(

            !backup

        ){

            return false;

        }

        fs.copyFileSync(

            backup.file,

            destination

        );

        this.statistics.restored++;

        this.emit(

            "backupRestore",

            backup.id

        );

        return true;

    }

    /* --------------------------------------------------------
     * Verify Backup
     * -------------------------------------------------------- */

    public verify(

        backupId:string

    ){

        const backup=

            this.get(

                backupId

            );

        if(

            !backup||

            !fs.existsSync(

                backup.file

            )

        ){

            this.statistics.failed++;

            return false;

        }

        const checksum=

            this.checksum(

                backup.file

            );

        const valid=

            checksum===

            backup.checksum;

        if(

            valid

        ){

            this.statistics.verified++;

        }

        else{

            this.statistics.failed++;

        }

        this.emit(

            "backupVerify",

            backup.id,

            valid

        );

        return valid;

    }

    /* --------------------------------------------------------
     * Scheduled Backups
     * -------------------------------------------------------- */

    private readonly schedules=

        new Map<
            string,
            NodeJS.Timeout
        >();

    public schedule(

        id:string,

        interval:number,

        callback:()=>void

    ){

        const timer=

            setInterval(

                callback,

                interval

            );

        this.schedules.set(

            id,

            timer

        );

        this.emit(

            "backupSchedule",

            id

        );

    }

    public cancelSchedule(

        id:string

    ){

        const timer=

            this.schedules.get(

                id

            );

        if(

            !timer

        ){

            return false;

        }

        clearInterval(

            timer

        );

        this.schedules.delete(

            id

        );

        this.emit(

            "backupScheduleCancel",

            id

        );

        return true;

    }

    /* --------------------------------------------------------
     * Backup Size
     * -------------------------------------------------------- */

    public getTotalSize(){

        let total=0;

        for(

            const backup

            of

            this.backups.values()

        ){

            total+=

                backup.size;

        }

        return total;

    }
      /* --------------------------------------------------------
     * Compression
     * -------------------------------------------------------- */

    public compress(

        backupId:string,

        output:string

    ){

        const backup=

            this.get(

                backupId

            );

        if(

            !backup

        ){

            return false;

        }

        fs.copyFileSync(

            backup.file,

            output

        );

        backup.file=

            output;

        backup.compressed=

            true;

        backup.size=

            fs.statSync(

                output

            ).size;

        this.emit(

            "backupCompressed",

            backup.id

        );

        return true;

    }

    /* --------------------------------------------------------
     * Export Backups
     * -------------------------------------------------------- */

    public exportBackups(){

        return Array.from(

            this.backups.values()

        );

    }

    /* --------------------------------------------------------
     * Import Backups
     * -------------------------------------------------------- */

    public importBackups(

        backups:Backup[]

    ){

        for(

            const backup

            of

            backups

        ){

            this.backups.set(

                backup.id,

                backup

            );

        }

        this.emit(

            "backupsImported",

            backups.length

        );

    }

    /* --------------------------------------------------------
     * Cleanup Policy
     * -------------------------------------------------------- */

    public cleanupOld(

        maxAge:number=

            1000*60*60*24*30

    ){

        const now=

            Date.now();

        let removed=0;

        for(

            const [

                id,

                backup

            ]

            of

            this.backups

        ){

            if(

                now-

                backup.created>

                maxAge

            ){

                this.delete(

                    id

                );

                removed++;

            }

        }

        this.emit(

            "backupCleanup",

            removed

        );

        return removed;

    }

    /* --------------------------------------------------------
     * Maximum Backup Limit
     * -------------------------------------------------------- */

    public enforceLimit(

        limit:number

    ){

        const backups=

            this.getAll()

                .sort(

                    (

                        a,

                        b

                    )=>

                        a.created-

                        b.created

                );

        while(

            backups.length>

            limit

        ){

            const oldest=

                backups.shift();

            if(

                oldest

            ){

                this.delete(

                    oldest.id

                );

            }

        }

        this.emit(

            "backupLimit",

            limit

        );

    }

    /* --------------------------------------------------------
     * Cloud Backup Hook
     * -------------------------------------------------------- */

    public async uploadToCloud(

        backupId:string,

        uploader:(

            backup:Backup

        )=>Promise<void>

    ){

        const backup=

            this.get(

                backupId

            );

        if(

            !backup

        ){

            return false;

        }

        await uploader(

            backup

        );

        this.emit(

            "cloudUpload",

            backup.id

        );

        return true;

    }

    /* --------------------------------------------------------
     * Download Hook
     * -------------------------------------------------------- */

    public async downloadFromCloud(

        downloader:()=>Promise<

            Backup[]

        >

    ){

        const backups=

            await downloader();

        this.importBackups(

            backups

        );

        this.emit(

            "cloudDownload"

        );

    }
      /* --------------------------------------------------------
     * Backup Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            total:

                this.backups.size,

            created:

                this.statistics.created,

            restored:

                this.statistics.restored,

            deleted:

                this.statistics.deleted,

            verified:

                this.statistics.verified,

            failed:

                this.statistics.failed,

            scheduled:

                this.schedules.size,

            totalSize:

                this.getTotalSize()

        };

    }

    public resetStatistics(){

        this.statistics={

            created:0,

            restored:0,

            deleted:0,

            verified:0,

            failed:0

        };

    }

    /* --------------------------------------------------------
     * Find Backups
     * -------------------------------------------------------- */

    public findByType(

        type:Backup["type"]

    ){

        return this.getAll().filter(

            backup=>

                backup.type===

                type

        );

    }

    public findByName(

        query:string

    ){

        const search=

            query.toLowerCase();

        return this.getAll().filter(

            backup=>

                backup.name

                    .toLowerCase()

                    .includes(

                        search

                    )

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        for(

            const [

                id,

                timer

            ]

            of

            this.schedules

        ){

            clearInterval(

                timer

            );

        }

        this.schedules.clear();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Clear All
     * -------------------------------------------------------- */

    public clear(){

        this.backups.clear();

        this.emit(

            "backupsCleared"

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
