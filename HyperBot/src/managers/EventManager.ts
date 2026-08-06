import {
    Channel,
    Client,
    Collection,
    Events,
    Guild,
    GuildBan,
    GuildMember,
    Interaction,
    Invite,
    Message,
    MessageReaction,
    PartialMessage,
    PartialMessageReaction,
    Presence,
    Role,
    StageInstance,
    TextChannel,
    ThreadChannel,
    User,
    VoiceState
} from "discord.js";

import { EventEmitter } from "events";

export interface RegisteredEvent{

    name:string;

    once:boolean;

    enabled:boolean;

    executions:number;

}

export class EventManager extends EventEmitter{

    private readonly client:Client;

    private readonly events=

        new Collection<
            string,
            RegisteredEvent
        >();

    private statistics={

        registered:0,

        executed:0,

        errors:0,

        onceEvents:0

    };

    constructor(

        client:Client

    ){

        super();

        this.client=client;

    }

    /* --------------------------------------------------------
     * Register Event
     * -------------------------------------------------------- */

    public register(

        name:string,

        listener:(...args:any[])=>Promise<any>|any,

        once:boolean=false

    ){

        const event:RegisteredEvent={

            name,

            once,

            enabled:true,

            executions:0

        };

        this.events.set(

            name,

            event

        );

        const execute=

            async(...args:any[])=>{

                if(

                    !event.enabled

                ){

                    return;

                }

                try{

                    event.executions++;

                    this.statistics.executed++;

                    await listener(

                        ...args

                    );

                    this.emit(

                        "eventExecuted",

                        name

                    );

                }

                catch(error){

                    this.statistics.errors++;

                    this.emit(

                        "eventError",

                        name,

                        error

                    );

                }

            };

        if(

            once

        ){

            this.client.once(

                name as any,

                execute

            );

            this.statistics.onceEvents++;

        }

        else{

            this.client.on(

                name as any,

                execute

            );

        }

        this.statistics.registered++;

        this.emit(

            "eventRegistered",

            event

        );

    }

    /* --------------------------------------------------------
     * Register Core Events
     * -------------------------------------------------------- */

    public registerCoreEvents(){

        this.register(

            Events.ClientReady,

            async()=>{

                console.log(

                    `[READY] ${this.client.user?.tag}`

                );

            },

            true

        );

        this.register(

            Events.InteractionCreate,

            async(

                interaction:Interaction

            )=>{

                this.emit(

                    "interaction",

                    interaction

                );

            }

        );

        this.register(

            Events.MessageCreate,

            async(

                message:Message

            )=>{

                this.emit(

                    "message",

                    message

                );

            }

        );

        this.register(

            Events.GuildCreate,

            async(

                guild:Guild

            )=>{

                this.emit(

                    "guildJoin",

                    guild

                );

            }

        );

        this.register(

            Events.GuildDelete,

            async(

                guild:Guild

            )=>{

                this.emit(

                    "guildLeave",

                    guild

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Lookup
     * -------------------------------------------------------- */

    public getEvent(

        name:string

    ){

        return this.events.get(

            name

        );

    }

    public getEvents(){

        return Array.from(

            this.events.values()

        );

    }

    public exists(

        name:string

    ){

        return this.events.has(

            name

        );

    }
      /* --------------------------------------------------------
     * Enable / Disable Events
     * -------------------------------------------------------- */

    public enable(

        name:string

    ){

        const event=

            this.events.get(

                name

            );

        if(

            !event

        ){

            return false;

        }

        event.enabled=true;

        this.emit(

            "eventEnabled",

            name

        );

        return true;

    }

    public disable(

        name:string

    ){

        const event=

            this.events.get(

                name

            );

        if(

            !event

        ){

            return false;

        }

        event.enabled=false;

        this.emit(

            "eventDisabled",

            name

        );

        return true;

    }

    public isEnabled(

        name:string

    ){

        return this.events.get(

            name

        )?.enabled??

        false;

    }

    /* --------------------------------------------------------
     * Message Events
     * -------------------------------------------------------- */

    public registerMessageEvents(){

        this.register(

            Events.MessageDelete,

            async(

                message:

                    Message|

                    PartialMessage

            )=>{

                this.emit(

                    "messageDelete",

                    message

                );

            }

        );

        this.register(

            Events.MessageUpdate,

            async(

                oldMessage:

                    Message|

                    PartialMessage,

                newMessage:

                    Message|

                    PartialMessage

            )=>{

                this.emit(

                    "messageUpdate",

                    oldMessage,

                    newMessage

                );

            }

        );

        this.register(

            Events.MessageReactionAdd,

            async(

                reaction:

                    MessageReaction|

                    PartialMessageReaction,

                user:User

            )=>{

                this.emit(

                    "reactionAdd",

                    reaction,

                    user

                );

            }

        );

        this.register(

            Events.MessageReactionRemove,

            async(

                reaction:

                    MessageReaction|

                    PartialMessageReaction,

                user:User

            )=>{

                this.emit(

                    "reactionRemove",

                    reaction,

                    user

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Guild Events
     * -------------------------------------------------------- */

    public registerGuildEvents(){

        this.register(

            Events.GuildMemberAdd,

            async(

                member:GuildMember

            )=>{

                this.emit(

                    "memberJoin",

                    member

                );

            }

        );

        this.register(

            Events.GuildMemberRemove,

            async(

                member:GuildMember

            )=>{

                this.emit(

                    "memberLeave",

                    member

                );

            }

        );

        this.register(

            Events.GuildMemberUpdate,

            async(

                oldMember:

                    GuildMember,

                newMember:

                    GuildMember

            )=>{

                this.emit(

                    "memberUpdate",

                    oldMember,

                    newMember

                );

            }

        );

        this.register(

            Events.GuildBanAdd,

            async(

                ban:GuildBan

            )=>{

                this.emit(

                    "guildBan",

                    ban

                );

            }

        );

        this.register(

            Events.GuildBanRemove,

            async(

                ban:GuildBan

            )=>{

                this.emit(

                    "guildUnban",

                    ban

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Channel Events
     * -------------------------------------------------------- */

    public registerChannelEvents(){

        this.register(

            Events.ChannelCreate,

            async(

                channel:Channel

            )=>{

                this.emit(

                    "channelCreate",

                    channel

                );

            }

        );

        this.register(

            Events.ChannelDelete,

            async(

                channel:Channel

            )=>{

                this.emit(

                    "channelDelete",

                    channel

                );

            }

        );

        this.register(

            Events.ChannelUpdate,

            async(

                oldChannel:Channel,

                newChannel:Channel

            )=>{

                this.emit(

                    "channelUpdate",

                    oldChannel,

                    newChannel

                );

            }

        );

    }
      /* --------------------------------------------------------
     * Role Events
     * -------------------------------------------------------- */

    public registerRoleEvents(){

        this.register(

            Events.GuildRoleCreate,

            async(

                role:Role

            )=>{

                this.emit(

                    "roleCreate",

                    role

                );

            }

        );

        this.register(

            Events.GuildRoleDelete,

            async(

                role:Role

            )=>{

                this.emit(

                    "roleDelete",

                    role

                );

            }

        );

        this.register(

            Events.GuildRoleUpdate,

            async(

                oldRole:Role,

                newRole:Role

            )=>{

                this.emit(

                    "roleUpdate",

                    oldRole,

                    newRole

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Voice Events
     * -------------------------------------------------------- */

    public registerVoiceEvents(){

        this.register(

            Events.VoiceStateUpdate,

            async(

                oldState:VoiceState,

                newState:VoiceState

            )=>{

                this.emit(

                    "voiceStateUpdate",

                    oldState,

                    newState

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Thread Events
     * -------------------------------------------------------- */

    public registerThreadEvents(){

        this.register(

            Events.ThreadCreate,

            async(

                thread:ThreadChannel

            )=>{

                this.emit(

                    "threadCreate",

                    thread

                );

            }

        );

        this.register(

            Events.ThreadDelete,

            async(

                thread:ThreadChannel

            )=>{

                this.emit(

                    "threadDelete",

                    thread

                );

            }

        );

        this.register(

            Events.ThreadUpdate,

            async(

                oldThread:ThreadChannel,

                newThread:ThreadChannel

            )=>{

                this.emit(

                    "threadUpdate",

                    oldThread,

                    newThread

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Invite Events
     * -------------------------------------------------------- */

    public registerInviteEvents(){

        this.register(

            Events.InviteCreate,

            async(

                invite:Invite

            )=>{

                this.emit(

                    "inviteCreate",

                    invite

                );

            }

        );

        this.register(

            Events.InviteDelete,

            async(

                invite:Invite

            )=>{

                this.emit(

                    "inviteDelete",

                    invite

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Presence Events
     * -------------------------------------------------------- */

    public registerPresenceEvents(){

        this.register(

            Events.PresenceUpdate,

            async(

                oldPresence:

                    Presence|null,

                newPresence:

                    Presence

            )=>{

                this.emit(

                    "presenceUpdate",

                    oldPresence,

                    newPresence

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Stage Instance Events
     * -------------------------------------------------------- */

    public registerStageEvents(){

        this.register(

            Events.StageInstanceCreate,

            async(

                stage:StageInstance

            )=>{

                this.emit(

                    "stageCreate",

                    stage

                );

            }

        );

        this.register(

            Events.StageInstanceDelete,

            async(

                stage:StageInstance

            )=>{

                this.emit(

                    "stageDelete",

                    stage

                );

            }

        );

        this.register(

            Events.StageInstanceUpdate,

            async(

                oldStage:StageInstance,

                newStage:StageInstance

            )=>{

                this.emit(

                    "stageUpdate",

                    oldStage,

                    newStage

                );

            }

        );

    }
      /* --------------------------------------------------------
     * Register All Event Groups
     * -------------------------------------------------------- */

    public registerAll(){

        this.registerCoreEvents();

        this.registerMessageEvents();

        this.registerGuildEvents();

        this.registerChannelEvents();

        this.registerRoleEvents();

        this.registerVoiceEvents();

        this.registerThreadEvents();

        this.registerInviteEvents();

        this.registerPresenceEvents();

        this.registerStageEvents();

        this.emit(

            "allEventsRegistered"

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            registered:

                this.statistics.registered,

            executed:

                this.statistics.executed,

            errors:

                this.statistics.errors,

            onceEvents:

                this.statistics.onceEvents,

            enabled:

                this.getEvents()

                    .filter(

                        event=>

                            event.enabled

                    ).length,

            disabled:

                this.getEvents()

                    .filter(

                        event=>

                            !event.enabled

                    ).length

        };

    }

    public resetStatistics(){

        this.statistics={

            registered:0,

            executed:0,

            errors:0,

            onceEvents:0

        };

    }

    /* --------------------------------------------------------
     * Export Events
     * -------------------------------------------------------- */

    public exportEvents(){

        return this.getEvents().map(

            event=>({

                name:

                    event.name,

                once:

                    event.once,

                enabled:

                    event.enabled,

                executions:

                    event.executions

            })

        );

    }

    /* --------------------------------------------------------
     * Unregister Event
     * -------------------------------------------------------- */

    public unregister(

        name:string

    ){

        this.events.delete(

            name

        );

        this.client.removeAllListeners(

            name as any

        );

        this.emit(

            "eventUnregistered",

            name

        );

    }

    public unregisterAll(){

        for(

            const event

            of

            this.getEvents()

        ){

            this.client.removeAllListeners(

                event.name as any

            );

        }

        this.events.clear();

        this.emit(

            "allEventsUnregistered"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

        this.unregisterAll();

        this.emit(

            "cleanup"

        );

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cleanup();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
