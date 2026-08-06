import {
    Attachment,
    ChannelType,
    Client,
    Collection,
    Embed,
    GuildTextBasedChannel,
    Message,
    MessageReaction,
    User
} from "discord.js";

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { EventEmitter } from "events";

export interface TranscriptAttachment{

    name:string;

    url:string;

    size:number;

    contentType?:string;

}

export interface TranscriptEmbed{

    title?:string;

    description?:string;

    color?:number;

    author?:string;

    footer?:string;

    fields:{
        name:string;
        value:string;
        inline:boolean;
    }[];

}

export interface TranscriptMessage{

    id:string;

    authorId:string;

    authorTag:string;

    avatar:string;

    content:string;

    created:number;

    edited?:number;

    system:boolean;

    bot:boolean;

    embeds:TranscriptEmbed[];

    attachments:TranscriptAttachment[];

    reactions:{
        emoji:string;
        count:number;
    }[];

}

export interface Transcript{

    id:string;

    channelId:string;

    guildId:string;

    ticketId:string;

    creatorId:string;

    created:number;

    closed:number;

    messages:TranscriptMessage[];

    html?:string;

    file?:string;

}

export class TranscriptManager extends EventEmitter{

    private readonly client:Client;

    private readonly cache=

        new Map<
            string,
            Transcript
        >();

    private statistics={

        generated:0,

        exported:0,

        htmlFiles:0,

        searched:0,

        deleted:0

    };

    constructor(

        client:Client

    ){

        super();

        this.client=client;

    }

    public createTranscript(

        guildId:string,

        channelId:string,

        ticketId:string,

        creatorId:string

    ):Transcript{

        const transcript:Transcript={

            id:

                crypto.randomUUID(),

            guildId,

            channelId,

            ticketId,

            creatorId,

            created:

                Date.now(),

            closed:0,

            messages:[]

        };

        this.cache.set(

            transcript.id,

            transcript

        );

        return transcript;

    }

    public getTranscript(

        id:string

    ){

        return this.cache.get(id);

    }

    public getTranscripts(){

        return Array.from(

            this.cache.values()

        );

    }

    public removeTranscript(

        id:string

    ){

        this.cache.delete(id);

        this.statistics.deleted++;

    }

    public async collectMessages(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)

            return;

        const channel=

            await this.client.channels.fetch(

                transcript.channelId

            ) as GuildTextBasedChannel;

        if(!channel)

            return;

        let before:string|undefined=

            undefined;

        const collected:Message[]=[];

        while(true){

            const batch=

                await channel.messages.fetch({

                    limit:100,

                    before

                });

            if(

                batch.size===0

            )

                break;

            collected.push(

                ...batch.values()

            );

            before=

                batch.last()?.id;

        }

        collected.reverse();

        transcript.messages=[];

        for(

            const message

            of

            collected

        ){

            transcript.messages.push(

                this.convertMessage(

                    message

                )

            );

        }

        transcript.closed=

            Date.now();

        this.statistics.generated++;

        this.emit(

            "transcriptGenerated",

            transcript

        );

    }
      /* --------------------------------------------------------
     * Convert Discord Message
     * -------------------------------------------------------- */

    private convertMessage(

        message: Message

    ): TranscriptMessage {

        const embeds: TranscriptEmbed[] = [];

        for (

            const embed

            of

            message.embeds

        ) {

            embeds.push({

                title:

                    embed.title ?? undefined,

                description:

                    embed.description ?? undefined,

                color:

                    embed.color ?? undefined,

                author:

                    embed.author?.name,

                footer:

                    embed.footer?.text,

                fields:

                    embed.fields.map(

                        field => ({

                            name:

                                field.name,

                            value:

                                field.value,

                            inline:

                                field.inline

                        })

                    )

            });

        }

        const attachments:

            TranscriptAttachment[] = [];

        for (

            const attachment

            of

            message.attachments.values()

        ) {

            attachments.push({

                name:

                    attachment.name ?? "Unknown",

                url:

                    attachment.url,

                size:

                    attachment.size,

                contentType:

                    attachment.contentType ?? undefined

            });

        }

        const reactions =

            [];

        for (

            const reaction

            of

            message.reactions.cache.values()

        ) {

            reactions.push({

                emoji:

                    reaction.emoji.toString(),

                count:

                    reaction.count

            });

        }

        return {

            id:

                message.id,

            authorId:

                message.author.id,

            authorTag:

                message.author.tag,

            avatar:

                message.author.displayAvatarURL(),

            content:

                message.content,

            created:

                message.createdTimestamp,

            edited:

                message.editedTimestamp ?? undefined,

            system:

                message.system,

            bot:

                message.author.bot,

            embeds,

            attachments,

            reactions

        };

    }

    /* --------------------------------------------------------
     * HTML Builder
     * -------------------------------------------------------- */

    public buildHTML(

        transcriptId: string

    ): string {

        const transcript =

            this.cache.get(

                transcriptId

            );

        if (!transcript)

            return "";

        let html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="utf-8">

<title>Transcript</title>

<style>

body{

background:#202225;

font-family:Arial;

color:white;

margin:0;

padding:20px;

}

.message{

margin-bottom:18px;

padding:12px;

background:#2f3136;

border-radius:8px;

}

.author{

font-weight:bold;

font-size:15px;

}

.time{

color:#999;

font-size:11px;

margin-left:8px;

}

.content{

margin-top:6px;

white-space:pre-wrap;

}

.embed{

margin-top:10px;

padding:10px;

border-left:4px solid #5865F2;

background:#36393f;

}

.attachment{

margin-top:6px;

}

</style>

</head>

<body>

<h1>

Ticket Transcript

</h1>

`;

        for (

            const message

            of

            transcript.messages

        ) {

            html += `

<div class="message">

<div>

<img

src="${message.avatar}"

width="40"

height="40"

style="border-radius:50%;vertical-align:middle;">

<span class="author">

${message.authorTag}

</span>

<span class="time">

${new Date(

message.created

).toLocaleString()}

</span>

</div>

<div class="content">

${message.content}

</div>

`;

            for (

                const embed

                of

                message.embeds

            ) {

                html += `

<div class="embed">

<h3>

${embed.title ?? ""}

</h3>

<p>

${embed.description ?? ""}

</p>

</div>

`;

            }

            for (

                const attachment

                of

                message.attachments

            ) {

                html += `

<div class="attachment">

<a href="${attachment.url}">

${attachment.name}

</a>

</div>

`;

            }

            html += `

</div>

`;

        }

        html += `

</body>

</html>

`;

        transcript.html =

            html;

        return html;

    }
      /* --------------------------------------------------------
     * Save Transcript
     * -------------------------------------------------------- */

    public saveHTML(

        transcriptId:string

    ):string|null{

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return null;

        if(!transcript.html){

            this.buildHTML(
                transcriptId
            );

        }

        const folder=

            path.join(

                process.cwd(),

                "transcripts"

            );

        if(

            !fs.existsSync(folder)

        ){

            fs.mkdirSync(

                folder,

                {

                    recursive:true

                }

            );

        }

        const filename=

            `${transcript.ticketId}-${Date.now()}.html`;

        const file=

            path.join(

                folder,

                filename

            );

        fs.writeFileSync(

            file,

            transcript.html!,

            "utf8"

        );

        transcript.file=file;

        this.statistics.exported++;

        this.statistics.htmlFiles++;

        this.emit(

            "transcriptSaved",

            transcript

        );

        return file;

    }

    /* --------------------------------------------------------
     * Search
     * -------------------------------------------------------- */

    public search(

        query:string

    ):TranscriptMessage[]{

        this.statistics.searched++;

        const results:

            TranscriptMessage[]=[];

        const keyword=

            query.toLowerCase();

        for(

            const transcript

            of

            this.cache.values()

        ){

            for(

                const message

                of

                transcript.messages

            ){

                if(

                    message.content

                    .toLowerCase()

                    .includes(keyword)

                ){

                    results.push(

                        message

                    );

                }

            }

        }

        return results;

    }

    public searchByAuthor(

        authorId:string

    ){

        const results:

            TranscriptMessage[]=[];

        for(

            const transcript

            of

            this.cache.values()

        ){

            for(

                const message

                of

                transcript.messages

            ){

                if(

                    message.authorId===

                    authorId

                ){

                    results.push(

                        message

                    );

                }

            }

        }

        return results;

    }

    /* --------------------------------------------------------
     * Statistics
     * -------------------------------------------------------- */

    public getStatistics(){

        return{

            ...this.statistics,

            cached:

                this.cache.size,

            totalMessages:

                Array.from(

                    this.cache.values()

                ).reduce(

                    (

                        total,

                        transcript

                    )=>

                        total+

                        transcript.messages.length,

                    0

                )

        };

    }

    /* --------------------------------------------------------
     * Index
     * -------------------------------------------------------- */

    private readonly index=

        new Map<

            string,

            string[]

        >();

    public indexTranscript(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return;

        const words:

            string[]=[];

        for(

            const message

            of

            transcript.messages

        ){

            words.push(

                ...message.content

                .toLowerCase()

                .split(/\s+/)

            );

        }

        this.index.set(

            transcript.id,

            words

        );

    }

    public searchIndexed(

        word:string

    ){

        const result:

            string[]=[];

        for(

            const [

                id,

                words

            ]

            of

            this.index

        ){

            if(

                words.includes(

                    word.toLowerCase()

                )

            ){

                result.push(id);

            }

        }

        return result;

    }

    /* --------------------------------------------------------
     * Archive
     * -------------------------------------------------------- */

    public archive(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return false;

        transcript.closed=

            Date.now();

        this.emit(

            "transcriptArchived",

            transcript

        );

        return true;

    }

    public unarchive(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return false;

        transcript.closed=0;

        this.emit(

            "transcriptRestored",

            transcript

        );

        return true;

    }
      /* --------------------------------------------------------
     * Attachment Downloader
     * -------------------------------------------------------- */

    public async downloadAttachments(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return;

        const folder=

            path.join(

                process.cwd(),

                "transcripts",

                transcript.id,

                "attachments"

            );

        if(

            !fs.existsSync(folder)

        ){

            fs.mkdirSync(

                folder,

                {

                    recursive:true

                }

            );

        }

        for(

            const message

            of

            transcript.messages

        ){

            for(

                const attachment

                of

                message.attachments

            ){

                this.emit(

                    "attachmentQueued",

                    attachment

                );

            }

        }

    }

    /* --------------------------------------------------------
     * JSON Export
     * -------------------------------------------------------- */

    public exportJSON(

        transcriptId:string

    ):string|null{

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return null;

        const folder=

            path.join(

                process.cwd(),

                "transcripts"

            );

        if(

            !fs.existsSync(folder)

        ){

            fs.mkdirSync(

                folder,

                {

                    recursive:true

                }

            );

        }

        const filename=

            `${transcript.ticketId}.json`;

        const file=

            path.join(

                folder,

                filename

            );

        fs.writeFileSync(

            file,

            JSON.stringify(

                transcript,

                null,

                4

            )

        );

        this.statistics.exported++;

        this.emit(

            "jsonExport",

            transcript

        );

        return file;

    }

    /* --------------------------------------------------------
     * JSON Import
     * -------------------------------------------------------- */

    public importJSON(

        file:string

    ):Transcript{

        const transcript=

            JSON.parse(

                fs.readFileSync(

                    file,

                    "utf8"

                )

            ) as Transcript;

        this.cache.set(

            transcript.id,

            transcript

        );

        this.emit(

            "jsonImport",

            transcript

        );

        return transcript;

    }

    /* --------------------------------------------------------
     * Filters
     * -------------------------------------------------------- */

    public filterBots(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return [];

        return transcript.messages.filter(

            message=>

                message.bot

        );

    }

    public filterUsers(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return [];

        return transcript.messages.filter(

            message=>

                !message.bot

        );

    }

    public filterAttachments(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return [];

        return transcript.messages.filter(

            message=>

                message.attachments.length>0

        );

    }

    public filterEmbeds(

        transcriptId:string

    ){

        const transcript=

            this.cache.get(

                transcriptId

            );

        if(!transcript)
            return [];

        return transcript.messages.filter(

            message=>

                message.embeds.length>0

        );

    }

    /* --------------------------------------------------------
     * Cleanup
     * -------------------------------------------------------- */

    public cleanup(

        days:number

    ){

        const limit=

            Date.now()-

            days*

            24*

            60*

            60*

            1000;

        for(

            const [

                id,

                transcript

            ]

            of

            this.cache

        ){

            if(

                transcript.closed<

                limit

            ){

                this.cache.delete(

                    id

                );

            }

        }

    }

    /* --------------------------------------------------------
     * Dashboard Summary
     * -------------------------------------------------------- */

    public dashboardSummary(){

        return{

            transcripts:

                this.cache.size,

            exported:

                this.statistics.exported,

            generated:

                this.statistics.generated,

            searched:

                this.statistics.searched,

            deleted:

                this.statistics.deleted,

            html:

                this.statistics.htmlFiles

        };

    }

    /* --------------------------------------------------------
     * Shutdown
     * -------------------------------------------------------- */

    public shutdown(){

        this.cache.clear();

        this.index.clear();

        this.removeAllListeners();

        this.emit(

            "shutdown"

        );

    }

}
