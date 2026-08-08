import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { PanelManager } from "../managers/PanelManager";

export class TicketPanelCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-panel")
            .setDescription(
                "Manage ticket panels."
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("create")
                    .setDescription(
                        "Create a ticket panel."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("delete")
                    .setDescription(
                        "Delete a ticket panel."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("list")
                    .setDescription(
                        "List all ticket panels."
                    )
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const subcommand =
            interaction.options.getSubcommand();

        const manager =
            PanelManager.getInstance();

        switch (subcommand) {

            case "create":

                await manager.createPanel(
                    interaction
                );

                break;

            case "delete":

                await manager.deletePanel(
                    interaction
                );

                break;

            case "list":

                await manager.listPanels(
                    interaction
                );

                break;

            default:

                await interaction.reply({
                    content:
                        "Unknown ticket panel command.",
                    ephemeral: true
                });

                break;
        }
    }
}
