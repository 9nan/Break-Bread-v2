const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, getVoiceConnection, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const { PassThrough } = require('stream');
const voiceManager = require('../../utils/voiceManager');
const config = require('../../../config');
const axios = require('axios');
const cacheManager = require('../../utils/cacheManager');

// You'll need to install Tone.js to use the generation feature:
// npm install tone

// Store who started the lofi in each guild
const lofiStarters = new Map();
// Store timeout IDs for auto-leave
const leaveTimeouts = new Map();
// Store the audio streams for each guild
const audioStreams = new Map();

// Increase buffer size for better streaming performance
const BUFFER_SIZE = 1024 * 1024 * 5; // 5MB buffer size for smoother playback

// Flag to use Tone.js or fallback to streaming
const USE_TONE = false; // Set to false until Tone.js is installed

// Function to check if voice channel is empty (excluding the bot)
function isVoiceChannelEmpty(channel) {
    return channel.members.filter(member => !member.user.bot).size === 0;
}

// Function to schedule auto-leave check
function scheduleAutoLeave(guild, channel) {
    // Clear existing timeout if there is one
    if (leaveTimeouts.has(guild.id)) {
        clearTimeout(leaveTimeouts.get(guild.id));
        leaveTimeouts.delete(guild.id);
    }

    // Set new timeout - use a safer approach with constant value
    let AUTO_LEAVE_DELAY = 10 * 60 * 1000; // 10 minutes in ms
    
    // Ensure the delay is valid and positive
    if (AUTO_LEAVE_DELAY <= 0) {
        console.warn(`Invalid auto leave delay: ${AUTO_LEAVE_DELAY}, using default of 10 minutes instead`);
        AUTO_LEAVE_DELAY = 10 * 60 * 1000; // Default to 10 minutes
    }
    
    // Check if the channel is already empty
    if (isVoiceChannelEmpty(channel)) {
        const timeout = setTimeout(() => {
            voiceManager.destroyConnection(guild.id);
            lofiStarters.delete(guild.id);
            stopToneAudio(guild.id);
            console.debug(`Left voice channel in ${guild.name} due to inactivity`);
        }, AUTO_LEAVE_DELAY);

        leaveTimeouts.set(guild.id, timeout);
    }
}

// Function to truncate error messages to avoid embed field length issues
function truncateErrorMessage(error) {
    const errorMsg = error.message || String(error);
    return errorMsg.length > 900 ? errorMsg.substring(0, 900) + '...' : errorMsg;
}

// Function to check if required audio dependencies are installed
function checkAudioDependencies() {
    try {
        // Just check for opus libraries for now
        try {
            require('opusscript');
            return true;
        } catch (e) {
            try {
                require('@discordjs/opus');
                return true;
            } catch (e) {
                try {
                    require('node-opus');
                    return true;
                } catch (e) {
                    return false;
                }
            }
        }
    } catch (error) {
        return false;
    }
}

// Function to get lofi audio (direct HTTP request)
async function getLofiAudio(guildId) {
    try {
        // Check if we have the stream URL cached for verified working endpoints
        const cacheKey = 'lofi:stream:verified';
        let streamUrl = cacheManager.get(cacheKey);
        
        // If no verified stream in cache, verify it with a HEAD request
        if (!streamUrl) {
            const response = await axios.head(config.lofiStreamUrl, { 
                timeout: 5000,
                validateStatus: status => status < 400
            });
            
            if (response.status >= 200 && response.status < 300) {
                streamUrl = config.lofiStreamUrl;
                
                // Cache the verified stream URL
                cacheManager.set(cacheKey, streamUrl, { ttl: 30 * 60 * 1000 }); // 30 min cache
            } else {
                throw new Error(`Stream URL returned status code ${response.status}`);
            }
        }
        
        return streamUrl;
    } catch (error) {
        console.error('Error in getLofiAudio:', error);
        // Fallback to direct URL if verification fails
        return config.lofiStreamUrl;
    }
}

// Function to stop audio for a guild
function stopToneAudio(guildId) {
    try {
        const stream = audioStreams.get(guildId);
        if (stream) {
            if (!stream.destroyed) {
                stream.end();
            }
            audioStreams.delete(guildId);
        }
    } catch (error) {
        console.error("Error stopping audio:", error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lofi')
        .setDescription('Play lofi music in a voice channel')
        .addStringOption(option => 
            option
                .setName('action')
                .setDescription('Action to perform with lofi music')
                .setRequired(true)
                .addChoices(
                    { name: 'Play', value: 'play' },
                    { name: 'Stop', value: 'stop' }
                )),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        const { member, guild } = interaction;

        try {
            if (action === 'play') {
                if (!member.voice.channel) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Voice Channel Required')
                                .setDescription('You need to be in a voice channel to use this command!')
                                .setFooter({ text: 'Lofi Music System' })
                                .setTimestamp()
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Check if required audio dependencies are installed
                if (!checkAudioDependencies()) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Missing Dependencies')
                                .setDescription('The bot is missing required audio dependencies to play music.')
                                .addFields(
                                    { name: 'Required Package', value: 'Please install an opus encoder: ```npm install opusscript```' }
                                )
                                .setFooter({ text: 'Lofi Music System' })
                                .setTimestamp()
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Check if bot is already playing in another channel
                const existingConnection = getVoiceConnection(guild.id);
                if (existingConnection) {
                    // Check if bot is playing in the same channel
                    if (existingConnection.joinConfig.channelId === member.voice.channelId) {
                        return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#FFA500')
                                    .setTitle('⚠️ Already Playing')
                                    .setDescription('I\'m already playing lofi music in this channel!')
                                    .addFields(
                                        { name: 'Started By', value: `<@${lofiStarters.get(guild.id) || 'Unknown'}>` }
                                    )
                                    .setFooter({ text: 'Lofi Music System' })
                                    .setTimestamp()
                            ],
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('❌ Already Playing')
                                    .setDescription('I\'m already playing lofi in another voice channel!')
                                    .addFields(
                                        { name: 'Current Channel', value: `<#${existingConnection.joinConfig.channelId}>` }
                                    )
                                    .setFooter({ text: 'Lofi Music System' })
                                    .setTimestamp()
                            ],
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }

                // Defer the reply immediately to prevent interaction expiration
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                try {
                    // Get or create voice connection
                    let connection = voiceManager.getConnection(guild.id);
                    if (!connection) {
                        connection = voiceManager.createConnection(member.voice.channel);
                        
                        // Handle connection errors for IP discovery issues
                        connection.on('error', (error) => {
                            console.error(`Voice connection error in ${guild.name}:`, error);
                            // Clean up on error
                            try {
                                voiceManager.destroyConnection(guild.id);
                                lofiStarters.delete(guild.id);
                                stopToneAudio(guild.id);
                                if (leaveTimeouts.has(guild.id)) {
                                    clearTimeout(leaveTimeouts.get(guild.id));
                                    leaveTimeouts.delete(guild.id);
                                }
                            } catch (cleanupError) {
                                console.error('Error during cleanup:', cleanupError);
                            }
                        });
                        
                        // Handle state changes
                        connection.on(VoiceConnectionStatus.Disconnected, async () => {
                            try {
                                // Try to reconnect if possible
                                await Promise.race([
                                    new Promise(resolve => {
                                        connection.once(VoiceConnectionStatus.Ready, resolve);
                                    }),
                                    new Promise((_, reject) => {
                                        // Ensure positive timeout value
                                        const RECONNECT_TIMEOUT = 5000; // 5 seconds
                                        setTimeout(() => reject('Connection timed out'), RECONNECT_TIMEOUT);
                                    })
                                ]);
                            } catch (error) {
                                // If reconnection fails, destroy connection
                                voiceManager.destroyConnection(guild.id);
                                lofiStarters.delete(guild.id);
                                stopToneAudio(guild.id);
                            }
                        });
                    }

                    // Get or create audio player
                    let player = voiceManager.getPlayer(guild.id);
                    if (!player) {
                        player = voiceManager.createPlayer(guild.id);
                    }

                    // Store the user who started the lofi
                    lofiStarters.set(guild.id, member.id);

                    // Use the multithreaded function to get and validate the audio source
                    const audioSource = await getLofiAudio(guild.id);
                    
                    // Create and play audio resource
                    const resource = createAudioResource(audioSource, {
                        inlineVolume: true,
                        inputType: 'arbitrary',
                        bufferLengthSeconds: 5
                    });
                    
                    if (resource.volume) {
                        resource.volume.setVolume(0.5); // Set a comfortable volume
                    }
                    
                    player.play(resource);
                    connection.subscribe(player);

                    // Set up player status handling
                    player.on(AudioPlayerStatus.Playing, () => {
                        voiceManager.clearTimeout(guild.id);
                    });

                    player.on(AudioPlayerStatus.Idle, () => {
                        // If stream ends, restart it using worker thread with improved buffering
                        getLofiAudio(guild.id).then(audioSource => {
                            try {
                                // Use higher quality and better buffering for smoother playback
                                const newResource = createAudioResource(audioSource, {
                                    inlineVolume: true,
                                    inputType: 'arbitrary',
                                    // Use larger buffer for smoother playback
                                    bufferLengthSeconds: 10,
                                    // Higher quality options
                                    highWaterMark: BUFFER_SIZE
                                });
                                
                                if (newResource.volume) {
                                    // Set a comfortable default volume
                                    newResource.volume.setVolume(0.5);
                                }
                                
                                player.play(newResource);
                                
                                // Log memory usage occasionally
                                if (Math.random() < 0.1) { // 10% chance
                                    const used = process.memoryUsage();
                                    console.debug('Memory usage: ' + 
                                        Object.keys(used).map(key => {
                                            return `${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`;
                                        }).join(', '));
                                }
                            } catch (error) {
                                console.error('Error creating new resource:', error);
                            }
                        }).catch(error => {
                            console.error('Error restarting stream:', error);
                        });
                    });

                    // Monitor voice channel for automatic leave when empty
                    const voiceStateHandler = (oldState, newState) => {
                        // Only act on this guild's state changes
                        if (oldState.guild.id !== guild.id && newState.guild.id !== guild.id) return;

                        // Check if bot is connected to a voice channel
                        const connection = voiceManager.getConnection(guild.id);
                        if (!connection) return;

                        // Get the voice channel the bot is in
                        const voiceChannel = guild.channels.cache.get(connection.joinConfig.channelId);
                        if (!voiceChannel) return;

                        // Check for relevant user leaving the channel the bot is in
                        const isRelevantChange = 
                            (oldState.channelId === voiceChannel.id && newState.channelId !== voiceChannel.id) ||
                            (oldState.channelId !== voiceChannel.id && newState.channelId === voiceChannel.id);

                        if (isRelevantChange) {
                            // Check if channel is empty (except for bot)
                            if (isVoiceChannelEmpty(voiceChannel)) {
                                scheduleAutoLeave(guild, voiceChannel);
                            } else {
                                // Cancel auto-leave if someone joins
                                if (leaveTimeouts.has(guild.id)) {
                                    clearTimeout(leaveTimeouts.get(guild.id));
                                    leaveTimeouts.delete(guild.id);
                                }
                            }
                        }
                    };

                    // Only add the event listener once
                    guild.client.removeListener('voiceStateUpdate', voiceStateHandler);
                    guild.client.on('voiceStateUpdate', voiceStateHandler);

                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#00FF00')
                                .setTitle('🎵 Lofi Music Started')
                                .setDescription(`Now playing lofi music in ${member.voice.channel}`)
                                .addFields(
                                    { name: 'Mode', value: '🌐 Streaming mode' },
                                    { name: 'Started By', value: `<@${member.id}>` }
                                )
                                .setFooter({ text: 'Lofi Music System' })
                                .setTimestamp()
                        ]
                    });
                } catch (error) {
                    console.error('Error playing lofi:', error);
                    
                    // Clean up
                    try {
                        voiceManager.destroyConnection(guild.id);
                        lofiStarters.delete(guild.id);
                        stopToneAudio(guild.id);
                    } catch (cleanupError) {
                        console.debug('Error during cleanup:', cleanupError);
                    }

                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Error')
                                .setDescription('There was an error trying to play lofi music.')
                                .addFields(
                                    { name: 'Error Details', value: truncateErrorMessage(error) }
                                )
                                .setFooter({ text: 'Lofi Music System' })
                                .setTimestamp()
                        ]
                    });
                }
            } else if (action === 'stop') {
                // Check if there's a connection in this guild
                const connection = voiceManager.getConnection(guild.id);
                if (!connection) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Not Playing')
                                .setDescription('There is no lofi music playing right now.')
                                .setFooter({ text: 'Lofi Music System' })
                                .setTimestamp()
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Check if the user is the one who started the lofi
                if (lofiStarters.get(guild.id) !== member.id) {
                    // Allow admins to stop the music too
                    if (!member.permissions.has('Administrator')) {
                        return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('❌ Permission Denied')
                                    .setDescription('Only the person who started the lofi can stop it!')
                                    .addFields(
                                        { name: 'Started By', value: `<@${lofiStarters.get(guild.id)}>` }
                                    )
                                    .setFooter({ text: 'Lofi Music System' })
                                    .setTimestamp()
                            ],
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }

                try {
                    // Stop the connection
                    voiceManager.destroyConnection(guild.id);
                    lofiStarters.delete(guild.id);
                    stopToneAudio(guild.id);

                    // Clear timeouts
                    if (leaveTimeouts.has(guild.id)) {
                        clearTimeout(leaveTimeouts.get(guild.id));
                        leaveTimeouts.delete(guild.id);
                    }

                    await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#00FF00')
                                .setTitle('⏹️ Lofi Music Stopped')
                                .setDescription('The lofi music has been stopped and I\'ve disconnected from the voice channel.')
                                .setFooter({ text: 'Lofi Music System' })
                                .setTimestamp()
                        ]
                    });
                } catch (error) {
                    console.error('Error stopping lofi:', error);
                    await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Error')
                                .setDescription('There was an error trying to stop the lofi music.')
                                .addFields(
                                    { name: 'Error Details', value: truncateErrorMessage(error) }
                                )
                                .setFooter({ text: 'Lofi Music System' })
                                .setTimestamp()
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (error) {
            console.error('Error with lofi command:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Unexpected Error')
                        .setDescription('An unexpected error occurred while processing the command.')
                        .addFields(
                            { name: 'Error Details', value: truncateErrorMessage(error) }
                        )
                        .setFooter({ text: 'Lofi Music System' })
                        .setTimestamp()
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
