import {
    GuildMember,
    Snowflake,
    User
} from "discord.js";

import {
    Session,
    CreateSessionOptions
} from "../types/Session";

export interface Authentication{

    /* --------------------------------------------------------
     * Authentication
     * -------------------------------------------------------- */

    login(

        user:User,

        ip:string,

        secret:string

    ):Promise<{

        session:Session;

        token:string;

    }>;

    logout(

        sessionId:string

    ):Promise<void>;

    /* --------------------------------------------------------
     * Sessions
     * -------------------------------------------------------- */

    createSession(

        user:User,

        ip:string

    ):Promise<Session>;

    destroySession(

        sessionId:string

    ):Promise<void>;

    refreshSession(

        sessionId:string

    ):Promise<Session|null>;

    /* --------------------------------------------------------
     * Tokens
     * -------------------------------------------------------- */

    generateToken(

        payload:unknown,

        secret:string,

        expiresIn?:string

    ):string;

    verifyToken(

        token:string,

        secret:string

    ):unknown;

    generateApiKey():string;

    generateRefreshToken():string;

    /* --------------------------------------------------------
     * Security
     * -------------------------------------------------------- */

    hashPassword(

        password:string

    ):Promise<string>;

    verifyPassword(

        password:string,

        hash:string

    ):Promise<boolean>;

    hasPermission(

        member:GuildMember,

        node:string

    ):boolean;

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    getStatistics():Promise<unknown>;

}
