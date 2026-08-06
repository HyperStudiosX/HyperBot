import {
    ApplicationCommandDataResolvable,
    ChatInputApplicationCommandData,
    Client,
    Collection,
    ContextMenuCommandBuilder,
    PermissionFlagsBits,
    REST,
    Routes,
    SlashCommandBuilder
} from "discord.js";

import { EventEmitter } from "events";

export interface Command{

    name:string;

    description:string;

    category:string;

    cooldown:number;

    enabled:boolean;

    permissions:bigint[];

    builder:

        ApplicationCommandDataResolvable;

    execute(...args:any[]):Promise<any>;

}

export class CommandManager extends EventEmitter{

    private readonly client:Client;

    private readonly commands=

        new Collection<
            string,
            Command
        >();

    private readonly cooldowns=

        new Collection<
            string,
            Map<string,number>
        >();

    private statistics={

        loaded:0,

        registered:0,

        executed:0,

        errors:0,

        cooldownHits:0

    };

    constructor(

        client:Client

    ){

        super();

        this.client=client;

    }

    /* --------------------------------------------------------
     * Register Command
     * -------------------------------------------------------- */

    public register(

        command:Command

    ){

        this.commands.set(

            command.name,

            command

        );

        this.statistics.loaded++;

        this.emit(

            "commandRegister",

            command

        );

    }

    /* --------------------------------------------------------
     * Unregister
     * -------------------------------------------------------- */

    public unregister(

        name:string

    ){

        this.commands.delete(

            name

        );

        this.emit(

            "commandRemove",

            name

        );

    }

    /* --------------------------------------------------------
     * Lookup
     * -------------------------------------------------------- */

    public getCommand(

        name:string

    ){

        return this.commands.get(

            name

        );

    }

    public getCommands(){

        return Array.from(

            this.commands.values()

        );

    }

    /* --------------------------------------------------------
     * Categories
     * -------------------------------------------------------- */

    public getCategories(){

        return [

            ...new Set(

                this.getCommands().map(

                    command=>

                        command.category

                )

            )

        ];

    }

    public getCommandsByCategory(

        category:string

    ){

        return this.getCommands().filter(

            command=>

                command.category===

                category

        );

    }
        /* --------------------------------------------------------
     * Load Built-in Commands
     * -------------------------------------------------------- */

    public loadDefaults(){

        this.register({

            name:"ticket",

            description:"Create a new ticket.",

            category:"Tickets",

            cooldown:5,

            enabled:true,

            permissions:[],

            builder:new SlashCommandBuilder()

                .setName("ticket")

                .setDescription("Create a support ticket"),

            execute:async()=>{}

        });

        this.register({

            name:"close",

            description:"Close a ticket.",

            category:"Tickets",

            cooldown:3,

            enabled:true,

            permissions:[

                PermissionFlagsBits.ManageChannels

            ],

            builder:new SlashCommandBuilder()

                .setName("close")

                .setDescription("Close the current ticket"),

            execute:async()=>{}

        });

        this.register({

            name:"panel",

            description:"Manage ticket panels.",

            category:"Administration",

            cooldown:2,

            enabled:true,

            permissions:[

                PermissionFlagsBits.Administrator

            ],

            builder:new SlashCommandBuilder()

                .setName("panel")

                .setDescription("Panel management"),

            execute:async()=>{}

        });

        this.register({

            name:"stats",

            description:"View bot statistics.",

            category:"Utility",

            cooldown:5,

            enabled:true,

            permissions:[],

            builder:new SlashCommandBuilder()

                .setName("stats")

                .setDescription("Display bot statistics"),

            execute:async()=>{}

        });

    }

    /* --------------------------------------------------------
     * Register Slash Commands
     * -------------------------------------------------------- */

    public async registerApplicationCommands(

        token:string,

        clientId:string,

        guildId?:string

    ){

        const rest=

            new REST({

                version:"10"

            }).setToken(

                token

            );

        const commands=

            this.getCommands()

            .map(

                command=>

                    command.builder

            ) as ApplicationCommandDataResolvable[];

        if(

            guildId

        ){

            await rest.put(

                Routes.applicationGuildCommands(

                    clientId,

                    guildId

                ),

                {

                    body:commands

                }

            );

        }

        else{

            await rest.put(

                Routes.applicationCommands(

                    clientId

                ),

                {

                    body:commands

                }

            );

        }

        this.statistics.registered=

            commands.length;

        this.emit(

            "commandsRegistered",

            commands.length

        );

    }

    /* --------------------------------------------------------
     * Validation
     * -------------------------------------------------------- */

    public validate(

        command:Command

    ){

        if(

            !command.name ||

            !command.description

        ){

            throw new Error(

                "Invalid command."

            );

        }

        if(

            this.commands.has(

                command.name

            )

        ){

            throw new Error(

                "Duplicate command."

            );

        }

        return true;

    }

    /* --------------------------------------------------------
     * Enable / Disable
     * -------------------------------------------------------- */

    public enable(

        name:string

    ){

        const command=

            this.getCommand(

                name

            );

        if(

            command

        ){

            command.enabled=true;

        }

    }

    public disable(

        name:string

    ){

        const command=

            this.getCommand(

                name

            );

        if(

            command

        ){

            command.enabled=false;

        }

    }

    /* --------------------------------------------------------
     * Exists
     * -------------------------------------------------------- */

    public exists(

        name:string

    ){

        return this.commands.has(

            name

        );

    }

    /* --------------------------------------------------------
     * Count
     * -------------------------------------------------------- */

    public count(){

        return this.commands.size;

    }
        /* --------------------------------------------------------
     * Cooldown Management
     * -------------------------------------------------------- */

    public onCooldown(

        command:string,

        userId:string

    ):number{

        const map=

            this.cooldowns.get(

                command

            );

        if(

            !map

        ){

            return 0;

        }

        const expires=

            map.get(

                userId

            );

        if(

            !expires

        ){

            return 0;

        }

        const remaining=

            expires-

            Date.now();

        if(

            remaining<=0

        ){

            map.delete(

                userId

            );

            return 0;

        }

        return remaining;

    }

    public applyCooldown(

        command:string,

        userId:string,

        seconds:number

    ){

        let map=

            this.cooldowns.get(

                command

            );

        if(

            !map

        ){

            map=

                new Map();

            this.cooldowns.set(

                command,

                map

            );

        }

        map.set(

            userId,

            Date.now()+

            seconds*

            1000

        );

    }

    public clearCooldown(

        command:string,

        userId:string

    ){

        this.cooldowns

            .get(command)

            ?.delete(

                userId

            );

    }

    public clearAllCooldowns(){

        this.cooldowns.clear();

    }

    /* --------------------------------------------------------
     * Permission Check
     * -------------------------------------------------------- */

    public hasPermissions(

        member:any,

        command:Command

    ){

        if(

            command.permissions.length===0

        ){

            return true;

        }

        return command.permissions.every(

            permission=>

                member.permissions.has(

                    permission

                )

        );

    }

    /* --------------------------------------------------------
     * Execute Command
     * -------------------------------------------------------- */

    public async execute(

        name:string,

        interaction:any

    ){

        const command=

            this.getCommand(

                name

            );

        if(

            !command

        ){

            throw new Error(

                `Unknown command: ${name}`

            );

        }

        if(

            !command.enabled

        ){

            return interaction.reply({

                content:

                    "This command is currently disabled.",

                ephemeral:true

            });

        }

        const cooldown=

            this.onCooldown(

                command.name,

                interaction.user.id

            );

        if(

            cooldown>0

        ){

            this.statistics.cooldownHits++;

            return interaction.reply({

                content:

                    `Please wait ${Math.ceil(cooldown/1000)} seconds before using this command again.`,

                ephemeral:true

            });

        }

        if(

            !this.hasPermissions(

                interaction.member,

                command

            )

        ){

            return interaction.reply({

                content:

                    "You do not have permission to use this command.",

                ephemeral:true

            });

        }

        this.applyCooldown(

            command.name,

            interaction.user.id,

            command.cooldown

        );

        try{

            await command.execute(

                interaction

            );

            this.statistics.executed++;

            this.emit(

                "commandExecuted",

                command,

                interaction.user.id

            );

        }

        catch(error){

            this.statistics.errors++;

            this.emit(

                "commandError",

                error,

                command

            );

            throw error;

        }

    }
        /* --------------------------------------------------------
     * Dynamic Command Loading
     * -------------------------------------------------------- */

    public async loadDirectory(

        directory:string

    ){

        const fs=

            await import("fs");

        const path=

            await import("path");

        if(

            !fs.existsSync(

                directory

            )

        ){

            return;

        }

        const files=

            fs.readdirSync(

                directory

            ).filter(

                file=>

                    file.endsWith(".js")||

                    file.endsWith(".ts")

            );

        for(

            const file

            of

            files

        ){

            const module=

                await import(

                    path.join(

                        directory,

                        file

                    )

                );

            const command=

                module.default;

            if(

                !command

            ){

                continue;

            }

            this.validate(

                command

            );

            this.register(

                command

            );

        }

        this.emit(

            "directoryLoaded",

            directory

        );

    }

    /* --------------------------------------------------------
     * Reload Command
     * -------------------------------------------------------- */

    public async reload(

        name:string,

        directory:string

    ){

        this.unregister(

            name

        );

        await this.loadDirectory(

            directory

        );

        this.emit(

            "commandReload",

            name

        );

    }

    /* --------------------------------------------------------
     * Reload All
     * -------------------------------------------------------- */

    public async reloadAll(

        directory:string

    ){

        this.commands.clear();

        await this.loadDirectory(

            directory

        );

        this.emit(

            "reloadAll"

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            loaded:

                this.statistics.loaded,

            registered:

                this.statistics.registered,

            executed:

                this.statistics.executed,

            errors:

                this.statistics.errors,

            cooldownHits:

                this.statistics.cooldownHits,

            commands:

                this.commands.size,

            cooldownMaps:

                this.cooldowns.size

        };

    }

    public resetStatistics(){

        this.statistics={

            loaded:0,

            registered:0,

            executed:0,

            errors:0,

            cooldownHits:0

        };

    }

    /* --------------------------------------------------------
     * Export
     * -------------------------------------------------------- */

    public exportCommands(){

        return this.getCommands().map(

            command=>({

                name:

                    command.name,

                description:

                    command.description,

                category:

                    command.category,

                cooldown:

                    command.cooldown,

                enabled:

                    command.enabled

            })

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.clearAllCooldowns();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        this.commands.clear();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}

