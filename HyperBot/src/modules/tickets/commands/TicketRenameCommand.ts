import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";

import { TicketManager } from "../managers/TicketManager";

export class TicketRenameCommand {

    public static readonly data =
        new SlashCommandBuilder()
            .setName("ticket-rename")
            .setDescription(
                "Rename the current ticket."
            )
            .addStringOption(option =>
                option
                    .setName("name")
                    .setDescription(
                        "The new ticket name."
                    )
                    .setRequired(true)
                    .setMaxLength(100)
            );

    public static async execute(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {

        const name =
            interaction.options.getString(
                "name",
                true
            );

        const manager =
            TicketManager.getInstance();

        await manager.renameTicket(
            interaction,
            name
        );
    }
}
