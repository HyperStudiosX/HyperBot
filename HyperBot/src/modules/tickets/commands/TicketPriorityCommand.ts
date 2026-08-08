import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketPriorityCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-priority")
            .setDescription(
                "Manage the priority of the current ticket."
            )
            .addStringOption(option =>
                option
                    .setName("level")
                    .setDescription(
                        "Priority level for the ticket."
                    )
                    .setRequired(true)
                    .addChoices(
                        {
                            name: "Low",
                            value: "low"
                        },
                        {
                            name: "Normal",
                            value: "normal"
                        },
                        {
                            name: "High",
                            value: "high"
                        },
                        {
                            name: "Urgent",
                            value: "urgent"
                        }
                    )
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const priority =
            interaction.options.getString(
                "level",
                true
            );

        const manager =
            TicketManager.getInstance();

        await manager.setTicketPriority(
            interaction,
            priority
        );
    }
}
