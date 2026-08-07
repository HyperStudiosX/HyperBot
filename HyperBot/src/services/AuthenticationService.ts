import {
    Client,
    Guild,
    GuildMember,
    Snowflake,
    User
} from "discord.js";

import { EventEmitter } from "events";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { DatabaseManager } from "../managers/DatabaseManager";
import { SessionManager } from "../managers/SessionManager";
import { PermissionManager } from "../managers/PermissionManager";
import { AuditManager } from "../managers/AuditManager";
import { CacheManager } from "../managers/CacheManager";

export class AuthenticationService extends EventEmitter{

    private readonly client:Client;

    private readonly database:DatabaseManager;

    private readonly sessions:SessionManager;

    private readonly permissions:PermissionManager;

    private readonly audits:AuditManager;

    private readonly cache:CacheManager;

    constructor(

        client:Client,

        database:DatabaseManager,

        sessions:SessionManager,

        permissions:PermissionManager,

        audits:AuditManager,

        cache:CacheManager

    ){

        super();

        this.client=client;

        this.database=database;

        this.sessions=sessions;

        this.permissions=permissions;

        this.audits=audits;

        this.cache=cache;

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    public async initialize(){

        await this.restoreSessions();

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Restore Sessions
     * -------------------------------------------------------- */

    private async restoreSessions(){

        const sessions=

            await this.database.getSessions();

        for(

            const session

            of

            sessions

        ){

            this.sessions.register(

                session

            );

        }

        this.emit(

            "sessionsRestored",

            sessions.length

        );

    }

    /* --------------------------------------------------------
     * Generate JWT
     * -------------------------------------------------------- */

    public generateToken(

        payload:any,

        secret:string,

        expiresIn:string="7d"

    ){

        return jwt.sign(

            payload,

            secret,

            {

                expiresIn

            }

        );

    }

    /* --------------------------------------------------------
     * Verify JWT
     * -------------------------------------------------------- */

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
     * Create Session
     * -------------------------------------------------------- */

    public async createSession(

        user:User,

        ip:string

    ){

        const session={

            id:

                crypto.randomUUID(),

            userId:

                user.id,

            ip,

            createdAt:

                Date.now()

        };

        this.sessions.register(

            session

        );

        await this.database.saveSession(

            session

        );

        this.cache.set(

            session.id,

            session

        );

        this.emit(

            "sessionCreated",

            session

        );

        return session;

    }
      /* --------------------------------------------------------
     * Destroy Session
     * -------------------------------------------------------- */

    public async destroySession(

        sessionId:string

    ){

        this.sessions.remove(

            sessionId

        );

        this.cache.delete(

            sessionId

        );

        await this.database.deleteSession(

            sessionId

        );

        this.emit(

            "sessionDestroyed",

            sessionId

        );

    }

    /* --------------------------------------------------------
     * Refresh Session
     * -------------------------------------------------------- */

    public async refreshSession(

        sessionId:string

    ){

        const session=

            this.sessions.get(

                sessionId

            );

        if(

            !session

        ){

            return null;

        }

        session.lastAccess=

            Date.now();

        await this.database.updateSession(

            session

        );

        this.cache.set(

            session.id,

            session

        );

        this.emit(

            "sessionRefreshed",

            session.id

        );

        return session;

    }

    /* --------------------------------------------------------
     * Hash Password
     * -------------------------------------------------------- */

    public async hashPassword(

        password:string

    ){

        return await bcrypt.hash(

            password,

            12

        );

    }

    /* --------------------------------------------------------
     * Verify Password
     * -------------------------------------------------------- */

    public async verifyPassword(

        password:string,

        hash:string

    ){

        return await bcrypt.compare(

            password,

            hash

        );

    }

    /* --------------------------------------------------------
     * Generate API Key
     * -------------------------------------------------------- */

    public generateApiKey(){

        return crypto

            .randomBytes(

                32

            )

            .toString(

                "hex"

            );

    }

    /* --------------------------------------------------------
     * Validate User Permission
     * -------------------------------------------------------- */

    public hasPermission(

        member:GuildMember,

        node:string

    ){

        return this.permissions.has(

            member,

            node

        );

    }
      /* --------------------------------------------------------
     * Login
     * -------------------------------------------------------- */

    public async login(

        user:User,

        ip:string,

        secret:string

    ){

        const session=

            await this.createSession(

                user,

                ip

            );

        const token=

            this.generateToken(

                {

                    sessionId:

                        session.id,

                    userId:

                        user.id

                },

                secret

            );

        this.audits.logSystem(

            user.id,

            "USER_LOGIN",

            {

                ip,

                sessionId:

                    session.id

            }

        );

        this.emit(

            "userLoggedIn",

            session

        );

        return{

            session,

            token

        };

    }

    /* --------------------------------------------------------
     * Logout
     * -------------------------------------------------------- */

    public async logout(

        sessionId:string

    ){

        await this.destroySession(

            sessionId

        );

        this.emit(

            "userLoggedOut",

            sessionId

        );

    }

    /* --------------------------------------------------------
     * Generate Refresh Token
     * -------------------------------------------------------- */

    public generateRefreshToken(){

        return crypto

            .randomBytes(

                64

            )

            .toString(

                "hex"

            );

    }

    /* --------------------------------------------------------
     * Store Refresh Token
     * -------------------------------------------------------- */

    public async storeRefreshToken(

        userId:Snowflake,

        token:string

    ){

        await this.database.saveRefreshToken({

            userId,

            token,

            createdAt:

                Date.now()

        });

        this.emit(

            "refreshTokenStored",

            userId

        );

    }

    /* --------------------------------------------------------
     * Validate Refresh Token
     * -------------------------------------------------------- */

    public async validateRefreshToken(

        token:string

    ){

        return await this.database.getRefreshToken(

            token

        );

    }

    /* --------------------------------------------------------
     * Authentication Statistics
     * -------------------------------------------------------- */

    public async getStatistics(){

        const sessions=

            await this.database.getSessions();

        return{

            activeSessions:

                sessions.length,

            cachedSessions:

                this.cache.size()

        };

    }
      /* --------------------------------------------------------
     * Synchronize Sessions
     * -------------------------------------------------------- */

    public async synchronize(){

        const sessions=

            this.sessions.getAll();

        for(

            const session

            of

            sessions

        ){

            await this.database.updateSession(

                session

            );

        }

        this.emit(

            "sessionsSynchronized",

            sessions.length

        );

    }

    /* --------------------------------------------------------
     * Reload
     * -------------------------------------------------------- */

    public async reload(){

        this.cache.clear();

        this.sessions.clear();

        await this.restoreSessions();

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
