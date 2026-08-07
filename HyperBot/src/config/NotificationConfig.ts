export interface NotificationConfig{

    /* --------------------------------------------------------
     * General
     * -------------------------------------------------------- */

    enabled:boolean;

    defaultChannel:

        "dm"|

        "text"|

        "webhook";

    queueEnabled:boolean;

    maxQueueSize:number;

    retryAttempts:number;

    retryDelay:number;

    /* --------------------------------------------------------
     * Templates
     * -------------------------------------------------------- */

    templatesEnabled:boolean;

    defaultTemplate:string;

    /* --------------------------------------------------------
     * Delivery
     * -------------------------------------------------------- */

    allowDirectMessages:boolean;

    allowGuildChannels:boolean;

    allowWebhooks:boolean;

    webhookTimeout:number;

    /* --------------------------------------------------------
     * Scheduling
     * -------------------------------------------------------- */

    scheduledNotifications:boolean;

    maximumScheduledNotifications:number;

    /* --------------------------------------------------------
     * Logging
     * -------------------------------------------------------- */

    logSentNotifications:boolean;

    logFailedNotifications:boolean;

}
