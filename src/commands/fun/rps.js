const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    cooldown: 8, // 8 second cooldown to prevent spam
    category: 'fun',
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock, Paper, Scissors'),

    async execute(interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rock')
                    .setLabel('🪨 Rock')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('paper')
                    .setLabel('📄 Paper')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('scissors')
                    .setLabel('✂️ Scissors')
                    .setStyle(ButtonStyle.Primary)
            );

        const response = await interaction.reply({
            content: 'Choose your move:',
            components: [row],
            flags: MessageFlags.Ephemeral
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 30000
            });

            const choices = ['rock', 'paper', 'scissors'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            const playerChoice = buttonInteraction.customId;

            let result;
            if (playerChoice === botChoice) {
                result = "It's a tie!";
            } else if (
                (playerChoice === 'rock' && botChoice === 'scissors') ||
                (playerChoice === 'paper' && botChoice === 'rock') ||
                (playerChoice === 'scissors' && botChoice === 'paper')
            ) {
                result = 'You win!';
            } else {
                result = 'I win!';
            }

            await buttonInteraction.update({
                content: `You chose ${playerChoice}\nI chose ${botChoice}\n${result}`,
                components: []
            });
        } catch (error) {
            if (error.name === 'TimeoutError') {
                await interaction.editReply({
                    content: 'Game cancelled - you took too long to respond!',
                    components: []
                });
            } else {
                console.error('Error in RPS game:', error);
                await interaction.editReply({
                    content: 'There was an error playing the game.',
                    components: []
                });
            }
        }
    }
};
