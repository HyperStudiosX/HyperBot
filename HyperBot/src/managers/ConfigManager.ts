import fs from "fs";
import path from "path";
import { EventEmitter } from "events";
import stripJsonComments from "strip-json-comments";

export interface ConfigEntry{

    name:string;

    file:string;

    data:any;

    loaded:boolean;

    modified:number;

}

export class ConfigManager extends EventEmitter{

    private readonly root:string;

    private readonly configs=

        new Map<
            string,
            ConfigEntry
        >();

    private statistics={

        loaded:0,

        saved:0,

        reloaded:0,

        errors:0,

        validations:0

    };

    constructor(

        root:string

    ){

        super();

        this.root=root;

    }

    /* --------------------------------------------------------
     * Path Helpers
     * -------------------------------------------------------- */

    public getPath(

        file:string

    ){

        return path.join(

            this.root,

            file

        );

    }

    public exists(

        file:string

    ){

        return fs.existsSync(

            this.getPath(

                file

            )

        );

    }

    /* --------------------------------------------------------
     * Load Config
     * -------------------------------------------------------- */

    public load(

        file:string

    ){

        const full=

            this.getPath(

                file

            );

        const raw=

            fs.readFileSync(

                full,

                "utf8"

            );

        const parsed=

            JSON.parse(

                stripJsonComments(

                    raw

                )

            );

        const entry:ConfigEntry={

            name:

                path.basename(

                    file

                ),

            file,

            data:

                parsed,

            loaded:true,

            modified:

                Date.now()

        };

        this.configs.set(

            file,

            entry

        );

        this.statistics.loaded++;

        this.emit(

            "configLoad",

            entry

        );

        return entry.data;

    }

    /* --------------------------------------------------------
     * Get Config
     * -------------------------------------------------------- */

    public get<T=any>(

        file:string

    ):T{

        return this.configs.get(

            file

        )?.data;

    }

    public has(

        file:string

    ){

        return this.configs.has(

            file

        );

    }

    public entries(){

        return Array.from(

            this.configs.values()

        );

    }

    /* --------------------------------------------------------
     * Set Value
     * -------------------------------------------------------- */

    public set(

        file:string,

        key:string,

        value:any

    ){

        const config=

            this.configs.get(

                file

            );

        if(

            !config

        ){

            throw new Error(

                `Config ${file} not loaded.`

            );

        }

        config.data[key]=

            value;

        config.modified=

            Date.now();

        this.emit(

            "configUpdate",

            file,

            key,

            value

        );

    }
      /* --------------------------------------------------------
     * Save Config
     * -------------------------------------------------------- */

    public save(

        file:string

    ){

        const config=

            this.configs.get(

                file

            );

        if(

            !config

        ){

            throw new Error(

                `Config ${file} not loaded.`

            );

        }

        fs.writeFileSync(

            this.getPath(

                file

            ),

            JSON.stringify(

                config.data,

                null,

                4

            ),

            "utf8"

        );

        config.modified=

            Date.now();

        this.statistics.saved++;

        this.emit(

            "configSave",

            config

        );

    }

    /* --------------------------------------------------------
     * Save All
     * -------------------------------------------------------- */

    public saveAll(){

        for(

            const config

            of

            this.configs.values()

        ){

            this.save(

                config.file

            );

        }

    }

    /* --------------------------------------------------------
     * Reload Config
     * -------------------------------------------------------- */

    public reload(

        file:string

    ){

        this.configs.delete(

            file

        );

        const data=

            this.load(

                file

            );

        this.statistics.reloaded++;

        this.emit(

            "configReload",

            file

        );

        return data;

    }

    /* --------------------------------------------------------
     * Reload All
     * -------------------------------------------------------- */

    public reloadAll(){

        const files=

            Array.from(

                this.configs.keys()

            );

        this.configs.clear();

        for(

            const file

            of

            files

        ){

            this.load(

                file

            );

        }

        this.emit(

            "reloadAll"

        );

    }

    /* --------------------------------------------------------
     * Delete Config
     * -------------------------------------------------------- */

    public unload(

        file:string

    ){

        this.configs.delete(

            file

        );

        this.emit(

            "configUnload",

            file

        );

    }

    /* --------------------------------------------------------
     * Load Directory
     * -------------------------------------------------------- */

    public loadDirectory(

        directory:string

    ){

        const full=

            this.getPath(

                directory

            );

        const files=

            fs.readdirSync(

                full

            );

        for(

            const file

            of

            files

        ){

            if(

                file.endsWith(

                    ".json"

                )||

                file.endsWith(

                    ".jsonc"

                )

            ){

                this.load(

                    path.join(

                        directory,

                        file

                    )

                );

            }

        }

        this.emit(

            "directoryLoad",

            directory

        );

    }

    /* --------------------------------------------------------
     * Default Values
     * -------------------------------------------------------- */

    public applyDefaults(

        file:string,

        defaults:any

    ){

        const config=

            this.get(

                file

            );

        if(

            !config

        ){

            return;

        }

        for(

            const key

            of

            Object.keys(

                defaults

            )

        ){

            if(

                config[key]===

                undefined

            ){

                config[key]=

                    defaults[key];

            }

        }

        this.emit(

            "defaultsApplied",

            file

        );

    }
      /* --------------------------------------------------------
     * Validate Configuration
     * -------------------------------------------------------- */

    public validate(

        file:string,

        schema:Record<string,any>

    ){

        const config=

            this.get(

                file

            );

        if(

            !config

        ){

            throw new Error(

                `${file} is not loaded.`

            );

        }

        const errors:string[]=[];

        for(

            const key

            of

            Object.keys(

                schema

            )

        ){

            if(

                config[key]===

                undefined

            ){

                errors.push(

                    `Missing property: ${key}`

                );

                continue;

            }

            const expected=

                schema[key];

            if(

                expected!==null

            ){

                if(

                    typeof config[key]!==

                    expected

                ){

                    errors.push(

                        `${key} should be ${expected}`

                    );

                }

            }

        }

        this.statistics.validations++;

        if(

            errors.length>0

        ){

            this.statistics.errors++;

            this.emit(

                "validationFailed",

                file,

                errors

            );

            return{

                valid:false,

                errors

            };

        }

        this.emit(

            "validationSuccess",

            file

        );

        return{

            valid:true,

            errors:[]

        };

    }

    /* --------------------------------------------------------
     * Environment Overrides
     * -------------------------------------------------------- */

    public applyEnvironment(

        file:string,

        prefix:string="BOT_"

    ){

        const config=

            this.get(

                file

            );

        if(

            !config

        ){

            return;

        }

        for(

            const key

            of

            Object.keys(

                config

            )

        ){

            const env=

                process.env[

                    prefix+

                    key.toUpperCase()

                ];

            if(

                env===undefined

            ){

                continue;

            }

            config[key]=env;
        }

        this.emit(

            "environmentApplied",

            file

        );

    }

    /* --------------------------------------------------------
     * Watch Configuration File
     * -------------------------------------------------------- */

    public watch(

        file:string

    ){

        fs.watchFile(

            this.getPath(

                file

            ),

            ()=>{

                try{

                    this.reload(

                        file

                    );

                    this.emit(

                        "fileChanged",

                        file

                    );

                }

                catch(error){

                    this.statistics.errors++;

                    this.emit(

                        "watchError",

                        error

                    );

                }

            }

        );

    }

    /* --------------------------------------------------------
     * Watch All Loaded Configs
     * -------------------------------------------------------- */

    public watchAll(){

        for(

            const config

            of

            this.configs.values()

        ){

            this.watch(

                config.file

            );

        }

    }

    /* --------------------------------------------------------
     * Stop Watching
     * -------------------------------------------------------- */

    public unwatch(

        file:string

    ){

        fs.unwatchFile(

            this.getPath(

                file

            )

        );

    }

    public unwatchAll(){

        for(

            const config

            of

            this.configs.values()

        ){

            this.unwatch(

                config.file

            );

        }

    }
      /* --------------------------------------------------------
     * Backup Configuration
     * -------------------------------------------------------- */

    public backup(

        file:string,

        directory:string="backups/config"

    ){

        const config=

            this.configs.get(

                file

            );

        if(

            !config

        ){

            throw new Error(

                `Config ${file} not loaded.`

            );

        }

        const backupDir=

            this.getPath(

                directory

            );

        if(

            !fs.existsSync(

                backupDir

            )

        ){

            fs.mkdirSync(

                backupDir,

                {

                    recursive:true

                }

            );

        }

        const backupFile=

            path.join(

                backupDir,

                `${path.basename(file)}.${Date.now()}.bak`

            );

        fs.writeFileSync(

            backupFile,

            JSON.stringify(

                config.data,

                null,

                4

            ),

            "utf8"

        );

        this.emit(

            "backupCreated",

            backupFile

        );

    }

    /* --------------------------------------------------------
     * Export Config
     * -------------------------------------------------------- */

    public export(

        file:string

    ){

        const config=

            this.configs.get(

                file

            );

        if(

            !config

        ){

            return null;

        }

        return JSON.stringify(

            config.data,

            null,

            4

        );

    }

    /* --------------------------------------------------------
     * Import Config
     * -------------------------------------------------------- */

    public import(

        file:string,

        json:string

    ){

        const data=

            JSON.parse(

                json

            );

        this.configs.set(

            file,

            {

                name:path.basename(file),

                file,

                data,

                loaded:true,

                modified:Date.now()

            }

        );

        this.emit(

            "configImport",

            file

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            loaded:

                this.statistics.loaded,

            saved:

                this.statistics.saved,

            reloaded:

                this.statistics.reloaded,

            validations:

                this.statistics.validations,

            errors:

                this.statistics.errors,

            cached:

                this.configs.size

        };

    }

    public resetStatistics(){

        this.statistics={

            loaded:0,

            saved:0,

            reloaded:0,

            validations:0,

            errors:0

        };

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.unwatchAll();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        this.configs.clear();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}

