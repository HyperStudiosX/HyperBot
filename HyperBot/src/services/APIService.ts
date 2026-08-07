import {
    Client,
    Snowflake
} from "discord.js";

import { EventEmitter } from "events";
import express,{
    Application,
    Request,
    Response,
    Router
} from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import { DatabaseManager } from "../managers/DatabaseManager";
import { DashboardManager } from "../managers/DashboardManager";
import { TicketManager } from "../managers/TicketManager";
import { PanelManager } from "../managers/PanelManager";
import { AuditManager } from "../managers/AuditManager";
import { AuthenticationService } from "./AuthenticationService";

export class APIService extends EventEmitter{

    private readonly client:Client;

    private readonly app:Application;

    private readonly router:Router;

    private readonly database:DatabaseManager;

    private readonly dashboard:DashboardManager;

    private readonly tickets:TicketManager;

    private readonly panels:PanelManager;

    private readonly audits:AuditManager;

    private readonly authentication:AuthenticationService;

    constructor(

        client:Client,

        database:DatabaseManager,

        dashboard:DashboardManager,

        tickets:TicketManager,

        panels:PanelManager,

        audits:AuditManager,

        authentication:AuthenticationService

    ){

        super();

        this.client=client;

        this.database=database;

        this.dashboard=dashboard;

        this.tickets=tickets;

        this.panels=panels;

        this.audits=audits;

        this.authentication=authentication;

        this.app=

            express();

        this.router=

            Router();

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    public async initialize(){

        this.configureApplication();

        this.registerRoutes();

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Configure Express
     * -------------------------------------------------------- */

    private configureApplication(){

        this.app.use(

            helmet()

        );

        this.app.use(

            cors()

        );

        this.app.use(

            compression()

        );

        this.app.use(

            express.json({

                limit:

                    "20mb"

            })

        );

        this.app.use(

            "/api",

            this.router

        );

    }

    /* --------------------------------------------------------
     * Register Routes
     * -------------------------------------------------------- */

    private registerRoutes(){

        this.router.get(

            "/health",

            (

                request:Request,

                response:Response

            )=>{

                response.json({

                    status:

                        "online",

                    timestamp:

                        Date.now()

                });

            }

        );

        this.router.get(

            "/statistics",

            async(

                request:Request,

                response:Response

            )=>{

                response.json({

                    tickets:

                        this.tickets

                            .getAll()

                            .length,

                    panels:

                        this.panels

                            .getAll()

                            .length,

                    dashboards:

                        this.dashboard

                            .getAll()

                            .length

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Start API
     * -------------------------------------------------------- */

    public async start(

        port:number

    ){

        return new Promise<void>(

            resolve=>{

                this.app.listen(

                    port,

                    ()=>{

                        this.emit(

                            "started",

                            port

                        );

                        resolve();

                    }

                );

            }

        );

    }
      /* --------------------------------------------------------
     * Authentication Middleware
     * -------------------------------------------------------- */

    private async authenticate(

        request:Request,

        response:Response,

        next:Function

    ){

        const header=

            request.headers.authorization;

        if(

            !header

        ){

            return response.status(

                401

            ).json({

                error:

                    "Unauthorized"

            });

        }

        const token=

            header.replace(

                "Bearer ",

                ""

            );

        try{

            this.authentication.verifyToken(

                token,

                process.env.JWT_SECRET||

                "development"

            );

            next();

        }

        catch{

            return response.status(

                401

            ).json({

                error:

                    "Invalid token"

            });

        }

    }

    /* --------------------------------------------------------
     * Dashboard Routes
     * -------------------------------------------------------- */

    private registerDashboardRoutes(){

        this.router.get(

            "/dashboards",

            this.authenticate.bind(

                this

            ),

            (

                request:Request,

                response:Response

            )=>{

                response.json(

                    this.dashboard.getAll()

                );

            }

        );

        this.router.get(

            "/dashboards/:guildId",

            this.authenticate.bind(

                this

            ),

            (

                request:Request,

                response:Response

            )=>{

                response.json(

                    this.dashboard.get(

                        request.params.guildId

                    )

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Ticket Routes
     * -------------------------------------------------------- */

    private registerTicketRoutes(){

        this.router.get(

            "/tickets",

            this.authenticate.bind(

                this

            ),

            (

                request:Request,

                response:Response

            )=>{

                response.json(

                    this.tickets.getAll()

                );

            }

        );

        this.router.get(

            "/tickets/:id",

            this.authenticate.bind(

                this

            ),

            (

                request:Request,

                response:Response

            )=>{

                response.json(

                    this.tickets.get(

                        request.params.id

                    )

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Panel Routes
     * -------------------------------------------------------- */

    private registerPanelRoutes(){

        this.router.get(

            "/panels",

            this.authenticate.bind(

                this

            ),

            (

                request:Request,

                response:Response

            )=>{

                response.json(

                    this.panels.getAll()

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Register API Modules
     * -------------------------------------------------------- */

    private registerModules(){

        this.registerDashboardRoutes();

        this.registerTicketRoutes();

        this.registerPanelRoutes();

    }
      /* --------------------------------------------------------
     * Register Webhook Routes
     * -------------------------------------------------------- */

    private registerWebhookRoutes(){

        this.router.post(

            "/webhooks/events",

            async(

                request:Request,

                response:Response

            )=>{

                this.emit(

                    "webhookReceived",

                    request.body

                );

                response.status(

                    200

                ).json({

                    success:true

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Metrics Endpoint
     * -------------------------------------------------------- */

    private registerMetricsRoutes(){

        this.router.get(

            "/metrics",

            this.authenticate.bind(

                this

            ),

            (

                request:Request,

                response:Response

            )=>{

                response.json({

                    uptime:

                        process.uptime(),

                    memory:

                        process.memoryUsage(),

                    guilds:

                        this.client.guilds.cache.size,

                    users:

                        this.client.users.cache.size,

                    tickets:

                        this.tickets.getAll().length,

                    panels:

                        this.panels.getAll().length

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Audit Routes
     * -------------------------------------------------------- */

    private registerAuditRoutes(){

        this.router.get(

            "/audits",

            this.authenticate.bind(

                this

            ),

            async(

                request:Request,

                response:Response

            )=>{

                const logs=

                    await this.database.getAuditLogs();

                response.json(

                    logs

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Register Rate Limiter
     * -------------------------------------------------------- */

    private registerRateLimiter(){

        this.app.use(

            (

                request:Request,

                response:Response,

                next:Function

            )=>{

                response.setHeader(

                    "X-Powered-By",

                    "Hyper Tickets"

                );

                next();

            }

        );

    }

    /* --------------------------------------------------------
     * Export Data
     * -------------------------------------------------------- */

    private registerExportRoutes(){

        this.router.get(

            "/export",

            this.authenticate.bind(

                this

            ),

            (

                request:Request,

                response:Response

            )=>{

                response.json({

                    dashboards:

                        this.dashboard.getAll(),

                    tickets:

                        this.tickets.getAll(),

                    panels:

                        this.panels.getAll()

                });

            }

        );

    }
      /* --------------------------------------------------------
     * Synchronize API State
     * -------------------------------------------------------- */

    public async synchronize(){

        await this.database.updateSystemState({

            lastSynchronization:

                Date.now(),

            guilds:

                this.client.guilds.cache.size,

            users:

                this.client.users.cache.size,

            tickets:

                this.tickets.getAll().length,

            panels:

                this.panels.getAll().length

        });

        this.emit(

            "apiSynchronized"

        );

    }

    /* --------------------------------------------------------
     * Reload
     * -------------------------------------------------------- */

    public async reload(){

        this.router.stack.length=

            0;

        this.registerRoutes();

        this.registerModules();

        this.registerWebhookRoutes();

        this.registerMetricsRoutes();

        this.registerAuditRoutes();

        this.registerExportRoutes();

        this.emit(

            "reloaded"

        );

    }

    /* --------------------------------------------------------
     * Stop API
     * -------------------------------------------------------- */

    public async stop(){

        this.emit(

            "stopping"

        );

        this.emit(

            "stopped"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public async shutdown(){

        await this.synchronize();

        await this.stop();

        this.cleanup();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
