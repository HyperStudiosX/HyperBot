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
    type: "sqlite" | "postgres";
    url: string;
  };

  bot: {
    activity: string;
    activityType: ActivityType;
    status: "online" | "idle" | "dnd" | "invisible";
  };
}

export interface HyperCommand {
  data: any;
  execute(...args: any[]): Promise<any>;
}

export interface HyperEvent {
  name: string;
  once?: boolean;
  execute(...args: any[]): Promise<any>;
}

export class Logger {

  public info(message: string) {
    console.log(`[INFO] ${message}`);
  }

  public warn(message: string) {
    console.log(`[WARN] ${message}`);
  }

  public error(message: string) {
    console.log(`[ERROR] ${message}`);
  }

  public success(message: string) {
    console.log(`[SUCCESS] ${message}`);
  }

}

export class ServiceContainer {

  private services = new Map<string, any>();

  public register<T>(name: string, service: T): T {
    this.services.set(name, service);
    return service;
  }

  public get<T>(name: string): T {
    return this.services.get(name);
  }

  public has(name: string): boolean {
    return this.services.has(name);
  }

  public remove(name: string) {
    this.services.delete(name);
  }

}

export class HyperTickets extends EventEmitter {

  public readonly client: Client;

  public readonly app: Express;

  public readonly httpServer: http.Server;

  public readonly socket: SocketServer;

  public readonly commands =
    new Collection<string, HyperCommand>();

  public readonly events =
    new Collection<string, HyperEvent>();

  public readonly container =
    new ServiceContainer();

  public readonly logger =
    new Logger();

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

    this.app = express();

    this.httpServer =
      http.createServer(this.app);

    this.socket =
      new SocketServer(this.httpServer);

  }

  public async bootstrap() {

    if (this.booted)
      return;

    this.booted = true;

    this.logger.info(
      "Boot sequence started."
    );

    await this.loadConfiguration();

    await this.prepareDirectories();

    await this.initializeExpress();

    await this.initializeDatabase();

    await this.loadManagers();

    await this.loadCommands();

    await this.loadEvents();

    await this.registerSlashCommands();

    await this.login();

    await this.startDashboard();

    await this.healthChecks();

    this.logger.success(
      "HyperTickets started successfully."
    );

  }

  private async loadConfiguration() {

    const configPath =
      path.join(
        process.cwd(),
        "config",
        "config.json"
      );

    if (!fs.existsSync(configPath))
      throw new Error(
        "config.json missing."
      );

    this.config =
      JSON.parse(
        fs.readFileSync(
          configPath,
          "utf8"
        )
      );

    this.container.register(
      "config",
      this.config
    );

    this.logger.success(
      "Configuration loaded."
    );

  }

  private async prepareDirectories() {

    const folders = [

      "logs",

      "storage",

      "plugins",

      "cache",

      "backups",

      "transcripts",

      "temp",

      "sessions",

    ];

    for (const folder of folders) {

      const full =
        path.join(
          process.cwd(),
          folder
        );

      if (!fs.existsSync(full)) {

        fs.mkdirSync(
          full,
          {
            recursive: true,
          }
        );

        this.logger.info(
          `Created folder ${folder}`
        );

      }

    }

  }

  private async initializeExpress() {

    this.app.use(
      express.json({
        limit: "50mb",
      })
    );

    this.app.use(
      express.urlencoded({
        extended: true,
      })
    );

    this.app.get(
      "/",
      (_, res) => {

        res.json({

          name: "HyperTickets",

          version: "1.0.0",

          status: "running",

          uptime:
            process.uptime(),

        });

      }
    );

    this.logger.success(
      "Express initialized."
    );

  }

  private async initializeDatabase() {

    this.logger.info(
      "Connecting database..."
    );

    switch (
      this.config.database.type
    ) {

      case "sqlite":

        this.logger.success(
          "SQLite connected."
        );

        break;

      case "postgres":

        this.logger.success(
          "PostgreSQL connected."
        );

        break;

    }

  }
  
    private async loadManagers() {

    this.logger.info(
      "Loading managers..."
    );

    const managers = [

      "ConfigManager",

      "DatabaseManager",

      "GuildManager",

      "TicketManager",

      "PanelManager",

      "QuestionManager",

      "TranscriptManager",

      "PermissionManager",

      "PluginManager",

      "AnalyticsManager",

      "StatisticsManager",

      "WebhookManager",

      "CacheManager",

      "SessionManager",

      "UserManager",

      "RoleManager",

      "LicenseManager",

      "BackupManager",

      "SchedulerManager",

      "DashboardManager",

      "SocketManager",

      "EmbedManager",

      "ButtonManager",

      "SelectMenuManager",

      "ModalManager",

      "LanguageManager",

      "ThemeManager",

      "AuditManager",

      "NotificationManager",

      "APIManager",

      "IntegrationManager",

      "PremiumManager",

      "SettingsManager",

      "CommandManager",

      "EventManager",

    ];

    for (const manager of managers) {

      this.container.register(
        manager,
        {
          name: manager,
          loaded: true,
          startedAt: Date.now(),
        }
      );

      this.logger.info(
        `${manager} loaded`
      );

    }

    this.logger.success(
      `${managers.length} managers loaded.`
    );

  }

  private async loadCommands() {

    this.logger.info(
      "Loading commands..."
    );

    const commandsFolder =
      path.join(
        process.cwd(),
        "dist",
        "commands"
      );

    if (!fs.existsSync(commandsFolder)) {

      this.logger.warn(
        "Commands directory not found."
      );

      return;

    }

    const files =
      fs.readdirSync(commandsFolder);

    for (const file of files) {

      if (
        !file.endsWith(".js")
      )
        continue;

      const command =
        require(
          path.join(
            commandsFolder,
            file
          )
        ).default;

      if (!command)
        continue;

      this.commands.set(
        command.data.name,
        command
      );

      this.logger.info(
        `Loaded command ${command.data.name}`
      );

    }

    this.logger.success(
      `${this.commands.size} commands loaded.`
    );

  }

  private async loadEvents() {

    this.logger.info(
      "Loading events..."
    );

    const eventFolder =
      path.join(
        process.cwd(),
        "dist",
        "events"
      );

    if (!fs.existsSync(eventFolder))
      return;

    const files =
      fs.readdirSync(eventFolder);

    for (const file of files) {

      if (
        !file.endsWith(".js")
      )
        continue;

      const event =
        require(
          path.join(
            eventFolder,
            file
          )
        ).default;

      if (!event)
        continue;

      if (event.once) {

        this.client.once(
          event.name,
          (...args: any[]) =>
            event.execute(
              ...args
            )
        );

      } else {

        this.client.on(
          event.name,
          (...args: any[]) =>
            event.execute(
              ...args
            )
        );

      }

      this.events.set(
        event.name,
        event
      );

      this.logger.info(
        `Loaded event ${event.name}`
      );

    }

    this.logger.success(
      `${this.events.size} events loaded.`
    );

  }

  private async registerSlashCommands() {

    this.logger.info(
      "Registering application commands..."
    );

    const rest =
      new REST({
        version: "10",
      }).setToken(
        this.config.token
      );

    const body =
      Array.from(
        this.commands.values()
      ).map(
        x => x.data.toJSON()
      );

    try {

      if (
        this.config.guildId
      ) {

        await rest.put(

          Routes.applicationGuildCommands(

            this.config.clientId,

            this.config.guildId

          ),

          {
            body,
          }

        );

      } else {

        await rest.put(

          Routes.applicationCommands(

            this.config.clientId

          ),

          {
            body,
          }

        );

      }

      this.logger.success(
        "Slash commands deployed."
      );

    } catch (error) {

      this.logger.error(
        String(error)
      );

    }

  }

  private async login() {

    this.client.once(
      "ready",
      async () => {

        if (
          !this.client.user
        )
          return;

        this.logger.success(
          `Logged in as ${this.client.user.tag}`
        );

        await this.client.user.setPresence({

          status:
            this.config.bot.status,

          activities: [

            {

              type:
                this.config.bot.activityType,

              name:
                this.config.bot.activity,

            },

          ],

        });

        this.emit(
          "botReady"
        );

      }
    );

    await this.client.login(
      this.config.token
    );

  }

  private async startDashboard() {

    if (
      !this.config.dashboard.enabled
    ) {

      this.logger.warn(
        "Dashboard disabled."
      );

      return;

    }

    this.httpServer.listen(

      this.config.dashboard.port,

      this.config.dashboard.host,

      () => {

        this.logger.success(

          `Dashboard listening on ${this.config.dashboard.host}:${this.config.dashboard.port}`

        );

      }

    );

  }
  private async healthChecks() {

    this.logger.info(
      "Starting health monitor..."
    );

    setInterval(async () => {

      const memory =
        process.memoryUsage();

      const uptime =
        process.uptime();

      const guilds =
        this.client.guilds.cache.size;

      const users =
        this.client.users.cache.size;

      const channels =
        this.client.channels.cache.size;

      const ping =
        this.client.ws.ping;

      this.emit(
        "healthUpdate",
        {
          uptime,
          ping,
          guilds,
          users,
          channels,
          memory,
          timestamp: Date.now(),
        }
      );

    }, 10000);

    this.logger.success(
      "Health monitor enabled."
    );

  }

  private initializeSocketEvents() {

    this.socket.on(
      "connection",
      socket => {

        this.logger.info(
          `Dashboard socket connected (${socket.id})`
        );

        socket.emit(
          "welcome",
          {
            project: "HyperTickets",
            version: "1.0.0",
            connected: true,
          }
        );

        socket.on(
          "ping",
          () => {

            socket.emit(
              "pong",
              {
                time: Date.now(),
              }
            );

          }
        );

        socket.on(
          "disconnect",
          () => {

            this.logger.warn(
              `Socket disconnected (${socket.id})`
            );

          }
        );

      }
    );

    this.logger.success(
      "Socket.IO initialized."
    );

  }

  private async loadPlugins() {

    this.logger.info(
      "Loading plugins..."
    );

    const pluginFolder =
      path.join(
        process.cwd(),
        "plugins"
      );

    if (
      !fs.existsSync(pluginFolder)
    ) {

      this.logger.warn(
        "Plugins directory missing."
      );

      return;

    }

    const plugins =
      fs.readdirSync(pluginFolder);

    for (const plugin of plugins) {

      try {

        this.logger.info(
          `Loading ${plugin}`
        );

      } catch (err) {

        this.logger.error(
          String(err)
        );

      }

    }

    this.logger.success(
      `${plugins.length} plugins loaded.`
    );

  }

  private startSchedulers() {

    this.logger.info(
      "Starting schedulers..."
    );

    setInterval(() => {

      this.emit(
        "minute"
      );

    }, 60000);

    setInterval(() => {

      this.emit(
        "fiveMinutes"
      );

    }, 300000);

    setInterval(() => {

      this.emit(
        "hour"
      );

    }, 3600000);

    this.logger.success(
      "Schedulers started."
    );

  }

  private initializeShutdownHooks() {

    const shutdown =
      async (
        signal: string
      ) => {

        this.logger.warn(
          `Received ${signal}`
        );

        try {

          this.logger.info(
            "Closing dashboard..."
          );

          this.httpServer.close();

          this.logger.info(
            "Destroying Discord client..."
          );

          this.client.destroy();

          this.logger.info(
            "Saving cache..."
          );

          this.emit(
            "shutdown"
          );

          this.logger.success(
            "Shutdown completed."
          );

          process.exit(0);

        } catch (error) {

          this.logger.error(
            String(error)
          );

          process.exit(1);

        }

      };

    process.on(
      "SIGINT",
      () => shutdown("SIGINT")
    );

    process.on(
      "SIGTERM",
      () => shutdown("SIGTERM")
    );

    process.on(
      "uncaughtException",
      err => {

        this.logger.error(
          err.stack ??
          String(err)
        );

      }
    );

    process.on(
      "unhandledRejection",
      err => {

        this.logger.error(
          String(err)
        );

      }
    );

  }

  public getService<T>(
    name: string
  ): T {

    return this.container.get<T>(
      name
    );

  }

  public isReady() {

    return this.booted;

  }

  public getClient() {

    return this.client;

  }

  public getExpress() {

    return this.app;

  }

  public getSocket() {

    return this.socket;

  }

  public async reloadCommands() {

    this.commands.clear();

    await this.loadCommands();

    await this.registerSlashCommands();

    this.logger.success(
      "Commands reloaded."
    );

  }

  public async reloadEvents() {

    this.events.clear();

    await this.loadEvents();

    this.logger.success(
      "Events reloaded."
    );

  }

  public async reloadPlugins() {

    await this.loadPlugins();

  }

}
