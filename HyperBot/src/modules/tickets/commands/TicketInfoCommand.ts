import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketInfoCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-info")
            .setDescription(
                "View information about the current ticket."
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("view")
                    .setDescription(
                        "View the current ticket information."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("status")
                    .setDescription(
                        "View the current ticket status."
                    )
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const subcommand =
            interaction.options.getSubcommand();

        const manager =
            TicketManager.getInstance();

        switch (subcommand) {

            case "view":

                await manager.getTicketInfo(
                    interaction
                );

                break;

            case "status":

                await manager.getTicketStatus(
                    interaction
                );

                break;

            default:

                await interaction.reply({
                    content:
                        "Unknown ticket information command.",
                    ephemeral: true
                });

                break;
        }
    }
}
