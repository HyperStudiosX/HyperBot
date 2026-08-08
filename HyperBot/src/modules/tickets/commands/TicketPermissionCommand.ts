import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketPermissionCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-permission")
            .setDescription(
                "Manage permissions for the current ticket."
            )
            .setDefaultMemberPermissions(
                PermissionFlagsBits.ManageChannels
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("lock")
                    .setDescription(
                        "Lock the current ticket."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("unlock")
                    .setDescription(
                        "Unlock the current ticket."
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

            case "lock":

                await manager.lockTicket(
                    interaction
                );

                break;

            case "unlock":

                await manager.unlockTicket(
                    interaction
                );

                break;

            default:

                await interaction.reply({
                    content:
                        "Unknown ticket permission command.",
                    ephemeral: true
                });

                break;
        }
    }
}
