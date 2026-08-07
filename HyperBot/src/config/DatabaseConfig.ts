export interface DatabaseConfig{

    /* --------------------------------------------------------
     * Connection
     * -------------------------------------------------------- */

    type:

        "sqlite"|

        "mysql"|

        "postgresql"|

        "mongodb";

    host:string;

    port:number;

    database:string;

    username:string;

    password:string;

    /* --------------------------------------------------------
     * Pool
     * -------------------------------------------------------- */

    minimumConnections:number;

    maximumConnections:number;

    connectionTimeout:number;

    idleTimeout:number;

    /* --------------------------------------------------------
     * Options
     * -------------------------------------------------------- */

    synchronize:boolean;

    logging:boolean;

    ssl:boolean;

    autoReconnect:boolean;

    /* --------------------------------------------------------
     * Backup
     * -------------------------------------------------------- */

    backupOnStartup:boolean;

    backupOnShutdown:boolean;

    backupDirectory:string;

}
