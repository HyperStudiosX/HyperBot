import {
    ActionRowBuilder,
    AnySelectMenuInteraction,
    AutocompleteInteraction,
    ButtonInteraction,
    CacheType,
    ChatInputCommandInteraction,
    Client,
    ContextMenuCommandInteraction,
    Events,
    Interaction,
    InteractionReplyOptions,
    ModalSubmitInteraction,
    StringSelectMenuInteraction,
    UserContextMenuCommandInteraction,
    MessageContextMenuCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    GuildMember
} from "discord.js";

import { EventEmitter } from "events";

import { TicketManager } from "./TicketManager";
import { PanelManager } from "./PanelManager";
import { DatabaseManager } from "./DatabaseManager";
import { TranscriptManager } from "./TranscriptManager";
import { DashboardManager } from "./DashboardManager";

export class InteractionManager extends EventEmitter{

    private readonly client:Client;

    private readonly ticketManager:TicketManager;

    private readonly panelManager:PanelManager;

    private readonly databaseManager:DatabaseManager;

    private readonly transcriptManager:TranscriptManager;

    private readonly dashboardManager:DashboardManager;

    private statistics={

        total:0,

        slashCommands:0,

        buttons:0,

        selectMenus:0,

        modals:0,

        autocomplete:0,

        contextMenus:0,

        errors:0

    };

    constructor(

        client:Client,

        ticketManager:TicketManager,

        panelManager:PanelManager,

        databaseManager:DatabaseManager,

        transcriptManager:TranscriptManager,

        dashboardManager:DashboardManager

    ){

        super();

        this.client=client;

        this.ticketManager=ticketManager;

        this.panelManager=panelManager;

        this.databaseManager=databaseManager;

        this.transcriptManager=transcriptManager;

        this.dashboardManager=dashboardManager;

    }

    /* --------------------------------------------------------
     * Register
     * -------------------------------------------------------- */

    public register(){

        this.client.on(

            Events.InteractionCreate,

            async(

                interaction

            )=>{

                await this.handle(

                    interaction

                );

            }

        );

    }

    /* --------------------------------------------------------
     * Main Router
     * -------------------------------------------------------- */

    private async handle(

        interaction:Interaction

    ){

        this.statistics.total++;

        try{

            if(

                interaction.isChatInputCommand()

            ){

                this.statistics.slashCommands++;

                return this.handleSlash(

                    interaction

                );

            }

            if(

                interaction.isButton()

            ){

                this.statistics.buttons++;

                return this.handleButton(

                    interaction

                );

            }

            if(

                interaction.isStringSelectMenu()

            ){

                this.statistics.selectMenus++;

                return this.handleSelect(

                    interaction

                );

            }

            if(

                interaction.isModalSubmit()

            ){

                this.statistics.modals++;

                return this.handleModal(

                    interaction

                );

            }

            if(

                interaction.isAutocomplete()

            ){

                this.statistics.autocomplete++;

                return this.handleAutocomplete(

                    interaction

                );

            }

            if(

                interaction.isContextMenuCommand()

            ){

                this.statistics.contextMenus++;

                return this.handleContext(

                    interaction

                );

            }

        }

        catch(error){

            this.statistics.errors++;

            console.error(

                "[InteractionManager]",

                error

            );

            if(

                interaction.isRepliable()

            ){

                if(

                    interaction.deferred ||

                    interaction.replied

                ){

                    await interaction.followUp({

                        content:

                            "❌ An unexpected error occurred.",

                        ephemeral:true

                    });

                }

                else{

                    await interaction.reply({

                        content:

                            "❌ An unexpected error occurred.",

                        ephemeral:true

                    });

                }

            }

        }

    }

    /* --------------------------------------------------------
     * Helpers
     * -------------------------------------------------------- */

    private async success(

        interaction:

            ChatInputCommandInteraction|

            ButtonInteraction|

            ModalSubmitInteraction,

        message:string

    ){

        return interaction.reply({

            embeds:[

                new EmbedBuilder()

                    .setColor(0x57F287)

                    .setDescription(message)

            ],

            ephemeral:true

        });

    }

    private async error(

        interaction:any,

        message:string

    ){

        return interaction.reply({

            embeds:[

                new EmbedBuilder()

                    .setColor(0xED4245)

                    .setDescription(message)

            ],

            ephemeral:true

        });

    }

    private hasPermission(

        interaction:any,

        permission:bigint

    ){

        if(

            !interaction.member

        ) return false;

        return (

            interaction.member as GuildMember

        ).permissions.has(

            permission

        );

    }
      /* --------------------------------------------------------
     * Slash Commands
     * -------------------------------------------------------- */

    private async handleSlash(

        interaction:ChatInputCommandInteraction

    ){

        switch(

            interaction.commandName

        ){

            case "ticket":

                return this.commandTicket(

                    interaction

                );

            case "close":

                return this.commandClose(

                    interaction

                );

            case "reopen":

                return this.commandReopen(

                    interaction

                );

            case "delete":

                return this.commandDelete(

                    interaction

                );

            case "claim":

                return this.commandClaim(

                    interaction

                );

            case "unclaim":

                return this.commandUnclaim(

                    interaction

                );

            case "rename":

                return this.commandRename(

                    interaction

                );

            case "move":

                return this.commandMove(

                    interaction

                );

            case "priority":

                return this.commandPriority(

                    interaction

                );

            case "add":

                return this.commandAdd(

                    interaction

                );

            case "remove":

                return this.commandRemove(

                    interaction

                );

            case "transcript":

                return this.commandTranscript(

                    interaction

                );

            case "panel":

                return this.commandPanel(

                    interaction

                );

            case "stats":

                return this.commandStats(

                    interaction

                );

            default:

                return this.error(

                    interaction,

                    "Unknown command."

                );

        }

    }

    /* --------------------------------------------------------
     * Ticket
     * -------------------------------------------------------- */

    private async commandTicket(

        interaction:ChatInputCommandInteraction

    ){

        await interaction.reply({

            content:

                "Ticket creation will be handled by the selected panel.",

            ephemeral:true

        });

    }

    /* --------------------------------------------------------
     * Close
     * -------------------------------------------------------- */

    private async commandClose(

        interaction:ChatInputCommandInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(

            !ticket

        ){

            return this.error(

                interaction,

                "This channel is not a ticket."

            );

        }

        ticket.status="CLOSED";

        ticket.closed=Date.now();

        this.ticketManager.emit(

            "ticketClose",

            ticket

        );

        return this.success(

            interaction,

            "✅ Ticket closed."

        );

    }

    /* --------------------------------------------------------
     * Reopen
     * -------------------------------------------------------- */

    private async commandReopen(

        interaction:ChatInputCommandInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(

            !ticket

        ){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.status="OPEN";

        ticket.closed=undefined;

        this.ticketManager.emit(

            "ticketReopen",

            ticket

        );

        return this.success(

            interaction,

            "✅ Ticket reopened."

        );

    }

    /* --------------------------------------------------------
     * Delete
     * -------------------------------------------------------- */

    private async commandDelete(

        interaction:ChatInputCommandInteraction

    ){

        if(

            !this.hasPermission(

                interaction,

                PermissionFlagsBits.ManageChannels

            )

        ){

            return this.error(

                interaction,

                "Missing permission."

            );

        }

        await interaction.reply({

            content:

                "Deleting ticket...",

            ephemeral:true

        });

        await interaction.channel?.delete();

    }

    /* --------------------------------------------------------
     * Claim
     * -------------------------------------------------------- */

    private async commandClaim(

        interaction:ChatInputCommandInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.claimedBy=

            interaction.user.id;

        this.ticketManager.emit(

            "ticketClaim",

            ticket

        );

        return this.success(

            interaction,

            "You claimed this ticket."

        );

    }

    /* --------------------------------------------------------
     * Unclaim
     * -------------------------------------------------------- */

    private async commandUnclaim(

        interaction:ChatInputCommandInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.claimedBy=undefined;

        this.ticketManager.emit(

            "ticketUnclaim",

            ticket

        );

        return this.success(

            interaction,

            "Ticket unclaimed."

        );

    }
      /* --------------------------------------------------------
     * Rename
     * -------------------------------------------------------- */

    private async commandRename(

        interaction:ChatInputCommandInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        const name=

            interaction.options.getString(

                "name",

                true

            );

        await interaction.channel?.setName(

            name

        );

        this.ticketManager.emit(

            "ticketRename",

            ticket,

            name

        );

        return this.success(

            interaction,

            `Renamed ticket to **${name}**.`

        );

    }

    /* --------------------------------------------------------
     * Move
     * -------------------------------------------------------- */

    private async commandMove(

        interaction:ChatInputCommandInteraction

    ){

        const category=

            interaction.options.getChannel(

                "category",

                true

            );

        if(

            category.type!==

            4

        ){

            return this.error(

                interaction,

                "Please choose a category."

            );

        }

        await interaction.channel?.setParent(

            category.id

        );

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(ticket){

            ticket.categoryId=

                category.id;

        }

        this.ticketManager.emit(

            "ticketMove",

            ticket

        );

        return this.success(

            interaction,

            "Ticket moved."

        );

    }

    /* --------------------------------------------------------
     * Priority
     * -------------------------------------------------------- */

    private async commandPriority(

        interaction:ChatInputCommandInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        const priority=

            interaction.options.getString(

                "priority",

                true

            ) as
            "LOW"|
            "NORMAL"|
            "HIGH"|
            "URGENT";

        ticket.priority=

            priority;

        this.ticketManager.emit(

            "ticketPriority",

            ticket

        );

        return this.success(

            interaction,

            `Priority changed to **${priority}**.`

        );

    }

    /* --------------------------------------------------------
     * Add User
     * -------------------------------------------------------- */

    private async commandAdd(

        interaction:ChatInputCommandInteraction

    ){

        const user=

            interaction.options.getUser(

                "user",

                true

            );

        await interaction.channel?.permissionOverwrites.create(

            user.id,

            {

                ViewChannel:true,

                SendMessages:true,

                ReadMessageHistory:true

            }

        );

        return this.success(

            interaction,

            `${user.tag} added to the ticket.`

        );

    }

    /* --------------------------------------------------------
     * Remove User
     * -------------------------------------------------------- */

    private async commandRemove(

        interaction:ChatInputCommandInteraction

    ){

        const user=

            interaction.options.getUser(

                "user",

                true

            );

        await interaction.channel?.permissionOverwrites.delete(

            user.id

        );

        return this.success(

            interaction,

            `${user.tag} removed from the ticket.`

        );

    }

    /* --------------------------------------------------------
     * Transcript
     * -------------------------------------------------------- */

    private async commandTranscript(

        interaction:ChatInputCommandInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        const transcript=

            this.transcriptManager.createTranscript(

                ticket.guildId,

                ticket.channelId,

                ticket.id,

                ticket.creatorId

            );

        await this.transcriptManager.collectMessages(

            transcript.id

        );

        const file=

            this.transcriptManager.saveHTML(

                transcript.id

            );

        return interaction.reply({

            content:

                `Transcript created.\n${file}`,

            ephemeral:true

        });

    }

    /* --------------------------------------------------------
     * Panel
     * -------------------------------------------------------- */

    private async commandPanel(

        interaction:ChatInputCommandInteraction

    ){

        return this.success(

            interaction,

            "Panel management will be implemented in PanelManager."

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    private async commandStats(

        interaction:ChatInputCommandInteraction

    ){

        const stats={

            interactions:

                this.statistics,

            tickets:

                this.ticketManager.getTickets().length,

            panels:

                this.panelManager.getPanels().length,

            transcripts:

                this.transcriptManager.getTranscripts().length

        };

        return interaction.reply({

            embeds:[

                new EmbedBuilder()

                .setTitle(

                    "Bot Statistics"

                )

                .setColor(

                    0x5865F2

                )

                .setDescription(

                    "Current runtime statistics."

                )

                .addFields(

                    {

                        name:"Interactions",

                        value:String(

                            stats.interactions.total

                        ),

                        inline:true

                    },

                    {

                        name:"Tickets",

                        value:String(

                            stats.tickets

                        ),

                        inline:true

                    },

                    {

                        name:"Panels",

                        value:String(

                            stats.panels

                        ),

                        inline:true

                    },

                    {

                        name:"Transcripts",

                        value:String(

                            stats.transcripts

                        ),

                        inline:true

                    }

                )

            ],

            ephemeral:true

        });

    }
      /* --------------------------------------------------------
     * Button Interactions
     * -------------------------------------------------------- */

    private async handleButton(

        interaction:ButtonInteraction

    ){

        const id=

            interaction.customId;

        switch(id){

            case "ticket:create":

                return this.buttonCreateTicket(

                    interaction

                );

            case "ticket:close":

                return this.buttonClose(

                    interaction

                );

            case "ticket:reopen":

                return this.buttonReopen(

                    interaction

                );

            case "ticket:delete":

                return this.buttonDelete(

                    interaction

                );

            case "ticket:claim":

                return this.buttonClaim(

                    interaction

                );

            case "ticket:unclaim":

                return this.buttonUnclaim(

                    interaction

                );

            case "ticket:pin":

                return this.buttonPin(

                    interaction

                );

            case "ticket:unpin":

                return this.buttonUnpin(

                    interaction

                );

            default:

                return interaction.reply({

                    content:

                        "Unknown button.",

                    ephemeral:true

                });

        }

    }

    /* --------------------------------------------------------
     * Create Ticket Button
     * -------------------------------------------------------- */

    private async buttonCreateTicket(

        interaction:ButtonInteraction

    ){

        return interaction.reply({

            content:

                "Ticket creation is handled by the PanelManager.",

            ephemeral:true

        });

    }

    /* --------------------------------------------------------
     * Close Button
     * -------------------------------------------------------- */

    private async buttonClose(

        interaction:ButtonInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.status="CLOSED";

        ticket.closed=Date.now();

        this.ticketManager.emit(

            "ticketClose",

            ticket

        );

        return this.success(

            interaction,

            "Ticket closed."

        );

    }

    /* --------------------------------------------------------
     * Reopen Button
     * -------------------------------------------------------- */

    private async buttonReopen(

        interaction:ButtonInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.status="OPEN";

        ticket.closed=undefined;

        this.ticketManager.emit(

            "ticketReopen",

            ticket

        );

        return this.success(

            interaction,

            "Ticket reopened."

        );

    }

    /* --------------------------------------------------------
     * Delete Button
     * -------------------------------------------------------- */

    private async buttonDelete(

        interaction:ButtonInteraction

    ){

        await interaction.reply({

            content:

                "Deleting ticket...",

            ephemeral:true

        });

        await interaction.channel?.delete();

    }

    /* --------------------------------------------------------
     * Claim Button
     * -------------------------------------------------------- */

    private async buttonClaim(

        interaction:ButtonInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.claimedBy=

            interaction.user.id;

        this.ticketManager.emit(

            "ticketClaim",

            ticket

        );

        return this.success(

            interaction,

            "Ticket claimed."

        );

    }

    /* --------------------------------------------------------
     * Unclaim Button
     * -------------------------------------------------------- */

    private async buttonUnclaim(

        interaction:ButtonInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.claimedBy=undefined;

        this.ticketManager.emit(

            "ticketUnclaim",

            ticket

        );

        return this.success(

            interaction,

            "Ticket unclaimed."

        );

    }

    /* --------------------------------------------------------
     * Pin Button
     * -------------------------------------------------------- */

    private async buttonPin(

        interaction:ButtonInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.pinned=true;

        this.ticketManager.emit(

            "ticketPin",

            ticket

        );

        return this.success(

            interaction,

            "Ticket pinned."

        );

    }

    /* --------------------------------------------------------
     * Unpin Button
     * -------------------------------------------------------- */

    private async buttonUnpin(

        interaction:ButtonInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.pinned=false;

        this.ticketManager.emit(

            "ticketUnpin",

            ticket

        );

        return this.success(

            interaction,

            "Ticket unpinned."

        );

    }
      /* --------------------------------------------------------
     * Select Menu Interactions
     * -------------------------------------------------------- */

    private async handleSelect(

        interaction:StringSelectMenuInteraction

    ){

        switch(

            interaction.customId

        ){

            case "ticket:priority":

                return this.selectPriority(

                    interaction

                );

            case "ticket:category":

                return this.selectCategory(

                    interaction

                );

            case "ticket:panel":

                return this.selectPanel(

                    interaction

                );

            case "ticket:reason":

                return this.selectReason(

                    interaction

                );

            default:

                return interaction.reply({

                    content:

                        "Unknown select menu.",

                    ephemeral:true

                });

        }

    }

    /* --------------------------------------------------------
     * Priority Select
     * -------------------------------------------------------- */

    private async selectPriority(

        interaction:StringSelectMenuInteraction

    ){

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(!ticket){

            return this.error(

                interaction,

                "Ticket not found."

            );

        }

        ticket.priority=

            interaction.values[0] as any;

        this.ticketManager.emit(

            "ticketPriority",

            ticket

        );

        return this.success(

            interaction,

            `Priority updated to **${interaction.values[0]}**.`

        );

    }

    /* --------------------------------------------------------
     * Category Select
     * -------------------------------------------------------- */

    private async selectCategory(

        interaction:StringSelectMenuInteraction

    ){

        const category=

            interaction.values[0];

        await interaction.channel?.setParent(

            category

        );

        const ticket=

            this.ticketManager.getTicketByChannel(

                interaction.channelId

            );

        if(ticket){

            ticket.categoryId=

                category;

        }

        this.ticketManager.emit(

            "ticketMove",

            ticket

        );

        return this.success(

            interaction,

            "Category updated."

        );

    }

    /* --------------------------------------------------------
     * Panel Select
     * -------------------------------------------------------- */

    private async selectPanel(

        interaction:StringSelectMenuInteraction

    ){

        const panel=

            this.panelManager.getPanel(

                interaction.values[0]

            );

        if(!panel){

            return this.error(

                interaction,

                "Panel not found."

            );

        }

        return this.success(

            interaction,

            `Selected panel **${panel.name}**.`

        );

    }

    /* --------------------------------------------------------
     * Reason Select
     * -------------------------------------------------------- */

    private async selectReason(

        interaction:StringSelectMenuInteraction

    ){

        return interaction.reply({

            content:

                `Reason selected: ${interaction.values[0]}`,

            ephemeral:true

        });

    }

    /* --------------------------------------------------------
     * Modal Router
     * -------------------------------------------------------- */

    private async handleModal(

        interaction:ModalSubmitInteraction

    ){

        switch(

            interaction.customId

        ){

            case "ticket:create":

                return this.modalCreateTicket(

                    interaction

                );

            case "ticket:rename":

                return this.modalRename(

                    interaction

                );

            case "ticket:close":

                return this.modalClose(

                    interaction

                );

            default:

                return interaction.reply({

                    content:

                        "Unknown modal.",

                    ephemeral:true

                });

        }

    }

    /* --------------------------------------------------------
     * Create Ticket Modal
     * -------------------------------------------------------- */

    private async modalCreateTicket(

        interaction:ModalSubmitInteraction

    ){

        const subject=

            interaction.fields.getTextInputValue(

                "subject"

            );

        const description=

            interaction.fields.getTextInputValue(

                "description"

            );

        this.emit(

            "ticketModal",

            {

                subject,

                description,

                user:

                    interaction.user.id

            }

        );

        return this.success(

            interaction,

            "Ticket request submitted."

        );

    }

    /* --------------------------------------------------------
     * Rename Modal
     * -------------------------------------------------------- */

    private async modalRename(

        interaction:ModalSubmitInteraction

    ){

        const name=

            interaction.fields.getTextInputValue(

                "name"

            );

        await interaction.channel?.setName(

            name

        );

        return this.success(

            interaction,

            "Ticket renamed."

        );

    }

    /* --------------------------------------------------------
     * Close Modal
     * -------------------------------------------------------- */

    private async modalClose(

        interaction:ModalSubmitInteraction

    ){

        const reason=

            interaction.fields.getTextInputValue(

                "reason"

            );

        this.emit(

            "ticketCloseReason",

            reason

        );

        return this.success(

            interaction,

            "Ticket closed."

        );

    }
      /* --------------------------------------------------------
     * Autocomplete
     * -------------------------------------------------------- */

    private async handleAutocomplete(

        interaction:AutocompleteInteraction

    ){

        const focused=

            interaction.options.getFocused(

                true

            );

        switch(

            interaction.commandName

        ){

            case "rename":

                return interaction.respond([

                    {

                        name:"support",

                        value:"support"

                    },

                    {

                        name:"billing",

                        value:"billing"

                    },

                    {

                        name:"report",

                        value:"report"

                    }

                ]);

            case "priority":

                return interaction.respond([

                    {

                        name:"LOW",

                        value:"LOW"

                    },

                    {

                        name:"NORMAL",

                        value:"NORMAL"

                    },

                    {

                        name:"HIGH",

                        value:"HIGH"

                    },

                    {

                        name:"URGENT",

                        value:"URGENT"

                    }

                ]);

            case "panel":{

                const panels=

                    this.panelManager

                        .getPanels()

                        .filter(panel=>

                            panel.name

                            .toLowerCase()

                            .includes(

                                focused.value

                                .toLowerCase()

                            )

                        )

                        .slice(0,25);

                return interaction.respond(

                    panels.map(panel=>({

                        name:

                            panel.name,

                        value:

                            panel.id

                    }))

                );

            }

            default:

                return interaction.respond([]);

        }

    }

    /* --------------------------------------------------------
     * Context Menu Router
     * -------------------------------------------------------- */

    private async handleContext(

        interaction:ContextMenuCommandInteraction

    ){

        if(

            interaction.isUserContextMenuCommand()

        ){

            return this.handleUserContext(

                interaction

            );

        }

        if(

            interaction.isMessageContextMenuCommand()

        ){

            return this.handleMessageContext(

                interaction

            );

        }

    }

    /* --------------------------------------------------------
     * User Context
     * -------------------------------------------------------- */

    private async handleUserContext(

        interaction:UserContextMenuCommandInteraction

    ){

        switch(

            interaction.commandName

        ){

            case "Add To Ticket":

                await interaction.channel?.permissionOverwrites.create(

                    interaction.targetUser.id,

                    {

                        ViewChannel:true,

                        SendMessages:true,

                        ReadMessageHistory:true

                    }

                );

                return this.success(

                    interaction,

                    `${interaction.targetUser.tag} added.`

                );

            case "User Info":

                return interaction.reply({

                    embeds:[

                        new EmbedBuilder()

                            .setTitle(

                                interaction.targetUser.tag

                            )

                            .setThumbnail(

                                interaction.targetUser.displayAvatarURL()

                            )

                            .addFields(

                                {

                                    name:"ID",

                                    value:interaction.targetUser.id,

                                    inline:true

                                },

                                {

                                    name:"Bot",

                                    value:String(

                                        interaction.targetUser.bot

                                    ),

                                    inline:true

                                }

                            )

                    ],

                    ephemeral:true

                });

            default:

                return this.error(

                    interaction,

                    "Unknown user context command."

                );

        }

    }

    /* --------------------------------------------------------
     * Message Context
     * -------------------------------------------------------- */

    private async handleMessageContext(

        interaction:MessageContextMenuCommandInteraction

    ){

        switch(

            interaction.commandName

        ){

            case "Quote Message":

                return interaction.reply({

                    embeds:[

                        new EmbedBuilder()

                            .setColor(

                                0x5865F2

                            )

                            .setAuthor({

                                name:

                                    interaction.targetMessage.author.tag,

                                iconURL:

                                    interaction.targetMessage.author.displayAvatarURL()

                            })

                            .setDescription(

                                interaction.targetMessage.content ||

                                "*No text content.*"

                            )

                    ],

                    ephemeral:true

                });

            case "Pin Message":

                await interaction.targetMessage.pin();

                return this.success(

                    interaction,

                    "Message pinned."

                );

            default:

                return this.error(

                    interaction,

                    "Unknown message context command."

                );

        }

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            ...this.statistics

        };

    }

    public resetStatistics(){

        this.statistics={

            total:0,

            slashCommands:0,

            buttons:0,

            selectMenus:0,

            modals:0,

            autocomplete:0,

            contextMenus:0,

            errors:0

        };

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
