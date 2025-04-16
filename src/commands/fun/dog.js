const { SlashCommandBuilder, EmbedBuilder, AutocompleteInteraction } = require('discord.js');
const axios = require('axios');
const cacheManager = require('../../utils/cacheManager');
// const logger = require('../../utils/cleanLogger');

// List of valid dog breeds (for autocomplete)
const VALID_BREEDS = [];

// Fetch valid breeds if they don't exist
async function fetchBreeds() {
    if (VALID_BREEDS.length > 0) return;
    
    try {
        const response = await axios.get('https://dog.ceo/api/breeds/list/all');
        if (response.data && response.data.message) {
            // Process the breeds from the API
            const breedsData = response.data.message;
            
            for (const [mainBreed, subBreeds] of Object.entries(breedsData)) {
                if (subBreeds.length === 0) {
                    VALID_BREEDS.push(mainBreed);
                } else {
                    subBreeds.forEach(subBreed => {
                        VALID_BREEDS.push(`${subBreed} ${mainBreed}`);
                    });
                }
            }
        }
    } catch (error) {
        // logger.error('Error fetching dog breeds:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dog')
        .setDescription('Get a random dog image')
        .addStringOption(option => 
            option.setName('breed')
                .setDescription('Dog breed (optional)')
                .setRequired(false)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        await fetchBreeds();
        
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        let filtered = VALID_BREEDS;
        if (focusedValue) {
            filtered = VALID_BREEDS.filter(breed => 
                breed.toLowerCase().includes(focusedValue)
            ).slice(0, 25);
        } else {
            // When no input, show some popular breeds
            filtered = ['labrador', 'german shepherd', 'golden retriever', 'beagle', 'bulldog']
                .filter(breed => VALID_BREEDS.includes(breed));
        }
        
        // Limit to 25 options
        filtered = filtered.slice(0, 25);
        
        await interaction.respond(
            filtered.map(breed => ({ name: breed, value: breed }))
        );
    },

    async execute(interaction) {
        await interaction.deferReply();
        
        // Get the breed option if it exists
        const breedName = interaction.options.getString('breed');
        
        try {
            // Prepare the API URL based on whether a breed was specified
            let url = 'https://dog.ceo/api/breeds/image/random';
            let formattedBreed = '';
            
            if (breedName) {
                // Format the breed name for the API
                formattedBreed = formatBreedForApi(breedName);
                url = `https://dog.ceo/api/breed/${formattedBreed}/images/random`;
            }
            
            // Check cache first
            const cacheKey = breedName ? `dog:${formattedBreed}` : 'dog:random';
            const cachedUrl = cacheManager.get(cacheKey);
            
            if (cachedUrl) {
                // logger.debug(`Using cached dog image for ${breedName || 'random'}`);
                await sendDogEmbed(interaction, cachedUrl, breedName);
                return;
            }
            
            // Fetch from API
            const response = await axios.get(url);
            
            if (!response.data || !response.data.message) {
                throw new Error('Invalid response from dog API');
            }
            
            const imageUrl = response.data.message;
            
            // Cache the result
            cacheManager.set(cacheKey, imageUrl, { ttl: 10 * 60 * 1000 }); // Cache for 10 minutes
            
            // Pre-fetch some images for future requests
            prefetchDogImages(breedName);
            
            // Send the result
            await sendDogEmbed(interaction, imageUrl, breedName);
        } catch (error) {
            // logger.error('Error in dog command:', error);
            
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Error')
                        .setDescription(breedName 
                            ? `Failed to fetch a ${breedName} dog image. The breed may not exist or there was an API error.` 
                            : 'Failed to fetch a dog image. Please try again later.')
                ]
            });
        }
    }
};

function formatBreedForApi(breed) {
    // Handle special case of "german shepherd" -> "shepherd/german"
    const parts = breed.toLowerCase().split(' ');
    
    if (parts.length >= 2) {
        // For multi-word breeds, the format is typically subbreed/mainbreed
        return `${parts[parts.length - 1]}/${parts.slice(0, parts.length - 1).join('-')}`;
    }
    
    return breed.toLowerCase();
}

async function sendDogEmbed(interaction, imageUrl, breedName) {
    const title = breedName 
        ? `${breedName.charAt(0).toUpperCase() + breedName.slice(1)} Dog`
        : 'Random Dog';
        
    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor('#8e44ad')
                .setTitle(title)
                .setImage(imageUrl)
                .setFooter({ text: 'Powered by Dog CEO API' })
                .setTimestamp()
        ]
    });
}

async function prefetchDogImages(breedName) {
    try {
        let url = 'https://dog.ceo/api/breeds/image/random';
        
        if (breedName) {
            const formattedBreed = formatBreedForApi(breedName);
            url = `https://dog.ceo/api/breed/${formattedBreed}/images/random`;
        }
        
        const response = await axios.get(url);
        
        if (response.data && response.data.message) {
            const imageUrl = response.data.message;
            const randomIndex = Math.floor(Math.random() * 5);
            const cacheKey = breedName ? `dog:prefetch:${formattedBreed}:${randomIndex}` : `dog:prefetch:random:${randomIndex}`;
            
            cacheManager.set(cacheKey, imageUrl, { ttl: 30 * 60 * 1000 });
        }
    } catch (error) {
        // logger.error('Error prefetching dog images:', error);
    }
}
