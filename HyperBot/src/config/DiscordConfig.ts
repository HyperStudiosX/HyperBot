export interface DiscordConfig{

    /* --------------------------------------------------------
     * Bot
     * -------------------------------------------------------- */

    token:string;

    clientId:string;

    clientSecret:string;

    applicationId:string;

    publicKey:string;

    /* --------------------------------------------------------
     * Guild
     * -------------------------------------------------------- */

    developmentGuildId?:string;

    productionGuildId?:string;

    ownerIds:string[];

    /* --------------------------------------------------------
     * Presence
     * -------------------------------------------------------- */

    status:

        "online"|

        "idle"|

        "dnd"|

        "invisible";

    activityType:

        "Playing"|

        "Watching"|

        "Listening"|

        "Competing"|

        "Streaming";

    activityName:string;

    activityUrl?:string;

    /* --------------------------------------------------------
     * Intents
     * -------------------------------------------------------- */

    intents:string[];

    partials:string[];

    /* --------------------------------------------------------
     * Features
     * -------------------------------------------------------- */

    registerSlashCommands:boolean;

    registerContextMenus:boolean;

    autoReconnect:boolean;

    enableSharding:boolean;

    shardCount?:number;

}
