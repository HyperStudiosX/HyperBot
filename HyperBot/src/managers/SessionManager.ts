import { Collection } from "discord.js";
import { EventEmitter } from "events";
import crypto from "crypto";

export interface Session{

    id:string;

    userId:string;

    guildId:string;

    token:string;

    ip:string;

    userAgent:string;

    created:number;

    updated:number;

    expires:number;

    authenticated:boolean;

    metadata:Record<string,any>;

}

export class SessionManager extends EventEmitter{

    private readonly sessions=

        new Collection<
            string,
            Session
        >();

    private statistics={

        created:0,

        active:0,

        expired:0,

        destroyed:0,

        refreshed:0,

        validations:0

    };

    constructor(){

        super();

    }

    /* --------------------------------------------------------
     * Create Session
     * -------------------------------------------------------- */

    public create(

        userId:string,

        guildId:string,

        ip:string,

        userAgent:string,

        ttl:number=

            1000*60*60*24

    ){

        const id=

            crypto.randomUUID();

        const token=

            crypto.randomBytes(

                48

            ).toString(

                "hex"

            );

        const session:Session={

            id,

            userId,

            guildId,

            token,

            ip,

            userAgent,

            created:

                Date.now(),

            updated:

                Date.now(),

            expires:

                Date.now()+ttl,

            authenticated:true,

            metadata:{}

        };

        this.sessions.set(

            id,

            session

        );

        this.statistics.created++;

        this.statistics.active++;

        this.emit(

            "sessionCreate",

            session

        );

        return session;

    }

    /* --------------------------------------------------------
     * Lookup
     * -------------------------------------------------------- */

    public get(

        id:string

    ){

        return this.sessions.get(

            id

        );

    }

    public getByToken(

        token:string

    ){

        return this.sessions.find(

            session=>

                session.token===

                token

        );

    }

    public getUserSessions(

        userId:string

    ){

        return this.sessions.filter(

            session=>

                session.userId===

                userId

        );

    }

    public exists(

        id:string

    ){

        return this.sessions.has(

            id

        );

    }

    /* --------------------------------------------------------
     * Authentication
     * -------------------------------------------------------- */

    public authenticate(

        id:string

    ){

        const session=

            this.get(

                id

            );

        if(

            !session

        ){

            return false;

        }

        session.authenticated=true;

        session.updated=

            Date.now();

        this.emit(

            "sessionAuthenticate",

            id

        );

        return true;

    }

    public revoke(

        id:string

    ){

        const session=

            this.get(

                id

            );

        if(

            !session

        ){

            return false;

        }

        session.authenticated=false;

        session.updated=

            Date.now();

        this.emit(

            "sessionRevoked",

            id

        );

        return true;

    }

    /* --------------------------------------------------------
     * Metadata
     * -------------------------------------------------------- */

    public setMetadata(

        id:string,

        key:string,

        value:any

    ){

        const session=

            this.get(

                id

            );

        if(

            !session

        ){

            return false;

        }

        session.metadata[key]=

            value;

        session.updated=

            Date.now();

        this.emit(

            "metadataUpdate",

            id,

            key

        );

        return true;

    }

    public getMetadata(

        id:string,

        key:string

    ){

        return this.get(

            id

        )?.metadata[key];

    }
      /* --------------------------------------------------------
     * Refresh Session
     * -------------------------------------------------------- */

    public refresh(

        id:string,

        ttl:number=

            1000*60*60*24

    ){

        const session=

            this.get(

                id

            );

        if(

            !session

        ){

            return false;

        }

        session.updated=

            Date.now();

        session.expires=

            Date.now()+ttl;

        this.statistics.refreshed++;

        this.emit(

            "sessionRefresh",

            session

        );

        return true;

    }

    /* --------------------------------------------------------
     * Validate Session
     * -------------------------------------------------------- */

    public validate(

        token:string

    ){

        this.statistics.validations++;

        const session=

            this.getByToken(

                token

            );

        if(

            !session

        ){

            return null;

        }

        if(

            !session.authenticated

        ){

            return null;

        }

        if(

            session.expires<

            Date.now()

        ){

            this.destroy(

                session.id

            );

            this.statistics.expired++;

            return null;

        }

        session.updated=

            Date.now();

        return session;

    }

    /* --------------------------------------------------------
     * Destroy Session
     * -------------------------------------------------------- */

    public destroy(

        id:string

    ){

        if(

            !this.sessions.has(

                id

            )

        ){

            return false;

        }

        this.sessions.delete(

            id

        );

        this.statistics.destroyed++;

        this.statistics.active--;

        this.emit(

            "sessionDestroy",

            id

        );

        return true;

    }

    /* --------------------------------------------------------
     * Destroy User Sessions
     * -------------------------------------------------------- */

    public destroyUserSessions(

        userId:string

    ){

        let count=0;

        for(

            const [

                id,

                session

            ]

            of

            this.sessions

        ){

            if(

                session.userId===

                userId

            ){

                this.destroy(

                    id

                );

                count++;

            }

        }

        this.emit(

            "userSessionsDestroyed",

            userId,

            count

        );

        return count;

    }

    /* --------------------------------------------------------
     * Active Sessions
     * -------------------------------------------------------- */

    public getActiveSessions(){

        return this.sessions.filter(

            session=>

                session.authenticated&&

                session.expires>

                Date.now()

        );

    }

    public getExpiredSessions(){

        return this.sessions.filter(

            session=>

                session.expires<=

                Date.now()

        );

    }

    /* --------------------------------------------------------
     * Cleanup Expired Sessions
     * -------------------------------------------------------- */

    public cleanupExpired(){

        let removed=0;

        for(

            const [

                id,

                session

            ]

            of

            this.sessions

        ){

            if(

                session.expires<=

                Date.now()

            ){

                this.destroy(

                    id

                );

                removed++;

            }

        }

        this.emit(

            "expiredCleanup",

            removed

        );

        return removed;

    }
      /* --------------------------------------------------------
     * OAuth State Management
     * -------------------------------------------------------- */

    private readonly oauthStates=

        new Collection<
            string,
            {
                userId:string;
                created:number;
                expires:number;
            }
        >();

    public createOAuthState(

        userId:string,

        ttl:number=

            1000*60*10

    ){

        const state=

            crypto.randomBytes(

                32

            ).toString(

                "hex"

            );

        this.oauthStates.set(

            state,

            {

                userId,

                created:

                    Date.now(),

                expires:

                    Date.now()+ttl

            }

        );

        this.emit(

            "oauthStateCreate",

            state

        );

        return state;

    }

    public validateOAuthState(

        state:string

    ){

        const value=

            this.oauthStates.get(

                state

            );

        if(

            !value

        ){

            return null;

        }

        if(

            value.expires<

            Date.now()

        ){

            this.oauthStates.delete(

                state

            );

            return null;

        }

        this.oauthStates.delete(

            state

        );

        return value;

    }

    /* --------------------------------------------------------
     * Refresh Tokens
     * -------------------------------------------------------- */

    private readonly refreshTokens=

        new Collection<
            string,
            string
        >();

    public createRefreshToken(

        sessionId:string

    ){

        const token=

            crypto.randomBytes(

                64

            ).toString(

                "hex"

            );

        this.refreshTokens.set(

            token,

            sessionId

        );

        this.emit(

            "refreshTokenCreate",

            sessionId

        );

        return token;

    }

    public useRefreshToken(

        token:string

    ){

        const sessionId=

            this.refreshTokens.get(

                token

            );

        if(

            !sessionId

        ){

            return null;

        }

        this.refreshTokens.delete(

            token

        );

        this.refresh(

            sessionId

        );

        return this.get(

            sessionId

        );

    }

    /* --------------------------------------------------------
     * Device Sessions
     * -------------------------------------------------------- */

    public getUserDevices(

        userId:string

    ){

        return this.getUserSessions(

            userId

        ).map(

            session=>({

                id:

                    session.id,

                ip:

                    session.ip,

                userAgent:

                    session.userAgent,

                created:

                    session.created,

                updated:

                    session.updated

            })

        );

    }

    /* --------------------------------------------------------
     * Dashboard Sessions
     * -------------------------------------------------------- */

    public getDashboardSessions(){

        return this.sessions.filter(

            session=>

                session.metadata

                    .dashboard===

                true

        );

    }

    public markDashboard(

        sessionId:string

    ){

        const session=

            this.get(

                sessionId

            );

        if(

            !session

        ){

            return false;

        }

        session.metadata.dashboard=

            true;

        session.updated=

            Date.now();

        this.emit(

            "dashboardSession",

            sessionId

        );

        return true;

    }
      /* --------------------------------------------------------
     * Export Sessions
     * -------------------------------------------------------- */

    public exportSessions(){

        return Array.from(

            this.sessions.values()

        );

    }

    /* --------------------------------------------------------
     * Import Sessions
     * -------------------------------------------------------- */

    public importSessions(

        sessions:Session[]

    ){

        for(

            const session

            of

            sessions

        ){

            this.sessions.set(

                session.id,

                session

            );

        }

        this.statistics.active=

            this.sessions.size;

        this.emit(

            "sessionsImported",

            sessions.length

        );

    }

    /* --------------------------------------------------------
     * Session Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            created:

                this.statistics.created,

            active:

                this.getActiveSessions().size,

            expired:

                this.statistics.expired,

            destroyed:

                this.statistics.destroyed,

            refreshed:

                this.statistics.refreshed,

            validations:

                this.statistics.validations,

            oauthStates:

                this.oauthStates.size,

            refreshTokens:

                this.refreshTokens.size,

            totalSessions:

                this.sessions.size

        };

    }

    public resetStatistics(){

        this.statistics={

            created:0,

            active:this.sessions.size,

            expired:0,

            destroyed:0,

            refreshed:0,

            validations:0

        };

    }

    /* --------------------------------------------------------
     * Clear Everything
     * -------------------------------------------------------- */

    public clear(){

        this.sessions.clear();

        this.oauthStates.clear();

        this.refreshTokens.clear();

        this.statistics.active=0;

        this.emit(

            "sessionsCleared"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.cleanupExpired();

        for(

            const [

                state,

                value

            ]

            of

            this.oauthStates

        ){

            if(

                value.expires<

                Date.now()

            ){

                this.oauthStates.delete(

                    state

                );

            }

        }

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        this.clear();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
