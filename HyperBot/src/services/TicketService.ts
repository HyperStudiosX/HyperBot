import {
    ButtonInteraction,
    ChatInputCommandInteraction,
    Client,
    Guild,
    GuildMember,
    Snowflake,
    TextChannel,
    User
} from "discord.js";

import { EventEmitter } from "events";

import { TicketManager } from "../managers/TicketManager";
import { PanelManager } from "../managers/PanelManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { TranscriptManager } from "../managers/TranscriptManager";
import { NotificationManager } from "../managers/NotificationManager";
import { AuditManager } from "../managers/AuditManager";
import { PermissionManager } from "../managers/PermissionManager";
import { CacheManager } from "../managers/CacheManager";

export class TicketService extends EventEmitter{

    private readonly client:Client;

    private readonly ticketManager:TicketManager;

    private readonly panelManager:PanelManager;

    private readonly database:DatabaseManager;

    private readonly transcripts:TranscriptManager;

    private readonly notifications:NotificationManager;

    private readonly audits:AuditManager;

    private readonly permissions:PermissionManager;

    private readonly cache:CacheManager;

    constructor(

        client:Client,

        ticketManager:TicketManager,

        panelManager:PanelManager,

        database:DatabaseManager,

        transcripts:TranscriptManager,

        notifications:NotificationManager,

        audits:AuditManager,

        permissions:PermissionManager,

        cache:CacheManager

    ){

        super();

        this.client=client;

        this.ticketManager=ticketManager;

        this.panelManager=panelManager;

        this.database=database;

        this.transcripts=transcripts;

        this.notifications=notifications;

        this.audits=audits;

        this.permissions=permissions;

        this.cache=cache;

    }

    /* --------------------------------------------------------
     * Initialize
     * -------------------------------------------------------- */

    public async initialize(){

        await this.restoreTickets();

        this.emit(

            "initialized"

        );

    }

    /* --------------------------------------------------------
     * Restore Tickets
     * -------------------------------------------------------- */

    private async restoreTickets(){

        const tickets=

            await this.database.getTickets();

        for(

            const ticket

            of

            tickets

        ){

            this.ticketManager.register(

                ticket

            );

        }

        this.emit(

            "ticketsRestored",

            tickets.length

        );

    }

    /* --------------------------------------------------------
     * Create Ticket
     * -------------------------------------------------------- */

    public async createTicket(

        member:GuildMember,

        panelId:string

    ){

        const panel=

            this.panelManager.get(

                panelId

            );

        if(

            !panel

        ){

            throw new Error(

                "Panel not found."

            );

        }

        const ticket=

            await this.ticketManager.create(

                member,

                panel

            );

        await this.database.saveTicket(

            ticket

        );

        this.cache.set(

            ticket.id,

            ticket

        );

        this.audits.logTicket(

            member.guild.id,

            member.id,

            "CREATE_TICKET",

            {

                ticketId:

                    ticket.id

            }

        );

        this.emit(

            "ticketCreated",

            ticket

        );

        return ticket;

    }

    /* --------------------------------------------------------
     * Open Ticket
     * -------------------------------------------------------- */

    public async openTicket(

        ticketId:string

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return null;

        }

        ticket.closed=false;

        await this.database.updateTicket(

            ticket

        );

        this.emit(

            "ticketOpened",

            ticket

        );

        return ticket;

    }
      /* --------------------------------------------------------
     * Close Ticket
     * -------------------------------------------------------- */

    public async closeTicket(

        ticketId:string,

        closedBy:User,

        reason:string="No reason provided."

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return null;

        }

        ticket.closed=true;

        ticket.closedBy=

            closedBy.id;

        ticket.closedAt=

            Date.now();

        ticket.closeReason=

            reason;

        await this.database.updateTicket(

            ticket

        );

        this.audits.logTicket(

            ticket.guildId,

            closedBy.id,

            "CLOSE_TICKET",

            {

                ticketId,

                reason

            }

        );

        this.emit(

            "ticketClosed",

            ticket

        );

        return ticket;

    }

    /* --------------------------------------------------------
     * Delete Ticket
     * -------------------------------------------------------- */

    public async deleteTicket(

        ticketId:string,

        executor:User

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return false;

        }

        await this.database.deleteTicket(

            ticketId

        );

        this.cache.delete(

            ticketId

        );

        this.ticketManager.delete(

            ticketId

        );

        this.audits.logTicket(

            ticket.guildId,

            executor.id,

            "DELETE_TICKET",

            {

                ticketId

            }

        );

        this.emit(

            "ticketDeleted",

            ticketId

        );

        return true;

    }

    /* --------------------------------------------------------
     * Claim Ticket
     * -------------------------------------------------------- */

    public async claimTicket(

        ticketId:string,

        member:GuildMember

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return null;

        }

        ticket.claimedBy=

            member.id;

        ticket.claimedAt=

            Date.now();

        await this.database.updateTicket(

            ticket

        );

        this.audits.logTicket(

            member.guild.id,

            member.id,

            "CLAIM_TICKET",

            {

                ticketId

            }

        );

        this.emit(

            "ticketClaimed",

            ticket

        );

        return ticket;

    }

    /* --------------------------------------------------------
     * Unclaim Ticket
     * -------------------------------------------------------- */

    public async unclaimTicket(

        ticketId:string,

        member:GuildMember

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return null;

        }

        ticket.claimedBy=

            undefined;

        ticket.claimedAt=

            undefined;

        await this.database.updateTicket(

            ticket

        );

        this.audits.logTicket(

            member.guild.id,

            member.id,

            "UNCLAIM_TICKET",

            {

                ticketId

            }

        );

        this.emit(

            "ticketUnclaimed",

            ticket

        );

        return ticket;

    }

    /* --------------------------------------------------------
     * Rename Ticket
     * -------------------------------------------------------- */

    public async renameTicket(

        ticketId:string,

        newName:string

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return null;

        }

        ticket.name=

            newName;

        await this.database.updateTicket(

            ticket

        );

        this.emit(

            "ticketRenamed",

            ticket

        );

        return ticket;

    }
      /* --------------------------------------------------------
     * Add Member
     * -------------------------------------------------------- */

    public async addMember(

        ticketId:string,

        member:GuildMember

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return false;

        }

        if(

            !ticket.members.includes(

                member.id

            )

        ){

            ticket.members.push(

                member.id

            );

        }

        await this.database.updateTicket(

            ticket

        );

        this.audits.logTicket(

            member.guild.id,

            member.id,

            "ADD_MEMBER",

            {

                ticketId,

                target:

                    member.id

            }

        );

        this.emit(

            "memberAdded",

            ticket,

            member

        );

        return true;

    }

    /* --------------------------------------------------------
     * Remove Member
     * -------------------------------------------------------- */

    public async removeMember(

        ticketId:string,

        member:GuildMember

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return false;

        }

        ticket.members=

            ticket.members.filter(

                id=>

                    id!==

                    member.id

            );

        await this.database.updateTicket(

            ticket

        );

        this.audits.logTicket(

            member.guild.id,

            member.id,

            "REMOVE_MEMBER",

            {

                ticketId,

                target:

                    member.id

            }

        );

        this.emit(

            "memberRemoved",

            ticket,

            member

        );

        return true;

    }

    /* --------------------------------------------------------
     * Lock Ticket
     * -------------------------------------------------------- */

    public async lockTicket(

        ticketId:string,

        executor:GuildMember

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return false;

        }

        ticket.locked=true;

        await this.database.updateTicket(

            ticket

        );

        this.audits.logTicket(

            executor.guild.id,

            executor.id,

            "LOCK_TICKET",

            {

                ticketId

            }

        );

        this.emit(

            "ticketLocked",

            ticket

        );

        return true;

    }

    /* --------------------------------------------------------
     * Unlock Ticket
     * -------------------------------------------------------- */

    public async unlockTicket(

        ticketId:string,

        executor:GuildMember

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return false;

        }

        ticket.locked=false;

        await this.database.updateTicket(

            ticket

        );

        this.audits.logTicket(

            executor.guild.id,

            executor.id,

            "UNLOCK_TICKET",

            {

                ticketId

            }

        );

        this.emit(

            "ticketUnlocked",

            ticket

        );

        return true;

    }

    /* --------------------------------------------------------
     * Generate Transcript
     * -------------------------------------------------------- */

    public async generateTranscript(

        ticketId:string

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return null;

        }

        const transcript=

            await this.transcripts.generate(

                ticket

            );

        this.emit(

            "transcriptGenerated",

            transcript

        );

        return transcript;

    }

    /* --------------------------------------------------------
     * Notify Ticket Owner
     * -------------------------------------------------------- */

    public async notifyOwner(

        ticketId:string,

        title:string,

        message:string

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return false;

        }

        const user=

            await this.client.users.fetch(

                ticket.ownerId

            );

        const embed=

            this.notifications.buildEmbed(

                title,

                message

            );

        await this.notifications.sendDM(

            user,

            embed

        );

        this.emit(

            "ownerNotified",

            ticket

        );

        return true;

    }
      /* --------------------------------------------------------
     * Transfer Ticket
     * -------------------------------------------------------- */

    public async transferTicket(

        ticketId:string,

        categoryId:Snowflake,

        executor:GuildMember

    ){

        const ticket=

            this.ticketManager.get(

                ticketId

            );

        if(

            !ticket

        ){

            return false;

        }

        ticket.categoryId=

            categoryId;

        await this.database.updateTicket(

            ticket

        );

        this.audits.logTicket(

            executor.guild.id,

            executor.id,

            "TRANSFER_TICKET",

            {

                ticketId,

                categoryId

            }

        );

        this.emit(

            "ticketTransferred",

            ticket

        );

        return true;

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            total:

                this.ticketManager.getAll().length,

            open:

                this.ticketManager

                    .getAll()

                    .filter(

                        ticket=>

                            !ticket.closed

                    ).length,

            closed:

                this.ticketManager

                    .getAll()

                    .filter(

                        ticket=>

                            ticket.closed

                    ).length,

            claimed:

                this.ticketManager

                    .getAll()

                    .filter(

                        ticket=>

                            ticket.claimedBy

                    ).length

        };

    }

    /* --------------------------------------------------------
     * Synchronize
     * -------------------------------------------------------- */

    public async synchronize(){

        const tickets=

            this.ticketManager.getAll();

        for(

            const ticket

            of

            tickets

        ){

            await this.database.updateTicket(

                ticket

            );

        }

        this.emit(

            "synchronized",

            tickets.length

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
