import {
    ActivityType,
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
} from "discord.js";

import fs from "fs";
import path from "path";
import express, { Express } from "express";
import http from "http";
import { Server as SocketServer } from "socket.io";
import EventEmitter from "events";

import { TicketManager } from "./managers/TicketManager";
import { PanelManager } from "./managers/PanelManager";
import { TranscriptManager } from "./managers/TranscriptManager";

import { TicketService } from "./services/TicketService";
import { PanelService } from "./services/PanelService";
import { TranscriptService } from "./services/TranscriptService";

export interface HyperConfig {

    token: string;

    clientId: string;

    guildId?: string;

    dashboard: {

        enabled: boolean;

        port: number;

        host: string;

    };

    database: {

        type:
            | "sqlite"
            | "postgres";

        url: string;

    };

    bot: {

        activity: string;

        activityType: ActivityType;

        status:
            | "online"
            | "idle"
            | "dnd"
            | "invisible";

    };

}

export interface HyperCommand {

    data: any;

    execute(
        ...args: any[]
    ): Promise<any>;

}

export interface HyperEvent {

    name: string;

    once?: boolean;

    execute(
        ...args: any[]
    ): Promise<any>;

}

export class Logger {

    public info(
        message: string
    ): void {

        console.log(
            `[INFO] ${message}`
        );

    }

    public warn(
        message: string
    ): void {

        console.log(
            `[WARN] ${message}`
        );

    }

    public error(
        message: string
    ): void {

        console.log(
            `[ERROR] ${message}`
        );

    }

    public success(
        message: string
    ): void {

        console.log(
            `[SUCCESS] ${message}`
        );

    }

}

export class ServiceContainer {

    private readonly services =
        new Map<string, any>();

    public register<T>(
        name: string,
        service: T
    ): T {

        this.services.set(
            name,
            service
        );

        return service;

    }

    public get<T>(
        name: string
    ): T {

        return this.services.get(
            name
        );

    }

    public has(
        name: string
    ): boolean {

        return this.services.has(
            name
        );

    }

    public remove(
        name: string
    ): void {

        this.services.delete(
            name
        );

    }

}

export class HyperTickets
    extends EventEmitter {

    public readonly client: Client;

    public readonly app: Express;

    public readonly httpServer:
        http.Server;

    public readonly socket:
        SocketServer;

    public readonly commands =
        new Collection<
            string,
            HyperCommand
        >();

    public readonly events =
        new Collection<
            string,
            HyperEvent
        >();

    public readonly container =
        new ServiceContainer();

    public readonly logger =
        new Logger();

    public readonly ticketManager:
        TicketManager;

    public readonly panelManager:
        PanelManager;

    public readonly transcriptManager:
        TranscriptManager;

    public readonly ticketService:
        TicketService;

    public readonly panelService:
        PanelService;

    public readonly transcriptService:
        TranscriptService;

    public config!: HyperConfig;

    private booted = false;

    constructor() {

        super();

        this.client = new Client({

            intents: [

                GatewayIntentBits.Guilds,

                GatewayIntentBits.GuildMessages,

                GatewayIntentBits.GuildMembers,

                GatewayIntentBits.GuildModeration,

                GatewayIntentBits.GuildMessageReactions,

                GatewayIntentBits.MessageContent,

                GatewayIntentBits.DirectMessages,

            ],

            partials: [

                Partials.Channel,

                Partials.Message,

                Partials.User,

                Partials.GuildMember,

                Partials.Reaction,

            ],

        });

        this.app =
            express();

        this.httpServer =
            http.createServer(
                this.app
            );

        this.socket =
            new SocketServer(
                this.httpServer
            );

        /*
         * Ticket module managers
         */

        this.ticketManager =
            new TicketManager(
                this.client
            );

        this.panelManager =
            new PanelManager(
                this.client
            );

        this.transcriptManager =
            new TranscriptManager(
                this.client
            );

        /*
         * Ticket module services
         */

        this.ticketService =
            new TicketService(
                this.ticketManager
            );

        this.panelService =
            new PanelService(
                this.panelManager
            );

        this.transcriptService =
            new TranscriptService(
                this.transcriptManager
            );

        /*
         * Register ticket components
         * inside the module container.
         */

        this.container.register(
            "TicketManager",
            this.ticketManager
        );

        this.container.register(
            "PanelManager",
            this.panelManager
        );

        this.container.register(
            "TranscriptManager",
            this.transcriptManager
        );

        this.container.register(
            "TicketService",
            this.ticketService
        );

        this.container.register(
            "PanelService",
            this.panelService
        );

        this.container.register(
            "TranscriptService",
            this.transcriptService
        );

    }
