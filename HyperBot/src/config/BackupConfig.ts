export interface BackupConfig{

    /* --------------------------------------------------------
     * General
     * -------------------------------------------------------- */

    enabled:boolean;

    directory:string;

    format:

        "json"|

        "zip";

    compression:boolean;

    /* --------------------------------------------------------
     * Scheduling
     * -------------------------------------------------------- */

    automaticBackups:boolean;

    backupInterval:number;

    backupOnStartup:boolean;

    backupOnShutdown:boolean;

    /* --------------------------------------------------------
     * Retention
     * -------------------------------------------------------- */

    maximumBackups:number;

    deleteOldBackups:boolean;

    retentionDays:number;

    /* --------------------------------------------------------
     * Content
     * -------------------------------------------------------- */

    includeTickets:boolean;

    includePanels:boolean;

    includeTranscripts:boolean;

    includeConfiguration:boolean;

    includeLogs:boolean;

    /* --------------------------------------------------------
     * Verification
     * -------------------------------------------------------- */

    verifyBackups:boolean;

    generateChecksum:boolean;

}
