import {
    Snowflake,
    User
} from "discord.js";

import {
    Dashboard,
    DashboardStatistics,
    DashboardWidget,
    DashboardSettings,
    CreateDashboardOptions
} from "../types/Dashboard";

export interface DashboardService{

    /* --------------------------------------------------------
     * Dashboard
     * -------------------------------------------------------- */

    createDashboard(

        options:CreateDashboardOptions

    ):Promise<Dashboard>;

    openDashboard(

        guildId:Snowflake

    ):Promise<Dashboard|null>;

    saveDashboard(

        guildId:Snowflake

    ):Promise<boolean>;

    /* --------------------------------------------------------
     * Widgets
     * -------------------------------------------------------- */

    registerWidget(

        guildId:Snowflake,

        widget:DashboardWidget

    ):Promise<boolean>;

    removeWidget(

        guildId:Snowflake,

        widgetId:string

    ):Promise<boolean>;

    /* --------------------------------------------------------
     * Settings
     * -------------------------------------------------------- */

    updateSettings(

        guildId:Snowflake,

        settings:Partial<DashboardSettings>

    ):Promise<Dashboard|null>;

    /* --------------------------------------------------------
     * Sessions
     * -------------------------------------------------------- */

    openSession(

        guildId:Snowflake,

        user:User

    ):Promise<unknown>;

    closeSession(

        userId:Snowflake

    ):void;

    /* --------------------------------------------------------
     * Analytics
     * -------------------------------------------------------- */

    getStatistics():DashboardStatistics;

    getAnalytics(

        guildId:Snowflake

    ):unknown;

}
