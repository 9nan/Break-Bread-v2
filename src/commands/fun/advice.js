const { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, MessageFlags } = require('discord.js');
const axios = require('axios');

// Fallback advice list in case the API is down
const fallbackAdvice = [
    "Always be yourself, unless you can be a unicorn. Then always be a unicorn.",
    "Life is short. Smile while you still have teeth.",
    "If at first you don't succeed, skydiving is not for you.",
    "The early bird gets the worm, but the second mouse gets the cheese.",
    "Don't worry about what others think of you. They're too busy worrying about what you think of them.",
    "If you think nobody cares if you're alive, try missing a couple of car payments.",
    "The best way to predict the future is to create it.",
    "Life is like a camera. Focus on what's important, capture the good times, develop from the negatives, and if things don't work out, take another shot.",
    "You don't have to be perfect to be amazing.",
    "The only way to do great work is to love what you do."
];

module.exports = {
    cooldown: 5, // Cooldown in seconds
    category: 'fun',
    
    data: new SlashCommandBuilder()
        .setName('advice')
        .setDescription('Get random life advice to brighten your day'),

    /**
     * Execute the advice command
     * @param {ChatInputCommandInteraction} interaction - The interaction object
     */
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            let advice;
            let source = 'Advice Slip API';
            
            try {
                // Try to get advice from the API with retry logic
                let retries = 3;
                let lastError;
                
                while (retries > 0) {
                    try {
                        const response = await axios.get('https://api.adviceslip.com/advice', {
                            headers: { 'Accept': 'application/json' },
                            timeout: 5000 // 5 second timeout
                        });
                        
                        advice = response.data.slip.advice;
                        break;
                    } catch (error) {
                        lastError = error;
                        retries--;
                        if (retries > 0) {
                            // Wait 1 second before retrying
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
                
                // If all retries failed, use fallback advice
                if (!advice) {
                    advice = fallbackAdvice[Math.floor(Math.random() * fallbackAdvice.length)];
                    source = 'Fallback Advice';
                }
            } catch (error) {
                // If there's an error with the API, use fallback advice
                console.warn('Error fetching advice from API, using fallback:', error);
                advice = fallbackAdvice[Math.floor(Math.random() * fallbackAdvice.length)];
                source = 'Fallback Advice';
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('✨ Random Advice')
                .setDescription(`"${advice}"`)
                .setTimestamp()
                .setFooter({ 
                    text: `Powered by ${source}`,
                    iconURL: interaction.client.user.displayAvatarURL() 
                });

            return await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in advice command:', error);
            
            // If the interaction has already been replied to or deferred
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply({
                    content: 'Sorry, I encountered an unexpected error while trying to get advice. Please try again later!',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                return await interaction.reply({
                    content: 'Sorry, I encountered an unexpected error while trying to get advice. Please try again later!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};