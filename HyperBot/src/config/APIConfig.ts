export interface APIConfig{

    /* --------------------------------------------------------
     * Server
     * -------------------------------------------------------- */

    enabled:boolean;

    host:string;

    port:number;

    basePath:string;

    publicUrl:string;

    /* --------------------------------------------------------
     * Security
     * -------------------------------------------------------- */

    cors:boolean;

    corsOrigins:string[];

    helmet:boolean;

    compression:boolean;

    trustProxy:boolean;

    /* --------------------------------------------------------
     * Authentication
     * -------------------------------------------------------- */

    jwtSecret:string;

    tokenExpiration:string;

    apiKeyHeader:string;

    /* --------------------------------------------------------
     * Rate Limiting
     * -------------------------------------------------------- */

    rateLimitEnabled:boolean;

    rateLimitWindow:number;

    rateLimitRequests:number;

    /* --------------------------------------------------------
     * Webhooks
     * -------------------------------------------------------- */

    webhooksEnabled:boolean;

    webhookSecret:string;

    /* --------------------------------------------------------
     * Logging
     * -------------------------------------------------------- */

    logRequests:boolean;

    logResponses:boolean;

}
