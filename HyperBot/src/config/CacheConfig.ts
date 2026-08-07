export interface CacheConfig{

    /* --------------------------------------------------------
     * General
     * -------------------------------------------------------- */

    enabled:boolean;

    provider:

        "memory"|

        "redis";

    defaultTTL:number;

    cleanupInterval:number;

    /* --------------------------------------------------------
     * Limits
     * -------------------------------------------------------- */

    maximumEntries:number;

    maximumMemoryMB:number;

    evictLeastRecentlyUsed:boolean;

    /* --------------------------------------------------------
     * Persistence
     * -------------------------------------------------------- */

    persistToDisk:boolean;

    persistenceDirectory:string;

    saveInterval:number;

    /* --------------------------------------------------------
     * Redis
     * -------------------------------------------------------- */

    redisHost:string;

    redisPort:number;

    redisUsername:string;

    redisPassword:string;

    redisDatabase:number;

    useTLS:boolean;

    /* --------------------------------------------------------
     * Monitoring
     * -------------------------------------------------------- */

    collectStatistics:boolean;

    logCacheOperations:boolean;

}
