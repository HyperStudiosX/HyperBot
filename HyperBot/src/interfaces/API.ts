import {
    Application,
    Request,
    Response,
    Router
} from "express";

import {
    APIResponse,
    APIStatistics,
    APIToken
} from "../types/API";

export interface APIService{

    /* --------------------------------------------------------
     * Server Lifecycle
     * -------------------------------------------------------- */

    initialize():Promise<void>;

    start(

        port:number

    ):Promise<void>;

    stop():Promise<void>;

    reload():Promise<void>;

    shutdown():Promise<void>;

    /* --------------------------------------------------------
     * Routing
     * -------------------------------------------------------- */

    getApplication():Application;

    getRouter():Router;

    registerRoutes():void;

    /* --------------------------------------------------------
     * Authentication
     * -------------------------------------------------------- */

    authenticate(

        request:Request,

        response:Response,

        next:Function

    ):Promise<void>;

    /* --------------------------------------------------------
     * API Tokens
     * -------------------------------------------------------- */

    createToken(

        name:string,

        scopes:string[]

    ):Promise<APIToken>;

    revokeToken(

        tokenId:string

    ):Promise<void>;

    getTokens():Promise<APIToken[]>;

    /* --------------------------------------------------------
     * Health & Statistics
     * -------------------------------------------------------- */

    health():Promise<APIResponse>;

    getStatistics():APIStatistics;

}
