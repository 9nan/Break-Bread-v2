const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cacheManager = require('../../utils/cacheManager');
// const logger = require('../../utils/cleanLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Get a random cat image'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Check cache first
            const cacheKey = 'cat:latest';
            const cachedUrl = cacheManager.get(cacheKey);
            
            if (cachedUrl) {
                // logger.debug('Using cached cat image');
                await sendCatEmbed(interaction, cachedUrl);
                return;
            }

            // Fetch data from the API
            const response = await axios.get('https://api.thecatapi.com/v1/images/search');
            const imageUrl = response.data[0]?.url;

            if (!imageUrl) {
                throw new Error('No cat image found in API response');
            }

            // Cache the result
            cacheManager.set(cacheKey, imageUrl, { ttl: 10 * 60 * 1000 }); // Cache for 10 minutes
            
            // Pre-fetch some images for future requests
            prefetchCatImages();
            
            // Send the result
            await sendCatEmbed(interaction, imageUrl);
        } catch (error) {
            // logger.error('Error in cat command:', error);
            
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Error')
                        .setDescription('Failed to fetch a cat image. Please try again later.')
                ]
            });
        }
    }
};

async function sendCatEmbed(interaction, imageUrl) {
    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('Random Cat')
                .setImage(imageUrl)
                .setFooter({ text: 'Powered by TheCatAPI' })
                .setTimestamp()
        ]
    });
}

async function prefetchCatImages() {
    try {
        const response = await axios.get('https://api.thecatapi.com/v1/images/search');
        const imageUrl = response.data[0]?.url;
        
        if (imageUrl) {
            const randomIndex = Math.floor(Math.random() * 5);
            cacheManager.set(`cat:prefetch:${randomIndex}`, imageUrl, { ttl: 30 * 60 * 1000 });
        }
    } catch (error) {
        // logger.error('Error prefetching cat images:', error);
    }
}
