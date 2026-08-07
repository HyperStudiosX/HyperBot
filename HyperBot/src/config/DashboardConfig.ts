export interface DashboardConfig{

    /* --------------------------------------------------------
     * General
     * -------------------------------------------------------- */

    enabled:boolean;

    title:string;

    description:string;

    domain:string;

    port:number;

    /* --------------------------------------------------------
     * Appearance
     * -------------------------------------------------------- */

    theme:

        "light"|

        "dark"|

        "system";

    defaultLanguage:string;

    timezone:string;

    favicon:string;

    logo:string;

    /* --------------------------------------------------------
     * Sessions
     * -------------------------------------------------------- */

    sessionTimeout:number;

    rememberMeDuration:number;

    maxSessionsPerUser:number;

    /* --------------------------------------------------------
     * Features
     * -------------------------------------------------------- */

    enableAnalytics:boolean;

    enableNotifications:boolean;

    enableAuditLogs:boolean;

    enableLiveUpdates:boolean;

    enableCustomization:boolean;

    /* --------------------------------------------------------
     * Security
     * -------------------------------------------------------- */

    csrfProtection:boolean;

    secureCookies:boolean;

    forceHttps:boolean;

}
