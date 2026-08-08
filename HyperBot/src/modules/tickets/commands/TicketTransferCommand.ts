import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketTransferCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-transfer")
            .setDescription(
                "Transfer the current ticket to another staff member."
            )
            .addUserOption(option =>
                option
                    .setName("user")
                    .setDescription(
                        "Staff member to transfer the ticket to."
                    )
                    .setRequired(true)
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const user =
            interaction.options.getUser(
                "user",
                true
            );

        const manager =
            TicketManager.getInstance();

        await manager.transferTicket(
            interaction,
            user
        );
    }
}
