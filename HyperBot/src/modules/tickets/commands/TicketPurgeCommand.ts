import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketPurgeCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-purge")
            .setDescription(
                "Delete the current ticket and its stored data."
            )
            .setDefaultMemberPermissions(
                PermissionFlagsBits.ManageChannels
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const manager =
            TicketManager.getInstance();

        await manager.purgeTicket(
            interaction
        );
    }
}
