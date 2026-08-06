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
