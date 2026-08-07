export interface ApplicationConfig{

    /* --------------------------------------------------------
     * General
     * -------------------------------------------------------- */

    name:string;

    version:string;

    environment:

        "development"|

        "testing"|

        "production";

    debug:boolean;

    timezone:string;

    language:string;

    /* --------------------------------------------------------
     * Server
     * -------------------------------------------------------- */

    host:string;

    port:number;

    publicUrl:string;

    /* --------------------------------------------------------
     * Logging
     * -------------------------------------------------------- */

    logLevel:

        "trace"|

        "debug"|

        "info"|

        "warn"|

        "error";

    logDirectory:string;

    /* --------------------------------------------------------
     * Security
     * -------------------------------------------------------- */

    jwtSecret:string;

    encryptionKey:string;

    sessionTimeout:number;

    /* --------------------------------------------------------
     * Features
     * -------------------------------------------------------- */

    enableDashboard:boolean;

    enableAPI:boolean;

    enableBackups:boolean;

    enableNotifications:boolean;

    enableAnalytics:boolean;

}
