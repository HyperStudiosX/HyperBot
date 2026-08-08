import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { TranscriptManager } from "../managers/TranscriptManager";

export class TicketTranscriptCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-transcript")
            .setDescription(
                "Manage ticket transcripts."
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("create")
                    .setDescription(
                        "Create a transcript of the current ticket."
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName("delete")
                    .setDescription(
                        "Delete a ticket transcript."
                    )
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const subcommand =
            interaction.options.getSubcommand();

        const manager =
            TranscriptManager.getInstance();

        switch (subcommand) {

            case "create":

                await manager.createTranscript(
                    interaction
                );

                break;

            case "delete":

                await manager.deleteTranscript(
                    interaction
                );

                break;

            default:

                await interaction.reply({
                    content:
                        "Unknown transcript command.",
                    ephemeral: true
                });

                break;
        }
    }
}
