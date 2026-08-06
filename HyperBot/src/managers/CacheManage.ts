import { Collection } from "discord.js";
import { EventEmitter } from "events";

export interface CacheEntry<T>{

    key:string;

    value:T;

    created:number;

    updated:number;

    expires:number|null;

    hits:number;

}

export class CacheManager extends EventEmitter{

    private readonly caches=

        new Collection<
            string,
            Collection<
                string,
                CacheEntry<any>
            >
        >();

    private statistics={

        created:0,

        hits:0,

        misses:0,

        expired:0,

        deleted:0,

        namespaces:0

    };

    constructor(){

        super();

    }

    /* --------------------------------------------------------
     * Namespace Management
     * -------------------------------------------------------- */

    public createNamespace(

        namespace:string

    ){

        if(

            this.caches.has(

                namespace

            )

        ){

            return;

        }

        this.caches.set(

            namespace,

            new Collection()

        );

        this.statistics.namespaces++;

        this.emit(

            "namespaceCreate",

            namespace

        );

    }

    public deleteNamespace(

        namespace:string

    ){

        this.caches.delete(

            namespace

        );

        this.emit(

            "namespaceDelete",

            namespace

        );

    }

    public hasNamespace(

        namespace:string

    ){

        return this.caches.has(

            namespace

        );

    }

    public getNamespace(

        namespace:string

    ){

        if(

            !this.caches.has(

                namespace

            )

        ){

            this.createNamespace(

                namespace

            );

        }

        return this.caches.get(

            namespace

        )!;

    }

    /* --------------------------------------------------------
     * Set Cache
     * -------------------------------------------------------- */

    public set<T>(

        namespace:string,

        key:string,

        value:T,

        ttl:number|null=null

    ){

        const cache=

            this.getNamespace(

                namespace

            );

        cache.set(

            key,

            {

                key,

                value,

                created:

                    Date.now(),

                updated:

                    Date.now(),

                expires:

                    ttl===null

                    ?null

                    :Date.now()+ttl,

                hits:0

            }

        );

        this.statistics.created++;

        this.emit(

            "cacheSet",

            namespace,

            key

        );

    }

    /* --------------------------------------------------------
     * Get Cache
     * -------------------------------------------------------- */

    public get<T>(

        namespace:string,

        key:string

    ):T|undefined{

        const cache=

            this.getNamespace(

                namespace

            );

        const entry=

            cache.get(

                key

            );

        if(

            !entry

        ){

            this.statistics.misses++;

            return undefined;

        }

        if(

            entry.expires!==null&&

            Date.now()>

            entry.expires

        ){

            cache.delete(

                key

            );

            this.statistics.expired++;

            return undefined;

        }

        entry.hits++;

        entry.updated=

            Date.now();

        this.statistics.hits++;

        return entry.value;

    }

    /* --------------------------------------------------------
     * Exists
     * -------------------------------------------------------- */

    public has(

        namespace:string,

        key:string

    ){

        return this.getNamespace(

            namespace

        ).has(

            key

        );

    }

    /* --------------------------------------------------------
     * Delete
     * -------------------------------------------------------- */

    public delete(

        namespace:string,

        key:string

    ){

        this.getNamespace(

            namespace

        ).delete(

            key

        );

        this.statistics.deleted++;

        this.emit(

            "cacheDelete",

            namespace,

            key

        );

    }

    /* --------------------------------------------------------
     * Clear Namespace
     * -------------------------------------------------------- */

    public clear(

        namespace:string

    ){

        this.getNamespace(

            namespace

        ).clear();

        this.emit(

            "namespaceClear",

            namespace

        );

    }
      /* --------------------------------------------------------
     * Update Cache Entry
     * -------------------------------------------------------- */

    public update<T>(

        namespace:string,

        key:string,

        value:T

    ){

        const cache=

            this.getNamespace(

                namespace

            );

        const entry=

            cache.get(

                key

            );

        if(

            !entry

        ){

            return false;

        }

        entry.value=

            value;

        entry.updated=

            Date.now();

        this.emit(

            "cacheUpdate",

            namespace,

            key

        );

        return true;

    }

    /* --------------------------------------------------------
     * Get Cache Entry
     * -------------------------------------------------------- */

    public getEntry<T>(

        namespace:string,

        key:string

    ):CacheEntry<T>|undefined{

        return this.getNamespace(

            namespace

        ).get(

            key

        );

    }

    /* --------------------------------------------------------
     * Bulk Operations
     * -------------------------------------------------------- */

    public setMany<T>(

        namespace:string,

        values:Map<string,T>

    ){

        for(

            const [

                key,

                value

            ]

            of

            values

        ){

            this.set(

                namespace,

                key,

                value

            );

        }

        this.emit(

            "bulkSet",

            namespace,

            values.size

        );

    }

    public getMany<T>(

        namespace:string,

        keys:string[]

    ){

        const result=

            new Map<string,T>();

        for(

            const key

            of

            keys

        ){

            const value=

                this.get<T>(

                    namespace,

                    key

                );

            if(

                value!==undefined

            ){

                result.set(

                    key,

                    value

                );

            }

        }

        return result;

    }

    public deleteMany(

        namespace:string,

        keys:string[]

    ){

        for(

            const key

            of

            keys

        ){

            this.delete(

                namespace,

                key

            );

        }

        this.emit(

            "bulkDelete",

            namespace,

            keys.length

        );

    }

    /* --------------------------------------------------------
     * Expired Cache Cleanup
     * -------------------------------------------------------- */

    public cleanupExpired(){

        for(

            const [

                namespace,

                cache

            ]

            of

            this.caches

        ){

            for(

                const [

                    key,

                    entry

                ]

                of

                cache

            ){

                if(

                    entry.expires!==null&&

                    Date.now()>

                    entry.expires

                ){

                    cache.delete(

                        key

                    );

                    this.statistics.expired++;

                }

            }

        }

        this.emit(

            "expiredCleanup"

        );

    }

    /* --------------------------------------------------------
     * Automatic Cleanup
     * -------------------------------------------------------- */

    public startCleanup(

        interval:number=

            60000

    ){

        return setInterval(

            ()=>{

                this.cleanupExpired();

            },

            interval

        );

    }

    /* --------------------------------------------------------
     * Cache Sizes
     * -------------------------------------------------------- */

    public size(

        namespace:string

    ){

        return this.getNamespace(

            namespace

        ).size;

    }

    public totalSize(){

        let total=0;

        for(

            const cache

            of

            this.caches.values()

        ){

            total+=cache.size;

        }

        return total;

    }
      /* --------------------------------------------------------
     * Export Cache
     * -------------------------------------------------------- */

    public exportNamespace(

        namespace:string

    ){

        const cache=

            this.getNamespace(

                namespace

            );

        return Array.from(

            cache.values()

        );

    }

    public exportAll(){

        const output:Record<string,any>={};

        for(

            const [

                namespace,

                cache

            ]

            of

            this.caches

        ){

            output[namespace]=

                Array.from(

                    cache.values()

                );

        }

        return output;

    }

    /* --------------------------------------------------------
     * Import Cache
     * -------------------------------------------------------- */

    public importNamespace(

        namespace:string,

        entries:CacheEntry<any>[]

    ){

        const cache=

            this.getNamespace(

                namespace

            );

        cache.clear();

        for(

            const entry

            of

            entries

        ){

            cache.set(

                entry.key,

                entry

            );

        }

        this.emit(

            "namespaceImported",

            namespace

        );

    }

    public importAll(

        data:Record<string,CacheEntry<any>[]>

    ){

        for(

            const namespace

            of

            Object.keys(

                data

            )

        ){

            this.importNamespace(

                namespace,

                data[namespace]

            );

        }

        this.emit(

            "cacheImported"

        );

    }

    /* --------------------------------------------------------
     * Namespace Synchronization
     * -------------------------------------------------------- */

    public synchronize(

        source:string,

        destination:string

    ){

        const sourceCache=

            this.getNamespace(

                source

            );

        const destinationCache=

            this.getNamespace(

                destination

            );

        destinationCache.clear();

        for(

            const [

                key,

                value

            ]

            of

            sourceCache

        ){

            destinationCache.set(

                key,

                {

                    ...value

                }

            );

        }

        this.emit(

            "namespaceSync",

            source,

            destination

        );

    }

    /* --------------------------------------------------------
     * Memory Statistics
     * -------------------------------------------------------- */

    public estimateMemoryUsage(){

        let bytes=0;

        for(

            const cache

            of

            this.caches.values()

        ){

            for(

                const entry

                of

                cache.values()

            ){

                bytes+=

                    Buffer.byteLength(

                        JSON.stringify(

                            entry

                        )

                    );

            }

        }

        return{

            bytes,

            kilobytes:

                bytes/1024,

            megabytes:

                bytes/

                (1024*1024)

        };

    }

    /* --------------------------------------------------------
     * Find Keys
     * -------------------------------------------------------- */

    public findKeys(

        namespace:string,

        search:string

    ){

        return Array.from(

            this.getNamespace(

                namespace

            ).keys()

        ).filter(

            key=>

                key.includes(

                    search

                )

        );

    }

    /* --------------------------------------------------------
     * List Namespaces
     * -------------------------------------------------------- */

    public getNamespaces(){

        return Array.from(

            this.caches.keys()

        );

    }
      /* --------------------------------------------------------
     * Cache Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            created:

                this.statistics.created,

            hits:

                this.statistics.hits,

            misses:

                this.statistics.misses,

            expired:

                this.statistics.expired,

            deleted:

                this.statistics.deleted,

            namespaces:

                this.statistics.namespaces,

            totalEntries:

                this.totalSize()

        };

    }

    public resetStatistics(){

        this.statistics={

            created:0,

            hits:0,

            misses:0,

            expired:0,

            deleted:0,

            namespaces:

                this.caches.size

        };

    }

    /* --------------------------------------------------------
     * Cache Hit Rate
     * -------------------------------------------------------- */

    public getHitRate(){

        const total=

            this.statistics.hits+

            this.statistics.misses;

        if(

            total===0

        ){

            return 0;

        }

        return(

            this.statistics.hits/

            total

        )*100;

    }

    /* --------------------------------------------------------
     * Clear All Namespaces
     * -------------------------------------------------------- */

    public clearAll(){

        for(

            const cache

            of

            this.caches.values()

        ){

            cache.clear();

        }

        this.emit(

            "allCachesCleared"

        );

    }

    /* --------------------------------------------------------
     * Remove Empty Namespaces
     * -------------------------------------------------------- */

    public pruneNamespaces(){

        for(

            const [

                namespace,

                cache

            ]

            of

            this.caches

        ){

            if(

                cache.size===0

            ){

                this.caches.delete(

                    namespace

                );

            }

        }

        this.emit(

            "namespacesPruned"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.cleanupExpired();

        this.pruneNamespaces();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        this.clearAll();

        this.caches.clear();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
