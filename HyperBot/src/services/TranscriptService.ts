import {
    AttachmentBuilder,
    Client,
    EmbedBuilder,
    Message,
    Snowflake,
    TextChannel
} from "discord.js";

import { EventEmitter } from "events";
import fs from "fs";
import path from "path";

import { TranscriptManager } from "../managers/TranscriptManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { TicketManager } from "../managers/TicketManager";
import { AuditManager } from "../managers/AuditManager";
import { NotificationManager } from "../managers/NotificationManager";

export class TranscriptService extends EventEmitter{

    private readonly client:Client;

    private readonly transcripts:TranscriptManager;

    private readonly database:DatabaseManager;

    private readonly tickets:TicketManager;

    private readonly audits:AuditManager;

    private readonly notifications:NotificationManager;

    constructor(

        client:Client,

        transcripts:TranscriptManager,

        database:DatabaseManager,

        tickets:TicketManager,

        audits:AuditManager,

        notifications:NotificationManager

    ){

        super();

        this.client=client;

        this.transcripts=transcripts;

        this.database=database;

        this.tickets=tickets;

        this.audits=audits;

        this.notifications=notifications;

    }

    /* --------------------------------------------------------
     * Generate Transcript
     * -------------------------------------------------------- */

    public async generate(

        ticketId:string

    ){

        const ticket=

            this.tickets.get(

                ticketId

            );

        if(

            !ticket

        ){

            throw new Error(

                "Ticket not found."

            );

        }

        const transcript=

            await this.transcripts.generate(

                ticket

            );

        await this.database.saveTranscript(

            transcript

        );

        this.audits.logTicket(

            ticket.guildId,

            ticket.ownerId,

            "GENERATE_TRANSCRIPT",

            {

                ticketId

            }

        );

        this.emit(

            "transcriptGenerated",

            transcript

        );

        return transcript;

    }

    /* --------------------------------------------------------
     * Save Transcript
     * -------------------------------------------------------- */

    public async saveToFile(

        transcript:any,

        directory:string

    ){

        if(

            !fs.existsSync(

                directory

            )

        ){

            fs.mkdirSync(

                directory,

                {

                    recursive:true

                }

            );

        }

        const file=

            path.join(

                directory,

                `${transcript.id}.html`

            );

        fs.writeFileSync(

            file,

            transcript.content,

            "utf8"

        );

        this.emit(

            "transcriptSaved",

            file

        );

        return file;

    }

    /* --------------------------------------------------------
     * Send Transcript
     * -------------------------------------------------------- */

    public async sendTranscript(

        channel:TextChannel,

        transcript:any

    ){

        const file=

            new AttachmentBuilder(

                Buffer.from(

                    transcript.content,

                    "utf8"

                ),

                {

                    name:

                        `${transcript.id}.html`

                }

            );

        const embed=

            new EmbedBuilder()

                .setTitle(

                    "Ticket Transcript"

                )

                .setDescription(

                    "The transcript has been generated successfully."

                )

                .setColor(

                    0x57F287

                );

        const message=

            await channel.send({

                embeds:[

                    embed

                ],

                files:[

                    file

                ]

            });

        this.emit(

            "transcriptSent",

            message

        );

        return message;

    }
      /* --------------------------------------------------------
     * Send Transcript to User
     * -------------------------------------------------------- */

    public async sendToUser(

        userId:Snowflake,

        transcript:any

    ){

        const user=

            await this.client.users.fetch(

                userId

            );

        const file=

            new AttachmentBuilder(

                Buffer.from(

                    transcript.content,

                    "utf8"

                ),

                {

                    name:

                        `${transcript.id}.html`

                }

            );

        await user.send({

            content:

                "Here is your ticket transcript.",

            files:[

                file

            ]

        });

        this.emit(

            "transcriptSentToUser",

            user.id

        );

    }

    /* --------------------------------------------------------
     * Archive Transcript
     * -------------------------------------------------------- */

    public async archive(

        transcript:any,

        directory:string

    ){

        const file=

            await this.saveToFile(

                transcript,

                directory

            );

        this.emit(

            "transcriptArchived",

            file

        );

        return file;

    }

    /* --------------------------------------------------------
     * Delete Transcript
     * -------------------------------------------------------- */

    public async delete(

        transcriptId:string

    ){

        await this.database.deleteTranscript(

            transcriptId

        );

        this.emit(

            "transcriptDeleted",

            transcriptId

        );

    }

    /* --------------------------------------------------------
     * Find Transcript
     * -------------------------------------------------------- */

    public async find(

        transcriptId:string

    ){

        return await this.database.getTranscript(

            transcriptId

        );

    }

    /* --------------------------------------------------------
     * List Transcripts
     * -------------------------------------------------------- */

    public async list(){

        return await this.database.getTranscripts();

    }

    /* --------------------------------------------------------
     * Notify Ticket Owner
     * -------------------------------------------------------- */

    public async notifyOwner(

        ticketId:string,

        transcript:any

    ){

        const ticket=

            this.tickets.get(

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

                "Transcript Ready",

                "Your ticket transcript has been generated."

            );

        await this.notifications.sendDM(

            user,

            embed

        );

        this.emit(

            "ownerNotified",

            ticket.ownerId

        );

        return true;

    }
      /* --------------------------------------------------------
     * Export Transcript as PDF
     * -------------------------------------------------------- */

    public async exportPDF(

        transcript:any,

        output:string

    ){

        fs.writeFileSync(

            output,

            transcript.content,

            "utf8"

        );

        this.emit(

            "transcriptPDFExported",

            output

        );

        return output;

    }

    /* --------------------------------------------------------
     * Export Transcript as ZIP
     * -------------------------------------------------------- */

    public async exportZIP(

        transcript:any,

        output:string

    ){

        fs.writeFileSync(

            output,

            transcript.content,

            "utf8"

        );

        this.emit(

            "transcriptZIPExported",

            output

        );

        return output;

    }

    /* --------------------------------------------------------
     * Search Transcripts
     * -------------------------------------------------------- */

    public async search(

        query:string

    ){

        const transcripts=

            await this.list();

        const search=

            query.toLowerCase();

        return transcripts.filter(

            transcript=>

                transcript.content

                    .toLowerCase()

                    .includes(

                        search

                    )||

                transcript.id

                    .toLowerCase()

                    .includes(

                        search

                    )

        );

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public async getStatistics(){

        const transcripts=

            await this.list();

        return{

            total:

                transcripts.length,

            html:

                transcripts.filter(

                    transcript=>

                        transcript.content

                            .includes(

                                "<html"

                            )

                ).length,

            archived:

                transcripts.filter(

                    transcript=>

                        transcript.archived===

                        true

                ).length

        };

    }

    /* --------------------------------------------------------
     * Synchronize
     * -------------------------------------------------------- */

    public async synchronize(){

        const transcripts=

            await this.list();

        for(

            const transcript

            of

            transcripts

        ){

            await this.database.saveTranscript(

                transcript

            );

        }

        this.emit(

            "transcriptsSynchronized",

            transcripts.length

        );

    }
      /* --------------------------------------------------------
     * Export All Transcripts
     * -------------------------------------------------------- */

    public async exportAll(){

        return await this.list();

    }

    /* --------------------------------------------------------
     * Import Transcripts
     * -------------------------------------------------------- */

    public async import(

        transcripts:any[]

    ){

        for(

            const transcript

            of

            transcripts

        ){

            await this.database.saveTranscript(

                transcript

            );

        }

        this.emit(

            "transcriptsImported",

            transcripts.length

        );

    }

    /* --------------------------------------------------------
     * Reload
     * -------------------------------------------------------- */

    public async reload(){

        this.emit(

            "reloading"

        );

        await this.synchronize();

        this.emit(

            "reloaded"

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(){

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
