import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket")
            .setDescription("Manage support tickets.")

            // Create
            .addSubcommand(subcommand =>
                subcommand
                    .setName("create")
                    .setDescription(
                        "Create a new support ticket."
                    )
            )

            // Close
            .addSubcommand(subcommand =>
                subcommand
                    .setName("close")
                    .setDescription(
                        "Close the current ticket."
                    )
            )

            // Reopen
            .addSubcommand(subcommand =>
                subcommand
                    .setName("reopen")
                    .setDescription(
                        "Reopen the current ticket."
                    )
            )

            // Delete
            .addSubcommand(subcommand =>
                subcommand
                    .setName("delete")
                    .setDescription(
                        "Delete the current ticket."
                    )
            )

            // Claim
            .addSubcommand(subcommand =>
                subcommand
                    .setName("claim")
                    .setDescription(
                        "Claim the current ticket."
                    )
            )

            // Unclaim
            .addSubcommand(subcommand =>
                subcommand
                    .setName("unclaim")
                    .setDescription(
                        "Unclaim the current ticket."
                    )
            )

            // Add member
            .addSubcommand(subcommand =>
                subcommand
                    .setName("add")
                    .setDescription(
                        "Add a member to the ticket."
                    )
                    .addUserOption(option =>
                        option
                            .setName("user")
                            .setDescription(
                                "Member to add."
                            )
                            .setRequired(true)
                    )
            )

            // Remove member
            .addSubcommand(subcommand =>
                subcommand
                    .setName("remove")
                    .setDescription(
                        "Remove a member from the ticket."
                    )
                    .addUserOption(option =>
                        option
                            .setName("user")
                            .setDescription(
                                "Member to remove."
                            )
                            .setRequired(true)
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

            case "create":

                await manager.createTicket(
                    interaction
                );

                break;

            case "close":

                await manager.closeTicket(
                    interaction
                );

                break;

            case "reopen":

                await manager.reopenTicket(
                    interaction
                );

                break;

            case "delete":

                await manager.deleteTicket(
                    interaction
                );

                break;

            case "claim":

                await manager.claimTicket(
                    interaction
                );

                break;

            case "unclaim":

                await manager.unclaimTicket(
                    interaction
                );

                break;

            case "add": {

                const user =
                    interaction.options.getUser(
                        "user",
                        true
                    );

                await manager.addMember(
                    interaction,
                    user
                );

                break;
            }

            case "remove": {

                const user =
                    interaction.options.getUser(
                        "user",
                        true
                    );

                await manager.removeMember(
                    interaction,
                    user
                );

                break;
            }

            default:

                await interaction.reply({
                    content:
                        "Unknown ticket command.",
                    ephemeral: true
                });

                break;
        }
    }
}
