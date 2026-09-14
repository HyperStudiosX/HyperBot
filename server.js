/*
============================================================
 PetroV2 Dashboard Server
 Created by HyperForgeX
 Copyright © 2026 HyperForgeX. All rights reserved.
============================================================
*/

import express from "express";
import session from "express-session";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import config from "../config.js";
import database from "../database.js";
import serverManager from "../services/serverManager.js";
import { getAllPlans } from "../plans.js";
import { isBotAdmin } from "../utils/permissions.js";
import { loginToPanel } from "./panelAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.resolve(__dirname, "..");

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "1mb"
}));

/*
============================================================
 SESSION
============================================================
*/

app.use(
    session({
        secret:
            config.DASHBOARD_SESSION_SECRET ||
            crypto.randomBytes(32).toString("hex"),

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure:
                String(config.DASHBOARD_URL || "")
                    .startsWith("https://"),
            maxAge:
                1000 *
                60 *
                60 *
                24 *
                7
        }
    })
);

/*
============================================================
 HELPERS
============================================================
*/

function clean(value, max = 255) {
    return String(value ?? "")
        .trim()
        .slice(0, max);
}

function normalizeEmail(value) {
    return clean(value, 320).toLowerCase();
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function safeMetadata(value) {
    try {
        if (typeof value === "string") {
            return JSON.parse(value || "{}");
        }

        return value || {};
    } catch {
        return {};
    }
}

function json(res, status, data) {
    return res.status(status).json(data);
}

function sendError(res, error, status = 500) {
    console.error("[Dashboard]", error);

    return res.status(status).json({
        error:
            error?.message ||
            "An unexpected error occurred."
    });
}

/*
============================================================
 USER / SESSION HELPERS
============================================================
*/

function getSessionUser(req) {
    const userId =
        Number(
            req.session?.localUserId || 0
        );

    if (userId > 0) {
        if (
            typeof database.getUserById ===
            "function"
        ) {
            return database.getUserById(userId);
        }
    }

    const email =
        normalizeEmail(
            req.session?.panelEmail
        );

    if (!email) {
        return null;
    }

    if (
        typeof database.getUserByEmail ===
        "function"
    ) {
        return database.getUserByEmail(email);
    }

    return null;
}

function identityFor(req) {
    const user =
        getSessionUser(req);

    return String(
        user?.discord_id ||
        req.session?.panelIdentity ||
        user?.pterodactyl_id ||
        ""
    );
}

function requireLogin(req, res, next) {
    if (
        !req.session?.panelAuthenticated ||
        !req.session?.panelEmail
    ) {
        return json(
            res,
            401,
            {
                error: "AUTH_REQUIRED",
                message:
                    "You must log in with your Pterodactyl Panel account."
            }
        );
    }

    req.dashboardUser =
        getSessionUser(req);

    next();
}

function requireUser(req, res, next) {
    return requireLogin(
        req,
        res,
        () => {
            if (!req.dashboardUser) {
                return json(
                    res,
                    500,
                    {
                        error:
                            "DASHBOARD_USER_NOT_FOUND"
                    }
                );
            }

            next();
        }
    );
}

function requireAdmin(req, res, next) {
    const identity =
        identityFor(req);

    if (
        !identity ||
        typeof isBotAdmin !==
            "function" ||
        !isBotAdmin(identity)
    ) {
        return json(
            res,
            403,
            {
                error: "FORBIDDEN",
                message:
                    "Administrator access is required."
            }
        );
    }

    next();
}

/*
============================================================
 USER CREATION / SYNC
============================================================
*/

function ensureLocalUser(
    email,
    panelAccount = {}
) {
    const normalizedEmail =
        normalizeEmail(email);

    if (!normalizedEmail) {
        throw new Error(
            "Invalid panel email."
        );
    }

    let user =
        typeof database.getUserByEmail ===
        "function"
            ? database.getUserByEmail(
                  normalizedEmail
              )
            : null;

    if (user) {
        return user;
    }

    /*
     * Dashboard users are associated with a
     * stable internal panel identity until
     * they have a Discord identity.
     */

    const syntheticId =
        `panel:${normalizedEmail}`;

    if (
        typeof database.createUser !==
        "function"
    ) {
        throw new Error(
            "Database createUser() is unavailable."
        );
    }

    try {
        user =
            database.createUser(
                syntheticId,

                panelAccount.username ||
                    normalizedEmail,

                normalizedEmail,

                {
                    pterodactylEmail:
                        normalizedEmail,

                    pterodactylUsername:
                        panelAccount.username ||
                        normalizedEmail,

                    firstName:
                        panelAccount.firstName ||
                        null,

                    lastName:
                        panelAccount.lastName ||
                        null,

                    metadata: {
                        source:
                            "pterodactyl-panel"
                    }
                }
            );
    } catch (error) {
        user =
            typeof database.getUserByEmail ===
            "function"
                ? database.getUserByEmail(
                      normalizedEmail
                  )
                : null;

        if (!user) {
            throw error;
        }
    }

    return user;
}

/*
============================================================
 PUBLIC USER
============================================================
*/

function userReferralCode(user) {
    if (!user) {
        return "";
    }

    const metadata =
        safeMetadata(
            user.metadata
        );

    if (
        metadata.referralCode
    ) {
        return String(
            metadata.referralCode
        );
    }

    if (
        user.referral_code
    ) {
        return String(
            user.referral_code
        );
    }

    const source =
        String(
            user.email ||
            user.pterodactyl_email ||
            user.discord_id ||
            user.id ||
            "user"
        );

    const hash =
        crypto
            .createHash("sha256")
            .update(source)
            .digest("hex")
            .slice(0, 10)
            .toUpperCase();

    return `PETRO-${hash}`;
}

function publicUser(user) {
    if (!user) {
        return null;
    }

    const metadata =
        safeMetadata(
            user.metadata
        );

    const discordId =
        String(
            user.discord_id || ""
        );

    const isPanelOnly =
        discordId.startsWith(
            "panel:"
        );

    return {
        id: user.id,

        username:
            user.pterodactyl_username ||
            user.username ||
            user.email ||
            "User",

        email:
            user.pterodactyl_email ||
            user.email ||
            "",

        firstName:
            user.first_name ||
            "",

        lastName:
            user.last_name ||
            "",

        referralCode:
            userReferralCode(user),

        discord:
            discordId &&
            !isPanelOnly
                ? {
                      id: discordId,
                      username:
                          user.username ||
                          null,
                      avatar:
                          metadata.avatar ||
                          null
                  }
                : null,

        rootAdmin:
            Boolean(
                user.root_admin ||
                user.rootAdmin ||
                isBotAdmin(
                    discordId
                )
            )
    };
}

/*
============================================================
 AUTHENTICATION
============================================================
*/

/*
 * Dashboard registration is disabled.
 *
 * Accounts must be created in the
 * Pterodactyl Panel.
 */

function registrationDisabled(
    req,
    res
) {
    return json(
        res,
        410,
        {
            error:
                "PANEL_REGISTRATION_ONLY",

            message:
                "Dashboard registration is disabled. Create your account on the Pterodactyl Panel and use those credentials here."
        }
    );
}

app.post(
    "/auth/register",
    registrationDisabled
);

app.post(
    "/api/auth/register",
    registrationDisabled
);

/*
============================================================
 PANEL LOGIN
============================================================
*/

async function panelLogin(
    req,
    res
) {
    try {
        const email =
            normalizeEmail(
                req.body?.email ||
                req.body?.login ||
                req.body?.username
            );

        const password =
            String(
                req.body?.password ||
                ""
            );

        if (!email || !password) {
            return json(
                res,
                400,
                {
                    error:
                        "EMAIL_AND_PASSWORD_REQUIRED",
                    message:
                        "Email/username and password are required."
                }
            );
        }

        /*
         * Authenticate directly against
         * the Pterodactyl Panel.
         */
        const panel =
            await loginToPanel(
                email,
                password
            );

        if (!panel) {
            return json(
                res,
                401,
                {
                    error:
                        "PANEL_LOGIN_FAILED",
                    message:
                        "Invalid Pterodactyl Panel credentials."
                }
            );
        }

        const panelAccount =
            panel.account ||
            panel.user ||
            {};

        const user =
            ensureLocalUser(
                email,
                panelAccount
            );

        req.session.panelAuthenticated =
            true;

        req.session.panelEmail =
            email;

        req.session.panelCookies =
            panel.cookies ||
            "";

        req.session.panelIdentity =
            panelAccount.id
                ? String(
                      panelAccount.id
                  )
                : "";

        req.session.localUserId =
            user?.id || null;

        return json(
            res,
            200,
            {
                success: true,
                authenticated: true,
                user:
                    publicUser(user)
            }
        );
    } catch (error) {
        console.error(
            "[Dashboard Auth] Panel login failed:",
            error
        );

        return json(
            res,
            error?.status === 401 ||
                error?.status === 403
                ? 401
                : 500,
            {
                error:
                    error?.status ===
                        401 ||
                    error?.status ===
                        403
                        ? "INVALID_PANEL_CREDENTIALS"
                        : "AUTHENTICATION_ERROR",

                message:
                    error?.status ===
                        401 ||
                    error?.status ===
                        403
                        ? "Invalid Pterodactyl Panel email or password."
                        : error?.message ||
                          "Unable to authenticate with the Pterodactyl Panel."
            }
        );
    }
}

/*
 * Frontend uses this route.
 */
app.post(
    "/api/auth/login",
    panelLogin
);

/*
 * Compatibility route.
 */
app.post(
    "/auth/login",
    panelLogin
);

/*
============================================================
 AUTH ME
============================================================
*/

function authMe(
    req,
    res
) {
    if (
        !req.session?.panelAuthenticated
    ) {
        return json(
            res,
            200,
            {
                authenticated: false,
                user: null
            }
        );
    }

    const user =
        getSessionUser(req);

    if (!user) {
        req.session.destroy(
            () => {}
        );

        return json(
            res,
            200,
            {
                authenticated: false,
                user: null
            }
        );
    }

    return json(
        res,
        200,
        {
            authenticated: true,
            user:
                publicUser(user)
        }
    );
}

app.get(
    "/api/auth/me",
    authMe
);

/*
============================================================
 LOGOUT
============================================================
*/

function logout(
    req,
    res
) {
    req.session.destroy(
        error => {
            if (error) {
                console.error(
                    "[Dashboard Auth] Logout error:",
                    error
                );

                return json(
                    res,
                    500,
                    {
                        error:
                            "LOGOUT_FAILED"
                    }
                );
            }

            res.clearCookie(
                "connect.sid"
            );

            return json(
                res,
                200,
                {
                    success: true,
                    authenticated:
                        false
                }
            );
        }
    );
}

app.get(
    "/api/auth/logout",
    logout
);

app.post(
    "/api/auth/logout",
    logout
);

app.get(
    "/auth/logout",
    logout
);

/*
============================================================
 SESSION INFO
============================================================
*/

app.get(
    "/api/session",
    requireUser,
    (req, res) => {
        return json(
            res,
            200,
            {
                authenticated: true,
                user:
                    publicUser(
                        req.dashboardUser
                    )
            }
        );
    }
);

/*
============================================================
 DASHBOARD
============================================================
*/

app.get(
    "/api/dashboard",
    requireUser,
    (req, res) => {
        try {
            const user =
                req.dashboardUser;

            const identity =
                identityFor(req);

            const coins =
                typeof database.getCoins ===
                "function"
                    ? database.getCoins(
                          identity
                    )
                    : 0;

            const resources =
                typeof database.getUserResources ===
                "function"
                    ? database.getUserResources(
                          identity
                      )
                    : {
                          ram: 0,
                          cpu: 0,
                          disk: 0,
                          allocations: 0,
                          databases: 0,
                          backups: 0,
                          server_slots: 0
                      };

            const servers =
                typeof database.getUserServers ===
                "function"
                    ? database.getUserServers(
                          identity
                      )
                    : [];

            return json(
                res,
                200,
                {
                    user:
                        publicUser(user),

                    balance:
                        safeNumber(
                            coins
                        ),

                    coins:
                        safeNumber(
                            coins
                        ),

                    resources:
                        resources || {},

                    servers:
                        servers || [],

                    serverCount:
                        Array.isArray(
                            servers
                        )
                            ? servers.length
                            : 0,

                    economy:
                        typeof database.getLifetimeCoinStats ===
                        "function"
                            ? database.getLifetimeCoinStats(identity)
                            : {
                                  balance: safeNumber(coins),
                                  lifetimeEarned: 0,
                                  lifetimeSpent: 0
                              },

                    transactions:
                        typeof database.getTransactions ===
                        "function"
                            ? database.getTransactions(identity, 8)
                            : [],

                    referral: {
                        code: userReferralCode(user),
                        ...(safeMetadata(user.metadata) || {})
                    },

                    afk:
                        typeof database.getAfkStatus ===
                        "function"
                            ? database.getAfkStatus(identity)
                            : { active: false, rate: 5 }
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 PROFILE
============================================================
*/

app.get(
    "/api/profile",
    requireUser,
    (req, res) => {
        return json(
            res,
            200,
            {
                success: true,
                user:
                    publicUser(
                        req.dashboardUser
                    )
            }
        );
    }
);

/*
============================================================
 RESOURCES
============================================================
*/

app.get(
    "/api/resources",
    requireUser,
    (req, res) => {
        try {
            const identity =
                identityFor(req);

            const resources =
                typeof database.getUserResources ===
                "function"
                    ? database.getUserResources(
                          identity
                      )
                    : {};

            return json(
                res,
                200,
                {
                    success: true,
                    resources:
                        resources || {}
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 SERVERS
============================================================
*/

function getOwnedServers(
    identity
) {
    if (
        typeof database.getUserServers ===
        "function"
    ) {
        return (
            database.getUserServers(
                identity
            ) || []
        );
    }

    if (
        typeof database.findUserServers ===
        "function"
    ) {
        return (
            database.findUserServers(
                identity
            ) || []
        );
    }

    return [];
}

app.get(
    "/api/servers",
    requireUser,
    (req, res) => {
        try {
            const identity =
                identityFor(req);

            return json(
                res,
                200,
                {
                    success: true,
                    servers:
                        getOwnedServers(
                            identity
                        )
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 SERVER LOOKUP
============================================================
*/

function ownedServer(
    req,
    id
) {
    const identity =
        identityFor(req);

    const serverId =
        String(id || "");

    if (
        !identity ||
        !serverId
    ) {
        return null;
    }

    /*
     * Prefer serverManager when available.
     */
    if (
        typeof serverManager
            ?.requireServerOwner ===
        "function"
    ) {
        try {
            return serverManager.requireServerOwner(
                identity,
                serverId
            );
        } catch {
            return null;
        }
    }

    if (
        typeof database.getServerForUser ===
        "function"
    ) {
        return database.getServerForUser(
            identity,
            serverId
        );
    }

    if (
        typeof database.getServerById ===
        "function"
    ) {
        const server =
            database.getServerById(
                serverId
            );

        if (
            server &&
            String(
                server.discord_id ||
                server.user_id ||
                server.owner_id ||
                ""
            ) === identity
        ) {
            return server;
        }
    }

    return null;
}

/*
============================================================
 SERVER DETAIL
============================================================
*/

app.get(
    "/api/servers/:id",
    requireUser,
    (req, res) => {
        try {
            const server =
                ownedServer(
                    req,
                    req.params.id
                );

            if (!server) {
                return json(
                    res,
                    404,
                    {
                        error:
                            "SERVER_NOT_FOUND"
                    }
                );
            }

            return json(
                res,
                200,
                {
                    success: true,
                    server
                }
            );
        } catch (error) {
            return sendError(
                res,
                error,
                404
            );
        }
    }
);

/*
============================================================
 SERVER STATUS
============================================================
*/

app.get(
    "/api/servers/:id/status",
    requireUser,
    async (req, res) => {
        try {
            const server =
                ownedServer(
                    req,
                    req.params.id
                );

            if (!server) {
                return json(
                    res,
                    404,
                    {
                        error:
                            "SERVER_NOT_FOUND"
                    }
                );
            }

            let status =
                server.status ||
                "unknown";

            if (
                typeof serverManager
                    ?.getServerStatus ===
                "function"
            ) {
                status =
                    await serverManager.getServerStatus(
                        server
                    );
            }

            return json(
                res,
                200,
                {
                    success: true,
                    status
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 SERVER POWER
============================================================
*/

app.post(
    "/api/servers/:id/power",
    requireUser,
    async (req, res) => {
        try {
            const server =
                ownedServer(
                    req,
                    req.params.id
                );

            if (!server) {
                return json(
                    res,
                    404,
                    {
                        error:
                            "SERVER_NOT_FOUND"
                    }
                );
            }

            const action =
                clean(
                    req.body?.action,
                    30
                ).toLowerCase();

            const allowed = [
                "start",
                "stop",
                "restart",
                "kill"
            ];

            if (
                !allowed.includes(
                    action
                )
            ) {
                return json(
                    res,
                    400,
                    {
                        error:
                            "INVALID_POWER_ACTION"
                    }
                );
            }

            if (
                typeof serverManager
                    ?.powerServer !==
                "function"
            ) {
                return json(
                    res,
                    501,
                    {
                        error:
                            "POWER_CONTROL_UNAVAILABLE"
                    }
                );
            }

            const result =
                await serverManager.powerServer(
                    server,
                    action
                );

            return json(
                res,
                200,
                {
                    success: true,
                    action,
                    result:
                        result ?? null
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 SERVER RENAME
============================================================
*/

app.post(
    "/api/servers/:id/rename",
    requireUser,
    async (req, res) => {
        try {
            const server =
                ownedServer(
                    req,
                    req.params.id
                );

            if (!server) {
                return json(
                    res,
                    404,
                    {
                        error:
                            "SERVER_NOT_FOUND"
                    }
                );
            }

            const name =
                clean(
                    req.body?.name,
                    100
                );

            if (!name) {
                return json(
                    res,
                    400,
                    {
                        error:
                            "SERVER_NAME_REQUIRED"
                    }
                );
            }

            if (
                typeof serverManager
                    ?.renameServer ===
                "function"
            ) {
                const result =
                    await serverManager.renameServer(
                        server,
                        name
                    );

                return json(
                    res,
                    200,
                    {
                        success: true,
                        server:
                            result ||
                            server
                    }
                );
            }

            if (
                typeof database.renameServer ===
                "function"
            ) {
                const result =
                    database.renameServer(
                        server.id,
                        name
                    );

                return json(
                    res,
                    200,
                    {
                        success: true,
                        server:
                            result ||
                            server
                    }
                );
            }

            return json(
                res,
                501,
                {
                    error:
                        "RENAME_UNAVAILABLE"
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 PLANS
============================================================
*/

app.get(
    "/api/plans",
    requireUser,
    (req, res) => {
        try {
            let plans = [];

            if (
                typeof database.listPlans ===
                "function"
            ) {
                plans =
                    database.listPlans({
                        enabledOnly: true,
                        limit: 5
                    }) || [];
            } else if (
                typeof database.getPlans ===
                "function"
            ) {
                plans =
                    database.getPlans() || [];
            } else if (
                typeof getAllPlans ===
                "function"
            ) {
                plans =
                    getAllPlans() || [];
            }

            /*
             * Dashboard should only show
             * the five configured plans.
             */
            plans =
                Array.isArray(plans)
                    ? plans.slice(0, 5)
                    : [];

            return json(
                res,
                200,
                {
                    success: true,
                    plans
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 PLAN PURCHASE
============================================================
*/

app.post(
    "/api/plans/:id/purchase",
    requireUser,
    async (req, res) => {
        try {
            const identity =
                identityFor(req);

            const planId =
                clean(
                    req.params.id,
                    100
                );

            if (!planId) {
                return json(
                    res,
                    400,
                    {
                        error:
                            "PLAN_ID_REQUIRED"
                    }
                );
            }

            if (
                typeof database.purchasePlan ===
                "function"
            ) {
                const result =
                    database.purchasePlan(
                        identity,
                        planId
                    );

                return json(
                    res,
                    200,
                    {
                        success: true,
                        purchase:
                            result
                    }
                );
            }

            if (
                typeof database.buyPlan ===
                "function"
            ) {
                const result =
                    database.buyPlan(
                        identity,
                        planId
                    );

                return json(
                    res,
                    200,
                    {
                        success: true,
                        purchase:
                            result
                    }
                );
            }

            return json(
                res,
                501,
                {
                    error:
                        "PLAN_PURCHASE_UNAVAILABLE"
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 ECONOMY
============================================================
*/

app.get(
    "/api/economy",
    requireUser,
    (req, res) => {
        try {
            const identity =
                identityFor(req);

            const balance =
                typeof database.getCoins ===
                "function"
                    ? database.getCoins(
                          identity
                      )
                    : 0;

            const transactions =
                typeof database.getTransactions ===
                "function"
                    ? database.getTransactions(
                          identity,
                          20
                      )
                    : [];

            const resources =
                typeof database.getUserResources ===
                "function"
                    ? database.getUserResources(
                          identity
                      )
                    : {};

            return json(
                res,
                200,
                {
                    success: true,

                    balance:
                        safeNumber(
                            balance
                        ),

                    coins:
                        safeNumber(
                            balance
                        ),

                    resources:
                        resources || {},

                    economy:
                        typeof database.getLifetimeCoinStats ===
                        "function"
                            ? database.getLifetimeCoinStats(identity)
                            : {},

                    resourceTransactions:
                        typeof database.getResourceTransactions ===
                        "function"
                            ? database.getResourceTransactions(identity, 20)
                            : [],

                    planPurchases:
                        typeof database.getPlanPurchases ===
                        "function"
                            ? database.getPlanPurchases(identity, 20)
                            : [],

                    transactions:
                        transactions || []
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 TRANSACTION HISTORY
============================================================
*/

app.get(
    "/api/economy/transactions",
    requireUser,
    (req, res) => {
        try {
            const identity = identityFor(req);
            const transactions =
                typeof database.getTransactions === "function"
                    ? database.getTransactions(identity, 100)
                    : [];

            return json(res, 200, {
                success: true,
                transactions
            });
        } catch (error) {
            return sendError(res, error);
        }
    }
);

/*
============================================================
 REDEEM
============================================================
*/

app.post(
    "/api/redeem",
    requireUser,
    (req, res) => {
        try {
            const code =
                clean(
                    req.body?.code,
                    100
                ).toUpperCase();

            if (!code) {
                return json(
                    res,
                    400,
                    {
                        error:
                            "CODE_REQUIRED"
                    }
                );
            }

            const identity =
                identityFor(req);

            if (
                typeof database.redeemCode !==
                "function"
            ) {
                return json(
                    res,
                    501,
                    {
                        error:
                            "REDEEM_UNAVAILABLE"
                    }
                );
            }

            const result =
                database.redeemCode(
                    identity,
                    code
                );

            return json(
                res,
                200,
                {
                    success: true,
                    result
                }
            );
        } catch (error) {
            return sendError(
                res,
                error,
                400
            );
        }
    }
);

/*
============================================================
 REDEEM HISTORY
============================================================
*/

app.get(
    "/api/redeem/history",
    requireUser,
    (req, res) => {
        try {
            const identity = identityFor(req);
            const history =
                typeof database.getRedeemedCodes === "function"
                    ? database.getRedeemedCodes(identity, 100)
                    : [];

            return json(res, 200, {
                success: true,
                history
            });
        } catch (error) {
            return sendError(res, error);
        }
    }
);

/*
============================================================
 AFK REWARDS
============================================================
*/

app.get(
    "/api/afk/status",
    requireUser,
    (req, res) => {
        try {
            const identity = identityFor(req);

            if (typeof database.getAfkStatus !== "function") {
                return json(res, 501, { error: "AFK_UNAVAILABLE" });
            }

            return json(res, 200, {
                success: true,
                afk: database.getAfkStatus(identity)
            });
        } catch (error) {
            return sendError(res, error);
        }
    }
);

app.post(
    "/api/afk/start",
    requireUser,
    (req, res) => {
        try {
            const identity = identityFor(req);

            if (typeof database.startAfkSession !== "function") {
                return json(res, 501, { error: "AFK_UNAVAILABLE" });
            }

            return json(res, 200, {
                success: true,
                afk: database.startAfkSession(identity),
                message: "AFK mode started. You earn 5 coins per second while this page stays active."
            });
        } catch (error) {
            return sendError(res, error, 400);
        }
    }
);

app.post(
    "/api/afk/heartbeat",
    requireUser,
    (req, res) => {
        try {
            const identity = identityFor(req);

            if (typeof database.heartbeatAfkSession !== "function") {
                return json(res, 501, { error: "AFK_UNAVAILABLE" });
            }

            return json(res, 200, {
                success: true,
                afk: database.heartbeatAfkSession(identity)
            });
        } catch (error) {
            return sendError(res, error, 400);
        }
    }
);

app.post(
    "/api/afk/stop",
    requireUser,
    (req, res) => {
        try {
            const identity = identityFor(req);

            if (typeof database.stopAfkSession !== "function") {
                return json(res, 501, { error: "AFK_UNAVAILABLE" });
            }

            return json(res, 200, {
                success: true,
                afk: database.stopAfkSession(identity),
                message: "AFK mode stopped."
            });
        } catch (error) {
            return sendError(res, error, 400);
        }
    }
);

/*
============================================================
 REWARDS
============================================================
*/

app.get(
    "/api/rewards",
    requireUser,
    (req, res) => {
        return json(
            res,
            200,
            {
                success: true,

                rewards: [
                    {
                        id: "afk",
                        name: "AFK Rewards",
                        enabled: false,
                        status:
                            "Coming Soon"
                    },
                    {
                        id: "linkvertise",
                        name:
                            "Linkvertise",
                        enabled: false,
                        status:
                            "Coming Soon"
                    },
                    {
                        id: "join4",
                        name:
                            "Join 4 Rewards",
                        enabled: false,
                        status:
                            "Coming Soon"
                    },
                    {
                        id: "referral",
                        name:
                            "Referral Rewards",
                        enabled: true,
                        status:
                            "Available"
                    }
                ]
            }
        );
    }
);

/*
============================================================
 REFERRAL
============================================================
*/

app.get(
    "/api/referral",
    requireUser,
    (req, res) => {
        try {
            const user =
                req.dashboardUser;

            const metadata =
                safeMetadata(
                    user.metadata
                );

            const code =
                userReferralCode(
                    user
                );

            return json(
                res,
                200,
                {
                    success: true,

                    referralCode:
                        code,

                    code,

                    referrals:
                        safeNumber(
                            metadata.referrals,
                            0
                        ),

                    earned:
                        safeNumber(
                            metadata.referralCoins,
                            0
                        )
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 GAMBLING
============================================================
*/

app.post(
    "/api/gamble",
    requireUser,
    (req, res) => {
        /*
         * Gambling functionality is intentionally
         * disabled.
         */
        return json(
            res,
            403,
            {
                error:
                    "GAMBLING_DISABLED",

                message:
                    "The gambling feature is currently disabled."
            }
        );
    }
);

/*
============================================================
 LINKVERTISE
============================================================
*/

app.post(
    "/api/linkvertise",
    requireUser,
    (req, res) => {
        return json(
            res,
            503,
            {
                error:
                    "LINKVERTISE_NOT_CONFIGURED",

                message:
                    "Linkvertise rewards are not configured yet."
            }
        );
    }
);

/*
============================================================
 SETTINGS
============================================================
*/

app.get(
    "/api/settings",
    requireUser,
    (req, res) => {
        try {
            const theme =
                typeof database.getSetting ===
                "function"
                    ? database.getSetting(
                          "global_theme"
                      )
                    : null;

            const panelName =
                typeof database.getSetting ===
                "function"
                    ? database.getSetting(
                          "panel_name"
                      )
                    : null;

            const panelLogo =
                typeof database.getSetting ===
                "function"
                    ? database.getSetting(
                          "panel_logo"
                      )
                    : null;

            const panelIcon =
                typeof database.getSetting ===
                "function"
                    ? database.getSetting(
                          "panel_icon"
                      )
                    : null;

            return json(
                res,
                200,
                {
                    success: true,

                    theme:
                        theme ||
                        "dark",

                    panelName:
                        panelName ||
                        "PetroV2",

                    panelLogo:
                        panelLogo || "",

                    panelIcon:
                        panelIcon || "",

                    panelUrl:
                        config.LINK_PANEL ||
                        "https://free.zapnodes.site"
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 ADMIN SETTINGS
============================================================
*/

function updateAdminSettings(
    req,
    res
) {
    try {
        const panelName =
            clean(
                req.body?.panelName,
                100
            );

        const panelLogo =
            clean(
                req.body?.panelLogo,
                500
            );

        const panelIcon =
            clean(
                req.body?.panelIcon,
                500
            );

        const theme =
            clean(
                req.body?.theme,
                30
            );

        if (
            typeof database.setSetting !==
            "function"
        ) {
            return json(
                res,
                501,
                {
                    error:
                        "SETTINGS_UNAVAILABLE"
                }
            );
        }

        if (panelName) {
            database.setSetting(
                "panel_name",
                panelName
            );
        }

        database.setSetting(
            "panel_logo",
            panelLogo
        );

        database.setSetting(
            "panel_icon",
            panelIcon
        );

        database.setSetting(
            "global_theme",
            theme || "dark"
        );

        return json(
            res,
            200,
            {
                success: true,
                panelName,
                panelLogo,
                panelIcon,
                theme:
                    theme || "dark"
            }
        );
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
}

app.post(
    "/api/admin/settings",
    requireUser,
    requireAdmin,
    updateAdminSettings
);

app.patch(
    "/api/admin/settings",
    requireUser,
    requireAdmin,
    updateAdminSettings
);

/*
============================================================
 ADMIN REDEEM CODES
============================================================
*/

app.get(
    "/api/admin/redeem-codes",
    requireUser,
    requireAdmin,
    (req, res) => {
        try {
            if (
                typeof database.listRedeemCodes !==
                "function"
            ) {
                return json(
                    res,
                    501,
                    {
                        error:
                            "REDEEM_LIST_UNAVAILABLE"
                    }
                );
            }

            const codes =
                database.listRedeemCodes({
                    limit: 100
                }) || [];

            return json(
                res,
                200,
                {
                    success: true,
                    codes
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

app.post(
    "/api/admin/redeem-codes",
    requireUser,
    requireAdmin,
    (req, res) => {
        try {
            if (
                typeof database.createRedeemCode !==
                "function"
            ) {
                return json(
                    res,
                    501,
                    {
                        error:
                            "REDEEM_CREATE_UNAVAILABLE"
                    }
                );
            }

            const type =
                clean(
                    req.body?.type,
                    30
                ).toLowerCase();

            const code =
                clean(
                    req.body?.code,
                    100
                ).toUpperCase();

            const amount =
                Math.max(
                    0,
                    Math.floor(
                        safeNumber(
                            req.body?.amount,
                            0
                        )
                    )
                );

            const data = {
                type:
                    type ||
                    "coins",

                code:
                    code || undefined,

                value: amount,

                ram:
                    safeNumber(
                        req.body?.ram,
                        0
                    ),

                cpu:
                    safeNumber(
                        req.body?.cpu,
                        0
                    ),

                disk:
                    safeNumber(
                        req.body?.disk,
                        0
                    ),

                allocations:
                    safeNumber(
                        req.body?.allocations,
                        0
                    ),

                databases:
                    safeNumber(
                        req.body?.databases,
                        0
                    ),

                backups:
                    safeNumber(
                        req.body?.backups,
                        0
                    ),

                server_slots:
                    safeNumber(
                        req.body?.server_slots ?? req.body?.serverSlots,
                        0
                    ),

                maxUses:
                    Math.max(
                        1,
                        Math.floor(
                            safeNumber(
                                req.body?.maxUses,
                                1
                            )
                        )
                    )
            };

            const created =
                database.createRedeemCode(
                    data
                );

            return json(
                res,
                200,
                {
                    success: true,
                    code: created?.code || null,
                    redeemCode: created
                }
            );
        } catch (error) {
            return sendError(
                res,
                error,
                400
            );
        }
    }
);

/*
============================================================
 ADMIN REDEEM CODE COMPATIBILITY
============================================================
*/

app.post(
    "/api/admin/redeem-code",
    requireUser,
    requireAdmin,
    (req, res) => {
        try {
            const type = clean(req.body?.type || "coins", 30).toLowerCase();
            const created = database.createRedeemCode({
                type,
                code: clean(req.body?.code, 100).toUpperCase() || undefined,
                value: safeNumber(req.body?.value ?? req.body?.amount, 0),
                ram: safeNumber(req.body?.ram, 0),
                cpu: safeNumber(req.body?.cpu, 0),
                disk: safeNumber(req.body?.disk, 0),
                backups: safeNumber(req.body?.backups, 0),
                allocations: safeNumber(req.body?.allocations, 0),
                databases: safeNumber(req.body?.databases, 0),
                server_slots: safeNumber(req.body?.server_slots ?? req.body?.serverSlots, 0),
                maxUses: Math.max(1, Math.floor(safeNumber(req.body?.maxUses, 1))),
                description: clean(req.body?.description, 1000),
                createdBy: identityFor(req)
            });

            return json(res, 200, {
                success: true,
                code: created?.code || null,
                redeemCode: created
            });
        } catch (error) {
            return sendError(res, error, 400);
        }
    }
);

/*
============================================================
 ADMIN USERS
============================================================
*/

app.get(
    "/api/admin/users",
    requireUser,
    requireAdmin,
    (req, res) => {
        try {
            if (
                typeof database.listUsers !==
                "function"
            ) {
                return json(
                    res,
                    501,
                    {
                        error:
                            "USER_LIST_UNAVAILABLE"
                    }
                );
            }

            const users =
                database.listUsers({
                    limit: 100
                }) || [];

            return json(
                res,
                200,
                {
                    success: true,
                    users
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 ADMIN OVERVIEW
============================================================
*/

app.get(
    "/api/admin/overview",
    requireUser,
    requireAdmin,
    (req, res) => {
        try {
            const stats =
                typeof database.getDatabaseStats === "function"
                    ? database.getDatabaseStats()
                    : {};

            const users =
                typeof database.listUsers === "function"
                    ? database.listUsers({ limit: 10000 })
                    : [];

            const totalCoins = users.reduce((sum, user) => {
                return sum + safeNumber(database.getCoins?.(user.discord_id), 0);
            }, 0);

            return json(res, 200, {
                success: true,
                overview: {
                    users: Array.isArray(users) ? users.length : 0,
                    coins: totalCoins,
                    database: stats
                }
            });
        } catch (error) {
            return sendError(res, error);
        }
    }
);

/*
============================================================
 ADMIN DATABASE / SYSTEM
============================================================
*/

app.get(
    "/api/admin/stats",
    requireUser,
    requireAdmin,
    (req, res) => {
        try {
            const stats =
                typeof database.getDatabaseStats ===
                "function"
                    ? database.getDatabaseStats()
                    : {};

            return json(
                res,
                200,
                {
                    success: true,
                    stats
                }
            );
        } catch (error) {
            return sendError(
                res,
                error
            );
        }
    }
);

/*
============================================================
 PANEL REDIRECT
============================================================
*/

app.get(
    "/api/panel",
    (req, res) => {
        return res.redirect(
            config.LINK_PANEL ||
                "https://free.zapnodes.site"
        );
    }
);

/*
============================================================
 HEALTH
============================================================
*/

app.get(
    "/api/health",
    (req, res) => {
        let databaseHealthy =
            true;

        try {
            if (
                typeof database.healthCheck ===
                "function"
            ) {
                databaseHealthy =
                    Boolean(
                        database.healthCheck()
                    );
            }
        } catch {
            databaseHealthy =
                false;
        }

        return json(
            res,
            databaseHealthy
                ? 200
                : 503,
            {
                status:
                    databaseHealthy
                        ? "ok"
                        : "degraded",

                dashboard:
                    "online",

                database:
                    databaseHealthy
                        ? "online"
                        : "offline",

                authentication:
                    "pterodactyl-panel"
            }
        );
    }
);

/*
============================================================
 STATIC FRONTEND
============================================================
*/

app.use(
    express.static(
        publicDirectory
    )
);

/*
 * Express 5 compatible SPA fallback.
 *
 * API routes have already been registered,
 * so this only serves index.html for frontend
 * navigation routes.
 */
app.use(
    (req, res, next) => {
        if (
            req.method !== "GET" ||
            req.path.startsWith(
                "/api/"
            )
        ) {
            return next();
        }

        return res.sendFile(
            path.join(
                publicDirectory,
                "index.html"
            )
        );
    }
);

/*
============================================================
 ERROR HANDLER
============================================================
*/

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "[Dashboard] Unhandled error:",
            error
        );

        if (
            res.headersSent
        ) {
            return next(error);
        }

        return json(
            res,
            500,
            {
                error:
                    error?.message ||
                    "Internal server error."
            }
        );
    }
);

/*
============================================================
 START DASHBOARD
============================================================
*/

let dashboardServer =
    null;

export function startDashboard() {
    if (
        !config.DASHBOARD_ENABLED
    ) {
        console.log(
            "[Dashboard] Disabled."
        );

        return null;
    }

    if (dashboardServer) {
        return dashboardServer;
    }

    const host =
        config.DASHBOARD_HOST ||
        "0.0.0.0";

    const port =
        Number(
            config.DASHBOARD_PORT ||
            3000
        );

    dashboardServer =
        app.listen(
            port,
            host,
            () => {
                console.log("");
                console.log(
                    "========================================"
                );
                console.log(
                    "🌐 PetroV2 Dashboard"
                );
                console.log(
                    `📡 ${
                        config.DASHBOARD_URL ||
                        `http://${host}:${port}`
                    }`
                );
                console.log(
                    `🔌 Port: ${port}`
                );
                console.log(
                    "🔐 Authentication: Pterodactyl Panel"
                );
                console.log(
                    "🚫 OAuth2: Disabled"
                );
                console.log(
                    "📝 Registration: Panel only"
                );
                console.log(
                    "========================================"
                );
                console.log("");
            }
        );

    dashboardServer.on(
        "error",
        error => {
            console.error(
                "[Dashboard] Server error:",
                error
            );
        }
    );

    return dashboardServer;
}

export {
    app
};

export default {
    app,
    startDashboard
};

/*
============================================================
 End of server.js
 Created by HyperForgeX
 Copyright © 2026 HyperForgeX. All rights reserved.
============================================================
*/