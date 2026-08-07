export interface LoggingConfig{

    /* --------------------------------------------------------
     * General
     * -------------------------------------------------------- */

    enabled:boolean;

    level:

        "trace"|

        "debug"|

        "info"|

        "warn"|

        "error"|

        "fatal";

    directory:string;

    fileName:string;

    /* --------------------------------------------------------
     * Rotation
     * -------------------------------------------------------- */

    maxFileSize:string;

    maxFiles:number;

    compressOldLogs:boolean;

    rotateDaily:boolean;

    /* --------------------------------------------------------
     * Console
     * -------------------------------------------------------- */

    consoleLogging:boolean;

    colorizedOutput:boolean;

    timestamps:boolean;

    /* --------------------------------------------------------
     * File Logging
     * -------------------------------------------------------- */

    fileLogging:boolean;

    logErrors:boolean;

    logWarnings:boolean;

    logDebugMessages:boolean;

    /* --------------------------------------------------------
     * Audit Logs
     * -------------------------------------------------------- */

    auditLogging:boolean;

    auditDirectory:string;

    retainAuditLogs:number;

}
