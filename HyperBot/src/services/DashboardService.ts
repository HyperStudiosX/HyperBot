import {
    Client,
    Guild,
    Snowflake,
    TextChannel,
    User
} from "discord.js";

import { EventEmitter } from "events";

import { DashboardManager } from "../managers/DashboardManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { PanelManager } from "../managers/PanelManager";
import { TicketManager } from "../managers/TicketManager";
import { AuditManager } from "../managers/AuditManager";
import { CacheManager } from "../managers/CacheManager";

export class DashboardService extends EventEmitter{

    private readonly client:Client;

    private readonly dashboard:DashboardManager;

    private readonly database:DatabaseManager;

    private readonly panels:PanelManager;

    private readonly tickets:TicketManager;

    private readonly audits:AuditManager;

    private readonly cache:CacheManager;

    constructor(

        client:Client,

        dashboard:DashboardManager,

        database:DatabaseManager,

        panels:PanelManager,

        tickets:TicketManager,

        audits:AuditManager,

        cache:CacheManager

    ){

        super();

        this.client=client;

        this.dashboard=dashboard;

        this.database=database;

        this.panels=panels;

        this.tickets=tickets;

        this.audits=audits;

        this.cache=cache;

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    public async initialize(){

        await this.restoreDashboards();

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Restore Dashboards
     * -------------------------------------------------------- */

    private async restoreDashboards(){

        const dashboards=

            await this.database.getDashboards();

        for(

            const dashboard

            of

            dashboards

        ){

            this.dashboard.register(

                dashboard

            );

        }

        this.emit(

            "dashboardsRestored",

            dashboards.length

        );

    }

    /* --------------------------------------------------------
     * Create Dashboard
     * -------------------------------------------------------- */

    public async createDashboard(

        guild:Guild

    ){

        const dashboard=

            this.dashboard.create(

                guild.id

            );

        await this.database.saveDashboard(

            dashboard

        );

        this.cache.set(

            guild.id,

            dashboard

        );

        this.emit(

            "dashboardCreated",

            dashboard

        );

        return dashboard;

    }

    /* --------------------------------------------------------
     * Open Dashboard
     * -------------------------------------------------------- */

    public async openDashboard(

        guildId:Snowflake

    ){

        const dashboard=

            this.dashboard.get(

                guildId

            );

        if(

            !dashboard

        ){

            return null;

        }

        dashboard.lastOpened=

            Date.now();

        await this.database.updateDashboard(

            dashboard

        );

        this.emit(

            "dashboardOpened",

            dashboard

        );

        return dashboard;

    }

    /* --------------------------------------------------------
     * Save Dashboard
     * -------------------------------------------------------- */

    public async saveDashboard(

        guildId:Snowflake

    ){

        const dashboard=

            this.dashboard.get(

                guildId

            );

        if(

            !dashboard

        ){

            return false;

        }

        await this.database.updateDashboard(

            dashboard

        );

        this.emit(

            "dashboardSaved",

            guildId

        );

        return true;

    }
      /* --------------------------------------------------------
     * Update Dashboard Settings
     * -------------------------------------------------------- */

    public async updateSettings(

        guildId:Snowflake,

        settings:any

    ){

        const dashboard=

            this.dashboard.get(

                guildId

            );

        if(

            !dashboard

        ){

            return null;

        }

        dashboard.settings={

            ...dashboard.settings,

            ...settings

        };

        await this.database.updateDashboard(

            dashboard

        );

        this.cache.set(

            guildId,

            dashboard

        );

        this.emit(

            "settingsUpdated",

            dashboard

        );

        return dashboard;

    }

    /* --------------------------------------------------------
     * Register Widget
     * -------------------------------------------------------- */

    public async registerWidget(

        guildId:Snowflake,

        widget:any

    ){

        const dashboard=

            this.dashboard.get(

                guildId

            );

        if(

            !dashboard

        ){

            return false;

        }

        dashboard.widgets.push(

            widget

        );

        await this.database.updateDashboard(

            dashboard

        );

        this.emit(

            "widgetRegistered",

            widget.id

        );

        return true;

    }

    /* --------------------------------------------------------
     * Remove Widget
     * -------------------------------------------------------- */

    public async removeWidget(

        guildId:Snowflake,

        widgetId:string

    ){

        const dashboard=

            this.dashboard.get(

                guildId

            );

        if(

            !dashboard

        ){

            return false;

        }

        dashboard.widgets=

            dashboard.widgets.filter(

                widget=>

                    widget.id!==

                    widgetId

            );

        await this.database.updateDashboard(

            dashboard

        );

        this.emit(

            "widgetRemoved",

            widgetId

        );

        return true;

    }

    /* --------------------------------------------------------
     * Dashboard Overview
     * -------------------------------------------------------- */

    public getOverview(

        guildId:Snowflake

    ){

        return{

            dashboard:

                this.dashboard.get(

                    guildId

                ),

            tickets:

                this.tickets.getAll()

                    .filter(

                        ticket=>

                            ticket.guildId===

                            guildId

                    ).length,

            panels:

                this.panels.getAll()

                    .filter(

                        panel=>

                            panel.guildId===

                            guildId

                    ).length

        };

    }

    /* --------------------------------------------------------
     * Refresh Dashboard
     * -------------------------------------------------------- */

    public async refresh(

        guildId:Snowflake

    ){

        const dashboard=

            this.dashboard.get(

                guildId

            );

        if(

            !dashboard

        ){

            return false;

        }

        dashboard.lastRefresh=

            Date.now();

        await this.database.updateDashboard(

            dashboard

        );

        this.emit(

            "dashboardRefreshed",

            guildId

        );

        return true;

    }

    /* --------------------------------------------------------
     * Broadcast Update
     * -------------------------------------------------------- */

    public broadcast(

        guildId:Snowflake,

        event:string,

        payload:any

    ){

        this.emit(

            "dashboardBroadcast",

            {

                guildId,

                event,

                payload

            }

        );

    }
      /* --------------------------------------------------------
     * Dashboard Analytics
     * -------------------------------------------------------- */

    public getAnalytics(

        guildId:Snowflake

    ){

        const tickets=

            this.tickets.getAll()

                .filter(

                    ticket=>

                        ticket.guildId===

                        guildId

                );

        const panels=

            this.panels.getAll()

                .filter(

                    panel=>

                        panel.guildId===

                        guildId

                );

        return{

            totalTickets:

                tickets.length,

            openTickets:

                tickets.filter(

                    ticket=>

                        !ticket.closed

                ).length,

            closedTickets:

                tickets.filter(

                    ticket=>

                        ticket.closed

                ).length,

            totalPanels:

                panels.length

        };

    }

    /* --------------------------------------------------------
     * Open Session
     * -------------------------------------------------------- */

    public async openSession(

        guildId:Snowflake,

        user:User

    ){

        const session={

            guildId,

            userId:

                user.id,

            startedAt:

                Date.now()

        };

        this.cache.set(

            `dashboard:${user.id}`,

            session

        );

        this.emit(

            "sessionOpened",

            session

        );

        return session;

    }

    /* --------------------------------------------------------
     * Close Session
     * -------------------------------------------------------- */

    public closeSession(

        userId:Snowflake

    ){

        this.cache.delete(

            `dashboard:${userId}`

        );

        this.emit(

            "sessionClosed",

            userId

        );

    }

    /* --------------------------------------------------------
     * Check Dashboard Access
     * -------------------------------------------------------- */

    public hasAccess(

        guildId:Snowflake,

        userId:Snowflake

    ){

        const dashboard=

            this.dashboard.get(

                guildId

            );

        if(

            !dashboard

        ){

            return false;

        }

        return dashboard.admins.includes(

            userId

        );

    }

    /* --------------------------------------------------------
     * Export Dashboard
     * -------------------------------------------------------- */

    public exportDashboard(

        guildId:Snowflake

    ){

        return this.dashboard.get(

            guildId

        );

    }

    /* --------------------------------------------------------
     * Import Dashboard
     * -------------------------------------------------------- */

    public async importDashboard(

        data:any

    ){

        this.dashboard.register(

            data

        );

        await this.database.saveDashboard(

            data

        );

        this.emit(

            "dashboardImported",

            data.guildId

        );

    }
      /* --------------------------------------------------------
     * Synchronize Dashboards
     * -------------------------------------------------------- */

    public async synchronize(){

        const dashboards=

            this.dashboard.getAll();

        for(

            const dashboard

            of

            dashboards

        ){

            await this.database.updateDashboard(

                dashboard

            );

        }

        this.emit(

            "dashboardsSynchronized",

            dashboards.length

        );

    }

    /* --------------------------------------------------------
     * Global Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        const dashboards=

            this.dashboard.getAll();

        return{

            totalDashboards:

                dashboards.length,

            activeDashboards:

                dashboards.filter(

                    dashboard=>

                        dashboard.enabled

                ).length,

            disabledDashboards:

                dashboards.filter(

                    dashboard=>

                        !dashboard.enabled

                ).length,

            cachedDashboards:

                this.cache.size()

        };

    }

    /* --------------------------------------------------------
     * Reload
     * -------------------------------------------------------- */

    public async reload(){

        this.cache.clear();

        this.dashboard.clear();

        await this.restoreDashboards();

        this.emit(

            "reloaded"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.cache.clear();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public async shutdown(){

        await this.synchronize();

        this.cleanup();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
