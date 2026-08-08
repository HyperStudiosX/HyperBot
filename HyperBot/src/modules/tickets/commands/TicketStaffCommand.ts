import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketStaffCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-staff")
            .setDescription(
                "Staff management for tickets."
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("claim")
                    .setDescription(
                        "Claim the current ticket."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("unclaim")
                    .setDescription(
                        "Unclaim the current ticket."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("add")
                    .setDescription(
                        "Add a member to the current ticket."
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

            .addSubcommand(subcommand =>
                subcommand
                    .setName("remove")
                    .setDescription(
                        "Remove a member from the current ticket."
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
                        "Unknown ticket staff command.",
                    ephemeral: true
                });

                break;
        }
    }
}
