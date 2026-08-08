import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketArchiveCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-archive")
            .setDescription(
                "Archive the current ticket."
            )
            .setDefaultMemberPermissions(
                PermissionFlagsBits.ManageChannels
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const manager =
            TicketManager.getInstance();

        await manager.archiveTicket(
            interaction
        );
    }
}
