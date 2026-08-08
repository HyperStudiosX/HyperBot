import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketCategoryCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-category")
            .setDescription(
                "Manage the category of the current ticket."
            )
            .setDefaultMemberPermissions(
                PermissionFlagsBits.ManageChannels
            )
            .addStringOption(option =>
                option
                    .setName("category")
                    .setDescription(
                        "The category to move the ticket to."
                    )
                    .setRequired(true)
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const category =
            interaction.options.getString(
                "category",
                true
            );

        const manager =
            TicketManager.getInstance();

        await manager.setTicketCategory(
            interaction,
            category
        );
    }
}
