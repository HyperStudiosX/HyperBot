import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { PanelManager } from "../managers/PanelManager";

export class TicketSetupCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-setup")
            .setDescription(
                "Configure the ticket system."
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("panel")
                    .setDescription(
                        "Create a ticket panel."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("list")
                    .setDescription(
                        "List configured ticket panels."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("delete")
                    .setDescription(
                        "Delete a ticket panel."
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

            case "panel":

                await manager.createPanel(
                    interaction
                );

                break;

            case "list":

                await manager.listPanels(
                    interaction
                );

                break;

            case "delete":

                await manager.deletePanel(
                    interaction
                );

                break;

            default:

                await interaction.reply({
                    content:
                        "Unknown ticket setup command.",
                    ephemeral: true
                });

                break;
        }
    }
}
