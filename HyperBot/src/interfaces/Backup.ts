import {
    Snowflake
} from "discord.js";

import {
    Backup,
    BackupStatistics,
    BackupFormat,
    CreateBackupOptions
} from "../types/Backup";

export interface BackupService{

    /* --------------------------------------------------------
     * Backup Management
     * -------------------------------------------------------- */

    createBackup(

        guildId:Snowflake

    ):Promise<Backup>;

    restoreBackup(

        backup:Backup

    ):Promise<void>;

    deleteBackup(

        backupId:string

    ):Promise<void>;

    getBackup(

        backupId:string

    ):Backup|undefined;

    getBackups():Backup[];

    /* --------------------------------------------------------
     * Import / Export
     * -------------------------------------------------------- */

    importBackup(

        backup:Backup

    ):Promise<void>;

    exportBackup(

        backupId:string

    ):Backup|undefined;

    /* --------------------------------------------------------
     * File Operations
     * -------------------------------------------------------- */

    saveBackup(

        backup:Backup,

        directory:string

    ):Promise<string>;

    createArchive(

        backup:Backup,

        output:string

    ):Promise<string>;

    /* --------------------------------------------------------
     * Validation
     * -------------------------------------------------------- */

    verifyBackup(

        backup:Backup

    ):boolean;

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    getStatistics():BackupStatistics;

}
