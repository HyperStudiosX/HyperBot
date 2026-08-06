import express,{
    Application,
    Request,
    Response,
    NextFunction,
    Router
} from "express";

import http from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { EventEmitter } from "events";

export interface APIKey{

    id:string;

    key:string;

    owner:string;

    permissions:string[];

    created:number;

    expires:number|null;

    enabled:boolean;

}

export class APIManager extends EventEmitter{

    private readonly app:Application;

    private readonly server:http.Server;

    private readonly router:Router;

    private readonly apiKeys=

        new Map<
            string,
            APIKey
        >();

    private readonly statistics={

        requests:0,

        successful:0,

        failed:0,

        apiKeys:0,

        tokens:0,

        websocketClients:0

    };

    constructor(){

        super();

        this.app=

            express();

        this.server=

            http.createServer(

                this.app

            );

        this.router=

            Router();

        this.initialize();

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    private initialize(){

        this.app.use(

            express.json()

        );

        this.app.use(

            express.urlencoded({

                extended:true

            })

        );

        this.app.use(

            this.router

        );

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Start Server
     * -------------------------------------------------------- */

    public start(

        port:number

    ){

        this.server.listen(

            port,

            ()=>{

                this.emit(

                    "serverStart",

                    port

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Stop Server
     * -------------------------------------------------------- */

    public stop(){

        this.server.close(

            ()=>{

                this.emit(

                    "serverStop"

                );

            }

        );

    }

    /* --------------------------------------------------------
     * API Key
     * -------------------------------------------------------- */

    public createAPIKey(

        owner:string,

        permissions:string[],

        expires:number|null=

            null

    ){

        const apiKey:APIKey={

            id:

                crypto.randomUUID(),

            key:

                crypto.randomBytes(

                    32

                ).toString(

                    "hex"

                ),

            owner,

            permissions,

            created:

                Date.now(),

            expires,

            enabled:true

        };

        this.apiKeys.set(

            apiKey.key,

            apiKey

        );

        this.statistics.apiKeys++;

        this.emit(

            "apiKeyCreate",

            apiKey

        );

        return apiKey;

    }

    public getAPIKey(

        key:string

    ){

        return this.apiKeys.get(

            key

        );

    }

    public revokeAPIKey(

        key:string

    ){

        const apiKey=

            this.getAPIKey(

                key

            );

        if(

            !apiKey

        ){

            return false;

        }

        apiKey.enabled=false;

        this.emit(

            "apiKeyRevoked",

            key

        );

        return true;

    }

    /* --------------------------------------------------------
     * JWT
     * -------------------------------------------------------- */

    public generateToken(

        payload:object,

        secret:string,

        expiresIn:string="1h"

    ){

        this.statistics.tokens++;

        return jwt.sign(

            payload,

            secret,

            {

                expiresIn

            }

        );

    }

    public verifyToken(

        token:string,

        secret:string

    ){

        return jwt.verify(

            token,

            secret

        );

    }
      /* --------------------------------------------------------
     * Authentication Middleware
     * -------------------------------------------------------- */

    public authenticate(

        secret:string

    ){

        return(

            req:Request,

            res:Response,

            next:NextFunction

        )=>{

            const token=

                req.headers.authorization
                    ?.replace(

                        "Bearer ",

                        ""

                    );

            if(

                !token

            ){

                return res.status(

                    401

                ).json({

                    success:false,

                    message:

                        "Missing token."

                });

            }

            try{

                req["user"]=

                    this.verifyToken(

                        token,

                        secret

                    );

                next();

            }

            catch{

                return res.status(

                    401

                ).json({

                    success:false,

                    message:

                        "Invalid token."

                });

            }

        };

    }

    /* --------------------------------------------------------
     * API Key Middleware
     * -------------------------------------------------------- */

    public requireAPIKey(){

        return(

            req:Request,

            res:Response,

            next:NextFunction

        )=>{

            const key=

                req.headers[

                    "x-api-key"

                ] as string;

            const apiKey=

                this.getAPIKey(

                    key

                );

            if(

                !apiKey||

                !apiKey.enabled

            ){

                return res.status(

                    403

                ).json({

                    success:false,

                    message:

                        "Invalid API key."

                });

            }

            if(

                apiKey.expires!==null&&

                apiKey.expires<

                Date.now()

            ){

                return res.status(

                    403

                ).json({

                    success:false,

                    message:

                        "API key expired."

                });

            }

            req["apiKey"]=

                apiKey;

            next();

        };

    }

    /* --------------------------------------------------------
     * Rate Limiter
     * -------------------------------------------------------- */

    private readonly rateLimits=

        new Map<
            string,
            number
        >();

    public rateLimit(

        interval:number=

            5000

    ){

        return(

            req:Request,

            res:Response,

            next:NextFunction

        )=>{

            const ip=

                req.ip;

            const last=

                this.rateLimits.get(

                    ip

                )??0;

            if(

                Date.now()-last<

                interval

            ){

                return res.status(

                    429

                ).json({

                    success:false,

                    message:

                        "Rate limit exceeded."

                });

            }

            this.rateLimits.set(

                ip,

                Date.now()

            );

            next();

        };

    }

    /* --------------------------------------------------------
     * Register Routes
     * -------------------------------------------------------- */

    public get(

        path:string,

        handler:(

            req:Request,

            res:Response

        )=>void

    ){

        this.router.get(

            path,

            handler

        );

    }

    public post(

        path:string,

        handler:(

            req:Request,

            res:Response

        )=>void

    ){

        this.router.post(

            path,

            handler

        );

    }

    public put(

        path:string,

        handler:(

            req:Request,

            res:Response

        )=>void

    ){

        this.router.put(

            path,

            handler

        );

    }

    public delete(

        path:string,

        handler:(

            req:Request,

            res:Response

        )=>void

    ){

        this.router.delete(

            path,

            handler

        );

    }

    /* --------------------------------------------------------
     * Request Logger
     * -------------------------------------------------------- */

    public requestLogger(){

        return(

            req:Request,

            res:Response,

            next:NextFunction

        )=>{

            this.statistics.requests++;

            this.emit(

                "request",

                {

                    method:

                        req.method,

                    path:

                        req.path,

                    ip:

                        req.ip

                }

            );

            next();

        };

    }
      /* --------------------------------------------------------
     * Ticket API
     * -------------------------------------------------------- */

    public registerTicketRoutes(){

        this.router.get(

            "/api/tickets",

            async(

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    data:[]

                });

            }

        );

        this.router.get(

            "/api/tickets/:id",

            async(

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    ticketId:

                        req.params.id

                });

            }

        );

        this.router.post(

            "/api/tickets",

            async(

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.status(

                    201

                ).json({

                    success:true,

                    body:req.body

                });

            }

        );

        this.router.delete(

            "/api/tickets/:id",

            async(

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    deleted:

                        req.params.id

                });

            }

        );

    }

    /* --------------------------------------------------------
     * User API
     * -------------------------------------------------------- */

    public registerUserRoutes(){

        this.router.get(

            "/api/users/:id",

            (

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    id:

                        req.params.id

                });

            }

        );

        this.router.get(

            "/api/users",

            (

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    users:[]

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Guild API
     * -------------------------------------------------------- */

    public registerGuildRoutes(){

        this.router.get(

            "/api/guilds",

            (

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    guilds:[]

                });

            }

        );

        this.router.get(

            "/api/guilds/:id",

            (

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    guild:

                        req.params.id

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Dashboard API
     * -------------------------------------------------------- */

    public registerDashboardRoutes(){

        this.router.get(

            "/api/dashboard",

            (

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    dashboard:true

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Plugin API
     * -------------------------------------------------------- */

    public registerPluginRoutes(){

        this.router.get(

            "/api/plugins",

            (

                req:Request,

                res:Response

            )=>{

                this.statistics.successful++;

                res.json({

                    success:true,

                    plugins:[]

                });

            }

        );

    }

    /* --------------------------------------------------------
     * Register Everything
     * -------------------------------------------------------- */

    public registerDefaultRoutes(){

        this.registerTicketRoutes();

        this.registerUserRoutes();

        this.registerGuildRoutes();

        this.registerDashboardRoutes();

        this.registerPluginRoutes();

        this.emit(

            "routesRegistered"

        );

    }
      /* --------------------------------------------------------
     * WebSocket Clients
     * -------------------------------------------------------- */

    private readonly sockets=

        new Set<any>();

    public addSocket(

        socket:any

    ){

        this.sockets.add(

            socket

        );

        this.statistics.websocketClients=

            this.sockets.size;

        this.emit(

            "socketConnect",

            socket

        );

    }

    public removeSocket(

        socket:any

    ){

        this.sockets.delete(

            socket

        );

        this.statistics.websocketClients=

            this.sockets.size;

        this.emit(

            "socketDisconnect",

            socket

        );

    }

    public broadcast(

        event:string,

        payload:any

    ){

        for(

            const socket

            of

            this.sockets

        ){

            try{

                socket.send(

                    JSON.stringify({

                        event,

                        payload

                    })

                );

            }

            catch{

                continue;

            }

        }

        this.emit(

            "broadcast",

            event

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            requests:

                this.statistics.requests,

            successful:

                this.statistics.successful,

            failed:

                this.statistics.failed,

            apiKeys:

                this.apiKeys.size,

            tokens:

                this.statistics.tokens,

            websocketClients:

                this.sockets.size

        };

    }

    public resetStatistics(){

        this.statistics.requests=0;

        this.statistics.successful=0;

        this.statistics.failed=0;

        this.statistics.apiKeys=0;

        this.statistics.tokens=0;

        this.statistics.websocketClients=

            this.sockets.size;
    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.rateLimits.clear();

        this.apiKeys.clear();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        for(

            const socket

            of

            this.sockets

        ){

            try{

                socket.close();

            }

            catch{}

        }

        this.sockets.clear();

        this.stop();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
