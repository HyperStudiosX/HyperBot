import express, {
    Express,
    Request,
    Response,
    NextFunction
} from "express";

import http from "http";

import {
    Server as SocketIOServer
} from "socket.io";

import session from "express-session";

import cors from "cors";

import helmet from "helmet";

import compression from "compression";

import crypto from "crypto";

import path from "path";

import fs from "fs";

import { EventEmitter } from "events";

import { Client } from "discord.js";

import { TicketManager } from "./TicketManager";

import { PanelManager } from "./PanelManager";

export class DashboardManager extends EventEmitter {

    private readonly client: Client;

    private readonly ticketManager: TicketManager;

    private readonly panelManager: PanelManager;

    private readonly app: Express;

    private readonly server: http.Server;

    private readonly io: SocketIOServer;

    private readonly sessions =
        new Map<string, any>();

    private readonly cache =
        new Map<string, any>();

    private statistics = {

        requests: 0,

        apiCalls: 0,

        socketConnections: 0,

        dashboardLogins: 0,

        activeUsers: 0,

        errors: 0

    };

    constructor(

        client: Client,

        ticketManager: TicketManager,

        panelManager: PanelManager

    ) {

        super();

        this.client = client;

        this.ticketManager = ticketManager;

        this.panelManager = panelManager;

        this.app = express();

        this.server =
            http.createServer(
                this.app
            );

        this.io =
            new SocketIOServer(
                this.server,
                {
                    cors:{
                        origin:"*",
                        credentials:true
                    }
                }
            );

        this.configureExpress();

        this.configureSockets();

        this.registerRoutes();

    }

    private configureExpress(){

        this.app.use(
            helmet()
        );

        this.app.use(
            compression()
        );

        this.app.use(
            cors({
                origin:true,
                credentials:true
            })
        );

        this.app.use(
            express.json({
                limit:"25mb"
            })
        );

        this.app.use(
            express.urlencoded({
                extended:true
            })
        );

        this.app.use(

            session({

                secret:
                    crypto.randomUUID(),

                resave:false,

                saveUninitialized:false,

                cookie:{

                    secure:false,

                    maxAge:

                        1000*

                        60*

                        60*

                        24

                }

            })

        );

        this.app.use(

            (

                req,

                res,

                next

            )=>{

                this.statistics.requests++;

                next();

            }

        );

    }

    private configureSockets(){

        this.io.on(

            "connection",

            socket=>{

                this.statistics.socketConnections++;

                this.statistics.activeUsers++;

                socket.emit(

                    "dashboard",

                    {

                        statistics:

                            this.ticketManager.getStatistics(),

                        panels:

                            this.panelManager.getStatistics()

                    }

                );

                socket.on(

                    "disconnect",

                    ()=>{

                        this.statistics.activeUsers--;

                    }

                );

            }

        );

    }

    public start(

        port:number

    ){

        this.server.listen(

            port,

            ()=>{

                console.log(

                    `Dashboard started on ${port}`

                );

            }

        );

    }

    public stop(){

        this.server.close();

        this.io.close();

    }
      /* --------------------------------------------------------
     * Authentication Middleware
     * -------------------------------------------------------- */

    private authenticate = (

        req: Request,

        res: Response,

        next: NextFunction

    ) => {

        const token =
            req.headers.authorization;

        if (!token) {

            return res.status(401).json({

                success: false,

                message: "Unauthorized"

            });

        }

        const session =
            this.sessions.get(token);

        if (!session) {

            return res.status(401).json({

                success: false,

                message: "Invalid session"

            });

        }

        (req as any).session =
            session;

        next();

    };

    /* --------------------------------------------------------
     * Routes
     * -------------------------------------------------------- */

    private registerRoutes() {

        this.app.get(

            "/api",

            (

                req,

                res

            ) => {

                res.json({

                    name:
                        "HyperTickets Dashboard API",

                    version:
                        "1.0.0",

                    online:
                        true,

                    uptime:
                        process.uptime()

                });

            }

        );

        this.app.get(

            "/api/statistics",

            this.authenticate,

            (

                req,

                res

            ) => {

                this.statistics.apiCalls++;

                res.json({

                    dashboard:
                        this.statistics,

                    tickets:
                        this.ticketManager.getStatistics(),

                    panels:
                        this.panelManager.getStatistics()

                });

            }

        );

        this.app.get(

            "/api/tickets",

            this.authenticate,

            (

                req,

                res

            ) => {

                this.statistics.apiCalls++;

                res.json(

                    this.ticketManager.getTickets()

                );

            }

        );

        this.app.get(

            "/api/panels",

            this.authenticate,

            (

                req,

                res

            ) => {

                this.statistics.apiCalls++;

                res.json(

                    this.panelManager.getPanels()

                );

            }

        );

        this.app.get(

            "/api/health",

            (

                req,

                res

            ) => {

                res.json({

                    memory:
                        process.memoryUsage(),

                    uptime:
                        process.uptime(),

                    cpu:
                        process.cpuUsage(),

                    cache:
                        this.cache.size

                });

            }

        );

        this.app.post(

            "/api/login",

            (

                req,

                res

            ) => {

                const token =
                    crypto.randomUUID();

                this.sessions.set(

                    token,

                    {

                        id: token,

                        login:
                            Date.now(),

                        ip:
                            req.ip

                    }

                );

                this.statistics.dashboardLogins++;

                res.json({

                    success: true,

                    token

                });

            }

        );

        this.app.post(

            "/api/logout",

            this.authenticate,

            (

                req,

                res

            ) => {

                const token =
                    req.headers.authorization!;

                this.sessions.delete(

                    token

                );

                res.json({

                    success: true

                });

            }

        );

        this.app.get(

            "/api/cache",

            this.authenticate,

            (

                req,

                res

            ) => {

                res.json({

                    entries:

                        Array.from(

                            this.cache.entries()

                        )

                });

            }

        );

        this.app.post(

            "/api/cache/clear",

            this.authenticate,

            (

                req,

                res

            ) => {

                this.cache.clear();

                res.json({

                    success: true

                });

            }

        );

        this.app.use(

            "/",

            express.static(

                path.join(

                    process.cwd(),

                    "dashboard",

                    "dist"

                )

            )

        );

        this.app.use(

            (

                req,

                res

            ) => {

                res.status(404).json({

                    success: false,

                    message: "Endpoint not found"

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Dashboard Cache
     * -------------------------------------------------------- */

    public setCache(

        key: string,

        value: any

    ) {

        this.cache.set(

            key,

            value

        );

    }

    public getCache(

        key: string

    ) {

        return this.cache.get(

            key

        );

    }

    public removeCache(

        key: string

    ) {

        this.cache.delete(

            key

        );

    }

    public clearCache() {

        this.cache.clear();

    }
      /* --------------------------------------------------------
     * Live Dashboard Events
     * -------------------------------------------------------- */

    public broadcastDashboard() {

        this.io.emit(

            "dashboard:update",

            {

                statistics:

                    this.ticketManager.getStatistics(),

                panels:

                    this.panelManager.getStatistics(),

                dashboard:

                    this.statistics,

                health:{

                    uptime:
                        process.uptime(),

                    memory:
                        process.memoryUsage()

                }

            }

        );

    }

    public broadcastTicketCreated(
        ticket:any
    ){

        this.io.emit(

            "ticket:create",

            ticket

        );

    }

    public broadcastTicketUpdated(
        ticket:any
    ){

        this.io.emit(

            "ticket:update",

            ticket

        );

    }

    public broadcastTicketDeleted(
        ticket:any
    ){

        this.io.emit(

            "ticket:delete",

            ticket

        );

    }

    public broadcastPanelUpdated(
        panel:any
    ){

        this.io.emit(

            "panel:update",

            panel

        );

    }

    /* --------------------------------------------------------
     * Dashboard Widgets
     * -------------------------------------------------------- */

    public dashboardWidgets(){

        return{

            overview:{

                guilds:

                    this.client.guilds.cache.size,

                users:

                    this.client.users.cache.size,

                uptime:

                    process.uptime(),

                memory:

                    process.memoryUsage(),

                ping:

                    this.client.ws.ping

            },

            tickets:

                this.ticketManager.getStatistics(),

            panels:

                this.panelManager.getStatistics()

        };

    }

    /* --------------------------------------------------------
     * Dashboard Logs
     * -------------------------------------------------------- */

    private logs:string[]=[];

    public log(

        level:

            "INFO"|

            "WARN"|

            "ERROR",

        message:string

    ){

        const line=

            `[${new Date().toISOString()}] [${level}] ${message}`;

        this.logs.push(line);

        if(

            this.logs.length>

            5000

        ){

            this.logs.shift();

        }

        this.io.emit(

            "dashboard:log",

            line

        );

    }

    public getLogs(){

        return this.logs;

    }

    public clearLogs(){

        this.logs=[];

    }

    /* --------------------------------------------------------
     * Settings
     * -------------------------------------------------------- */

    private settings={

        maintenance:false,

        registration:true,

        dashboardName:

            "HyperTickets",

        theme:

            "dark",

        version:

            "1.0.0"

    };

    public getSettings(){

        return this.settings;

    }

    public updateSetting(

        key:string,

        value:any

    ){

        (this.settings as any)[key]=

            value;

        this.broadcastDashboard();

    }

    /* --------------------------------------------------------
     * Dashboard Save
     * -------------------------------------------------------- */

    public saveSettings(){

        const folder=

            path.join(

                process.cwd(),

                "dashboard-data"

            );

        if(

            !fs.existsSync(folder)

        ){

            fs.mkdirSync(

                folder,

                {

                    recursive:true

                }

            );

        }

        fs.writeFileSync(

            path.join(

                folder,

                "settings.json"

            ),

            JSON.stringify(

                this.settings,

                null,

                4

            )

        );

    }

    public loadSettings(){

        const file=

            path.join(

                process.cwd(),

                "dashboard-data",

                "settings.json"

            );

        if(

            !fs.existsSync(file)

        )

            return;

        this.settings=

            JSON.parse(

                fs.readFileSync(

                    file,

                    "utf8"

                )

            );

    }

    /* --------------------------------------------------------
     * Connected Clients
     * -------------------------------------------------------- */

    public connectedUsers(){

        return this.io.engine.clientsCount;

    }

    public socketStatistics(){

        return{

            connected:

                this.io.engine.clientsCount,

            requests:

                this.statistics.requests,

            apiCalls:

                this.statistics.apiCalls,

            activeUsers:

                this.statistics.activeUsers

        };

    }
      /* --------------------------------------------------------
     * Transcript API
     * -------------------------------------------------------- */

    public registerTranscriptRoutes(){

        this.app.get(

            "/api/transcripts",

            this.authenticate,

            (

                req,

                res

            )=>{

                this.statistics.apiCalls++;

                const folder=

                    path.join(

                        process.cwd(),

                        "transcripts"

                    );

                if(

                    !fs.existsSync(folder)

                ){

                    return res.json([]);

                }

                const files=

                    fs.readdirSync(folder)

                    .filter(

                        file=>

                            file.endsWith(".html")

                    );

                res.json(files);

            }

        );

        this.app.get(

            "/api/transcripts/:file",

            this.authenticate,

            (

                req,

                res

            )=>{

                const file=

                    path.join(

                        process.cwd(),

                        "transcripts",

                        req.params.file

                    );

                if(

                    !fs.existsSync(file)

                ){

                    return res.status(404).json({

                        success:false,

                        message:"Transcript not found"

                    });

                }

                res.sendFile(file);

            }

        );

        this.app.delete(

            "/api/transcripts/:file",

            this.authenticate,

            (

                req,

                res

            )=>{

                const file=

                    path.join(

                        process.cwd(),

                        "transcripts",

                        req.params.file

                    );

                if(

                    fs.existsSync(file)

                ){

                    fs.unlinkSync(file);

                }

                res.json({

                    success:true

                });

            }

        );

    }

    /* --------------------------------------------------------
     * User Management
     * -------------------------------------------------------- */

    public async dashboardUsers(){

        const users=[];

        for(

            const guild

            of

            this.client.guilds.cache.values()

        ){

            await guild.members.fetch();

            for(

                const member

                of

                guild.members.cache.values()

            ){

                users.push({

                    id:member.id,

                    username:

                        member.user.username,

                    displayName:

                        member.displayName,

                    avatar:

                        member.displayAvatarURL(),

                    bot:

                        member.user.bot,

                    roles:

                        member.roles.cache.map(

                            role=>role.name

                        )

                });

            }

        }

        return users;

    }

    public registerUserRoutes(){

        this.app.get(

            "/api/users",

            this.authenticate,

            async(

                req,

                res

            )=>{

                res.json(

                    await this.dashboardUsers()

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Analytics
     * -------------------------------------------------------- */

    public analytics(){

        return{

            dashboard:

                this.statistics,

            tickets:

                this.ticketManager.getStatistics(),

            panels:

                this.panelManager.getStatistics(),

            sockets:

                this.socketStatistics(),

            uptime:

                process.uptime(),

            memory:

                process.memoryUsage(),

            cpu:

                process.cpuUsage()

        };

    }

    public registerAnalyticsRoutes(){

        this.app.get(

            "/api/analytics",

            this.authenticate,

            (

                req,

                res

            )=>{

                res.json(

                    this.analytics()

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Dashboard Notifications
     * -------------------------------------------------------- */

    private notifications=[] as {

        id:string;

        title:string;

        description:string;

        level:string;

        created:number;

    }[];

    public notify(

        title:string,

        description:string,

        level:

            "INFO"|

            "WARN"|

            "ERROR"

    ){

        const notification={

            id:

                crypto.randomUUID(),

            title,

            description,

            level,

            created:

                Date.now()

        };

        this.notifications.push(

            notification

        );

        this.io.emit(

            "dashboard:notification",

            notification

        );

    }

    public registerNotificationRoutes(){

        this.app.get(

            "/api/notifications",

            this.authenticate,

            (

                req,

                res

            )=>{

                res.json(

                    this.notifications

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Automatic Dashboard Refresh
     * -------------------------------------------------------- */

    public startAutoRefresh(){

        setInterval(

            ()=>{

                this.broadcastDashboard();

            },

            5000

        );

    }
      /* --------------------------------------------------------
     * Role & Permission API
     * -------------------------------------------------------- */

    public async dashboardRoles(){

        const result:any[]=[];

        for(

            const guild

            of

            this.client.guilds.cache.values()

        ){

            await guild.roles.fetch();

            for(

                const role

                of

                guild.roles.cache.values()

            ){

                result.push({

                    guildId:guild.id,

                    guild:guild.name,

                    id:role.id,

                    name:role.name,

                    color:role.hexColor,

                    position:role.position,

                    managed:role.managed,

                    mentionable:role.mentionable,

                    hoist:role.hoist,

                    permissions:

                        role.permissions.toArray()

                });

            }

        }

        return result;

    }

    public registerRoleRoutes(){

        this.app.get(

            "/api/roles",

            this.authenticate,

            async(

                req,

                res

            )=>{

                this.statistics.apiCalls++;

                res.json(

                    await this.dashboardRoles()

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Plugin Manager
     * -------------------------------------------------------- */

    private plugins=new Map<
        string,
        any
    >();

    public registerPlugin(

        name:string,

        plugin:any

    ){

        this.plugins.set(

            name,

            plugin

        );

        this.log(

            "INFO",

            `Plugin ${name} loaded`

        );

    }

    public unregisterPlugin(

        name:string

    ){

        this.plugins.delete(

            name

        );

    }

    public getPlugins(){

        return Array.from(

            this.plugins.keys()

        );

    }

    public registerPluginRoutes(){

        this.app.get(

            "/api/plugins",

            this.authenticate,

            (

                req,

                res

            )=>{

                res.json({

                    plugins:

                        this.getPlugins()

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Backup Manager
     * -------------------------------------------------------- */

    public createBackup(){

        const backup={

            created:

                Date.now(),

            tickets:

                this.ticketManager.getTickets(),

            panels:

                this.panelManager.getPanels(),

            settings:

                this.settings

        };

        const folder=

            path.join(

                process.cwd(),

                "backups"

            );

        if(

            !fs.existsSync(folder)

        ){

            fs.mkdirSync(

                folder,

                {

                    recursive:true

                }

            );

        }

        const filename=

            `backup-${Date.now()}.json`;

        fs.writeFileSync(

            path.join(

                folder,

                filename

            ),

            JSON.stringify(

                backup,

                null,

                4

            )

        );

        return filename;

    }

    public registerBackupRoutes(){

        this.app.post(

            "/api/backup",

            this.authenticate,

            (

                req,

                res

            )=>{

                const file=

                    this.createBackup();

                res.json({

                    success:true,

                    file

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Theme Manager
     * -------------------------------------------------------- */

    private themes=[

        "dark",

        "light",

        "hyper",

        "midnight",

        "blue"

    ];

    public registerThemeRoutes(){

        this.app.get(

            "/api/themes",

            this.authenticate,

            (

                req,

                res

            )=>{

                res.json({

                    current:

                        this.settings.theme,

                    themes:

                        this.themes

                });

            }

        );

        this.app.post(

            "/api/themes",

            this.authenticate,

            (

                req,

                res

            )=>{

                const{

                    theme

                }=req.body;

                if(

                    this.themes.includes(

                        theme

                    )

                ){

                    this.settings.theme=

                        theme;

                }

                res.json({

                    success:true,

                    theme:

                        this.settings.theme

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public async shutdown(){

        this.saveSettings();

        this.io.emit(

            "dashboard:shutdown"

        );

        this.io.close();

        this.server.close();

        this.sessions.clear();

        this.cache.clear();

        this.plugins.clear();

        this.removeAllListeners();

    }

}
