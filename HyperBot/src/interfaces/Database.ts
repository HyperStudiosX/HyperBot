export interface Database{

    /* --------------------------------------------------------
     * Connection
     * -------------------------------------------------------- */

    connect():Promise<void>;

    disconnect():Promise<void>;

    reconnect():Promise<void>;

    isConnected():boolean;

    /* --------------------------------------------------------
     * Transactions
     * -------------------------------------------------------- */

    beginTransaction():Promise<void>;

    commitTransaction():Promise<void>;

    rollbackTransaction():Promise<void>;

    /* --------------------------------------------------------
     * Queries
     * -------------------------------------------------------- */

    query<T=unknown>(

        sql:string,

        parameters?:unknown[]

    ):Promise<T>;

    execute(

        sql:string,

        parameters?:unknown[]

    ):Promise<number>;

    /* --------------------------------------------------------
     * Health
     * -------------------------------------------------------- */

    ping():Promise<boolean>;

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    getStatistics():unknown;

}
