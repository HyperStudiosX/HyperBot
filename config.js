/*
============================================================
PetroV2 Dashboard Configuration
Created by HyperForgeX
Copyright © 2026 HyperForgeX. All rights reserved.
============================================================
*/

import "dotenv/config";

function numberEnv(name, fallback = 0) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) ? value : fallback;
}

function stringEnv(name, fallback = "") {
    const value = process.env[name];
    return value == null ? fallback : String(value).trim();
}

function listEnv(name) {
    return stringEnv(name)
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
}

const config = {
    DASHBOARD_ENABLED:
        stringEnv("DASHBOARD_ENABLED", "true").toLowerCase() === "true",

    DASHBOARD_HOST:
        stringEnv("DASHBOARD_HOST", "0.0.0.0"),

    DASHBOARD_PORT:
        numberEnv("DASHBOARD_PORT", 3000),

    DASHBOARD_URL:
        stringEnv("DASHBOARD_URL", "http://localhost:3000"),

    DISCORD_CLIENT_SECRET:
        stringEnv("DISCORD_CLIENT_SECRET"),

    DISCORD_REDIRECT_URI:
        stringEnv(
            "DISCORD_REDIRECT_URI",
            "http://localhost:3000/auth/discord/callback"
        ),

    DASHBOARD_SESSION_SECRET:
        stringEnv(
            "DASHBOARD_SESSION_SECRET",
            "change-this-secret"
        ),

    DISCORD_TOKEN:
        stringEnv("DISCORD_TOKEN"),

    DISCORD_CLIENT_ID:
        stringEnv("DISCORD_CLIENT_ID"),

    DISCORD_GUILD_ID:
        stringEnv("DISCORD_GUILD_ID"),

    PREFIX:
        stringEnv("PREFIX", "!"),

    PTERODACTYL_URL:
        stringEnv("PTERODACTYL_URL").replace(/\/$/, ""),

    PTERODACTYL_API_KEY:
        stringEnv("PTERODACTYL_API_KEY"),

    PTERODACTYL_CLIENT_API_KEY:
        stringEnv("PTERODACTYL_CLIENT_API_KEY"),

    PTERODACTYL_NODE_ID:
        numberEnv("PTERODACTYL_NODE_ID", 0),

    PTERODACTYL_LOCATION_ID:
        numberEnv("PTERODACTYL_LOCATION_ID", 0),

    PTERODACTYL_NEST_ID:
        numberEnv("PTERODACTYL_NEST_ID", 1),

    PTERODACTYL_EGG_ID:
        numberEnv("PTERODACTYL_EGG_ID", 1),

    PTERODACTYL_MINECRAFT_VERSION:
        stringEnv("PTERODACTYL_MINECRAFT_VERSION", "latest"),

    PTERODACTYL_SERVER_JARFILE:
        stringEnv("PTERODACTYL_SERVER_JARFILE", "server.jar"),

    PTERODACTYL_TIMEZONE:
        stringEnv("PTERODACTYL_TIMEZONE", "Asia/Kolkata"),

    PTERODACTYL_DOCKER_IMAGE:
        stringEnv("PTERODACTYL_DOCKER_IMAGE"),

    PTERODACTYL_STARTUP:
        stringEnv("PTERODACTYL_STARTUP"),

    PTERODACTYL_USER_EMAIL_DOMAIN:
        stringEnv("PTERODACTYL_USER_EMAIL_DOMAIN"),

    BOT_ADMIN_IDS:
        stringEnv("BOT_ADMIN_IDS"),

    DEPLOY_COOLDOWN_SECONDS:
        numberEnv("DEPLOY_COOLDOWN_SECONDS", 30),

    DEFAULT_COINS:
        numberEnv("DEFAULT_COINS", 0),

    LOG_CHANNEL_ID:
        stringEnv("LOG_CHANNEL_ID"),

    OWNER_ID:
        stringEnv("OWNER_ID"),

    LINK_WEBSITE:
        stringEnv("LINK_WEBSITE"),

    LINK_DISCORD:
        stringEnv("LINK_DISCORD"),

    LINK_PANEL:
        stringEnv(
            "LINK_PANEL",
            "https://free.zapnodes.site"
        ),

    LINK_BILLING:
        stringEnv("LINK_BILLING"),

    LINK_STATUS:
        stringEnv("LINK_STATUS"),

    LINK_STORE:
        stringEnv("LINK_STORE"),

    REWARD_1_URL:
        stringEnv("REWARD_1_URL"),

    REWARD_2_URL:
        stringEnv("REWARD_2_URL"),

    REWARD_3_URL:
        stringEnv("REWARD_3_URL"),

    REWARD_4_URL:
        stringEnv("REWARD_4_URL"),

    PERMISSIONS: {},

    dataDirectory:
        stringEnv("DATA_DIRECTORY", "./data"),

    eggEnvironment: {}
};

/*
============================================================
Pterodactyl Egg Environment Variables
============================================================
*/

for (const [key, value] of Object.entries(process.env)) {
    if (
        key.startsWith("PTERODACTYL_EGG_VAR_") &&
        value != null
    ) {
        config.eggEnvironment[
            key.slice("PTERODACTYL_EGG_VAR_".length)
        ] = String(value);
    }
}

/*
============================================================
Compatibility aliases
============================================================
*/

config.dashboardEnabled =
    config.DASHBOARD_ENABLED;

config.dashboardHost =
    config.DASHBOARD_HOST;

config.dashboardPort =
    config.DASHBOARD_PORT;

config.dashboardUrl =
    config.DASHBOARD_URL;

config.discordClientSecret =
    config.DISCORD_CLIENT_SECRET;

config.discordRedirectUri =
    config.DISCORD_REDIRECT_URI;

config.dashboardSessionSecret =
    config.DASHBOARD_SESSION_SECRET;

config.discordToken =
    config.DISCORD_TOKEN;

config.discordClientId =
    config.DISCORD_CLIENT_ID;

config.discordGuildId =
    config.DISCORD_GUILD_ID;

config.linkWebsite =
    config.LINK_WEBSITE;

config.linkDiscord =
    config.LINK_DISCORD;

config.linkPanel =
    config.LINK_PANEL;

config.prefix =
    config.PREFIX;

config.pterodactylUrl =
    config.PTERODACTYL_URL;

config.pterodactylApiKey =
    config.PTERODACTYL_API_KEY;

config.pterodactylClientApiKey =
    config.PTERODACTYL_CLIENT_API_KEY;

config.pterodactylNodeId =
    config.PTERODACTYL_NODE_ID;

config.pterodactylLocationId =
    config.PTERODACTYL_LOCATION_ID;

config.pterodactylNestId =
    config.PTERODACTYL_NEST_ID;

config.pterodactylEggId =
    config.PTERODACTYL_EGG_ID;

config.pterodactylMinecraftVersion =
    config.PTERODACTYL_MINECRAFT_VERSION;

config.pterodactylServerJarfile =
    config.PTERODACTYL_SERVER_JARFILE;

config.pterodactylTimezone =
    config.PTERODACTYL_TIMEZONE;

config.pterodactylDockerImage =
    config.PTERODACTYL_DOCKER_IMAGE;

config.pterodactylStartup =
    config.PTERODACTYL_STARTUP;

config.pterodactylUserEmailDomain =
    config.PTERODACTYL_USER_EMAIL_DOMAIN;

config.botAdminIds =
    listEnv("BOT_ADMIN_IDS");

/*
============================================================
Exports
============================================================
*/

export { config };
export default config;

/*
============================================================
End of config.js
Created by HyperForgeX
Copyright © 2026 HyperForgeX. All rights reserved.
============================================================
*/