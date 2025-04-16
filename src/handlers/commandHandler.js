/**
 * Command handler for managing and loading bot commands
 * Created by itznan 2025
 * created by Itznan 
// Discord = itz._.nan_

 */

const fs = require('fs').promises;
const path = require('path');
const { Collection, MessageFlags } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../config');
const { convertEphemeralToFlags } = require('../utils/ephemeralHelper');
// const logger = require('../utils/cleanLogger');
// const cleanLogger = require('../utils/cleanLogger');
const commandCacheManager = require('../utils/commandCacheManager');

// Commands that could be used for spam with their respective cooldowns in seconds
const SPAM_PRONE_COMMANDS = {
    // Fun commands
    'advice': 10,
    'cat': 15,
    'dog': 15,
    'rps': 8,
    'calculator': 10,
    'hex': 8,
    // Moderation commands
    'purge': 20,
    'ban': 10,
    'kick': 10,
    'timeout': 10,
    'warn': 10,
};

// Commands that should have a server-wide cooldown to prevent abuse
const SERVER_WIDE_COOLDOWN_COMMANDS = {
    'purge': 8,    // 8 seconds server-wide cooldown
    'ban': 5,      // 5 seconds server-wide cooldown
    'kick': 5,     // 5 seconds server-wide cooldown
};

// Only apply caching for commands that can benefit from it
// Typically, read-only commands that don't rely on user-specific state
const CACHEABLE_COMMANDS = [
    // Fun commands
    'hex', 'cat', 'dog', 'lofi',
    // Utility commands
    'help', 'serverinfo', 'whois',
    // Any other command that benefits from caching
];

class CommandHandler {
    constructor(client) {
        this.client = client;
        this.commands = new Collection();
        this.client.commands = new Collection();
        this.cooldowns = new Collection();
        this.client.cooldowns = new Collection();
        this.serverCooldowns = new Collection(); // Track server-wide cooldowns
    }

    async loadCommands() {
        try {
            const commandsPath = path.join(__dirname, '..', 'commands');
            const commandFolders = await fs.readdir(commandsPath);

            for (const folder of commandFolders) {
                const folderPath = path.join(commandsPath, folder);
                const stat = await fs.stat(folderPath);
                
                if (!stat.isDirectory()) continue;

                const commandFiles = (await fs.readdir(folderPath))
                    .filter(file => file.endsWith('.js'));

                for (const file of commandFiles) {
                    const filePath = path.join(folderPath, file);
                    const command = require(filePath);

                    if ('data' in command && 'execute' in command) {
                        this.commands.set(command.data.name, command);
                        this.client.commands.set(command.data.name, command);
                    } else {
                        // logger.warn(`The command at ${filePath} is missing required "data" or "execute" property.`);
                    }
                }
            }

            // logger.info(`Loaded ${this.commands.size} commands.`);
        } catch (error) {
            // logger.error('Error loading commands:', error);
            throw error;
        }
    }

    async registerCommands() {
        try {
            // logger.debug('Started refreshing application (/) commands.');
            
            const rest = new REST({ version: '10' }).setToken(config.token);
            const commands = [...this.commands.values()].map(cmd => cmd.data.toJSON());

            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands },
            );

            // logger.info('Successfully registered application commands.');
        } catch (error) {
            // logger.error('Error registering commands:', error);
            throw error;
        }
    }

    async handleCommand(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        // Enhanced command usage logging
        const timestamp = new Date().toISOString();
        const commandName = interaction.commandName;
        const userId = interaction.user.id;
        const userName = interaction.user.tag;
        const guildName = interaction.guild?.name || 'DM';
        const guildId = interaction.guild?.id || 'DM';
        const channelName = interaction.channel?.name || 'Unknown';
        const channelId = interaction.channelId;
        
        console.log(`[${timestamp}] CMD: /${commandName} | User: ${userName} (${userId}) | Server: ${guildName} (${guildId}) | Channel: #${channelName} (${channelId})`);

        // Check for server-wide cooldowns (only applies in guilds)
        if (interaction.guild && SERVER_WIDE_COOLDOWN_COMMANDS[commandName]) {
            const serverCooldownSeconds = SERVER_WIDE_COOLDOWN_COMMANDS[commandName];
            const serverCooldownKey = `${interaction.guild.id}-${commandName}`;
            
            // Initialize server cooldown tracking for this command if needed
            if (!this.serverCooldowns.has(serverCooldownKey)) {
                this.serverCooldowns.set(serverCooldownKey, 0);
            }
            
            const lastServerUse = this.serverCooldowns.get(serverCooldownKey);
            const now = Date.now();
            const serverCooldownAmount = serverCooldownSeconds * 1000;
            
            if (lastServerUse && now < lastServerUse + serverCooldownAmount) {
                const timeLeft = (lastServerUse + serverCooldownAmount - now) / 1000;
                // logger.warn(`Server-wide cooldown: ${interaction.user.tag} blocked from using /${commandName} in ${interaction.guild.name} - active for ${timeLeft.toFixed(1)}s more`);
                
                // Enhanced console logging for server-wide cooldown
                console.log(`[${new Date().toISOString()}] BLOCKED: /${commandName} | User: ${interaction.user.tag} (${interaction.user.id}) | Reason: Server-wide cooldown (${timeLeft.toFixed(1)}s remaining)`);
                
                return interaction.reply(convertEphemeralToFlags({
                    content: `This command was recently used by someone in this server. Please wait ${timeLeft.toFixed(1)} seconds before anyone can use it again.`,
                    flags: MessageFlags.Ephemeral
                }));
            }
            
            // Update the server cooldown timestamp
            this.serverCooldowns.set(serverCooldownKey, now);
        }

        // Check for user-specific cooldowns
        const spamCooldown = SPAM_PRONE_COMMANDS[commandName];
        
        // Use spam-specific cooldown if defined, otherwise use command.cooldown, or default to 3 seconds
        const cooldownSeconds = spamCooldown || command.cooldown || 3;
        
        // If cooldown collection doesn't have this command yet, add it
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Collection());
        }

        const now = Date.now();
        const timestamps = this.cooldowns.get(commandName);
        const cooldownAmount = cooldownSeconds * 1000;

        // Check for user-specific cooldown
        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                
                // Use a different message for spam-prone commands
                const cooldownMessage = spamCooldown ? 
                    `This command has a ${cooldownSeconds} second cooldown to prevent spam. Please wait ${timeLeft.toFixed(1)} more seconds.` :
                    `Please wait ${timeLeft.toFixed(1)} more second(s) before using the \`${commandName}\` command again.`;
                
                // Log spam attempts
                if (spamCooldown) {
                    // logger.warn(`Spam protection: ${interaction.user.tag} (${interaction.user.id}) blocked from using /${commandName} - cooldown active for ${timeLeft.toFixed(1)}s more`);
                }
                
                // Enhanced console logging for user cooldown
                console.log(`[${new Date().toISOString()}] BLOCKED: /${commandName} | User: ${interaction.user.tag} (${interaction.user.id}) | Reason: User cooldown (${timeLeft.toFixed(1)}s remaining)`);
                
                return interaction.reply(convertEphemeralToFlags({ 
                    content: cooldownMessage,
                    flags: MessageFlags.Ephemeral
                }));
            }
        }

        timestamps.set(interaction.user.id, now);
        // Ensure cooldown amount is positive
        const safeCooldownAmount = Math.max(cooldownAmount, 1000); // Minimum 1 second cooldown
        if (cooldownAmount <= 0) {
            // logger.warn(`Invalid cooldown value: ${cooldownAmount} ms for command ${commandName}, using 3 seconds instead`);
            setTimeout(() => timestamps.delete(interaction.user.id), 3000);
        } else {
            setTimeout(() => timestamps.delete(interaction.user.id), safeCooldownAmount);
        }

        try {
            await this.executeCommand(interaction, interaction.commandName);
        } catch (error) {
            // logger.error('Error executing command:', error);
            try {
                // Check if it's an unknown interaction error
                if (error.code === 10062) {
                    // logger.debug(`Interaction ${interaction.id} has already expired. Cannot respond.`);
                    return;
                }
                
                const errorMessage = convertEphemeralToFlags({
                    content: 'There was an error executing this command!',
                    flags: MessageFlags.Ephemeral
                });

                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply(convertEphemeralToFlags({ flags: MessageFlags.Ephemeral }));
                }
                await interaction.editReply(errorMessage);
            } catch (followUpError) {
                // logger.error('Error sending error message:', followUpError);
            }
        }
    }

    async executeCommand(interaction, commandName) {
        const command = this.client.commands.get(commandName);
        if (!command) return;

        try {
            // Check if we have a cached result first
            const isCacheHit = await this.tryGetFromCache(commandName, interaction);
            
            // If not a cache hit, execute the command normally
            if (!isCacheHit) {
                // Get the original reply method
                const originalReply = interaction.reply.bind(interaction);
                const originalEditReply = interaction.editReply.bind(interaction);
                
                const startTime = Date.now();
                const userId = interaction.user.id;
                const userName = interaction.user.tag;
                
                // Override reply to capture the result for caching
                interaction.reply = async function(options) {
                    // Execute original reply
                    const result = await originalReply(options);
                    
                    // Cache the result if it's cacheable
                    try {
                        if (CACHEABLE_COMMANDS.includes(commandName) && !command.neverCache) {
                            const cacheKey = buildCacheKey(interaction);
                            
                            // Don't cache ephemeral error messages
                            const isError = options.content && (
                                options.content.includes('error') || 
                                options.content.includes('Error') || 
                                options.content.includes('❌')
                            );
                            
                            if (!isError) {
                                // Set TTL based on command type
                                const ttl = getTtlForCommand(commandName);
                                
                                // Cache the options
                                commandCacheManager.setCommandCache(commandName, cacheKey, options, { ttl });
                                // cleanLogger.debug(`Cached response for /${commandName} with key ${cacheKey}`);
                            }
                        }
                    } catch (cacheError) {
                        // cleanLogger.error(`Error caching response for /${commandName}:`, cacheError);
                    }
                    
                    return result;
                };
                
                // Similarly override editReply
                interaction.editReply = async function(options) {
                    // Execute original editReply
                    const result = await originalEditReply(options);
                    
                    // Log successful editReply completion
                    const executionTime = Date.now() - startTime;
                    console.log(`[${new Date().toISOString()}] SUCCESS: /${commandName} | User: ${userName} (${userId}) | Time: ${executionTime}ms | Type: editReply`);
                    
                    // Cache the result if it's cacheable
                    try {
                        if (CACHEABLE_COMMANDS.includes(commandName) && !command.neverCache) {
                            const cacheKey = buildCacheKey(interaction);
                            
                            // Don't cache error messages
                            const isError = options.content && (
                                options.content.includes('error') || 
                                options.content.includes('Error') || 
                                options.content.includes('❌')
                            );
                            
                            if (!isError) {
                                // Set TTL based on command type
                                const ttl = getTtlForCommand(commandName);
                                
                                // Cache the options
                                commandCacheManager.setCommandCache(commandName, cacheKey, options, { ttl });
                                // cleanLogger.debug(`Cached response for /${commandName} with key ${cacheKey}`);
                            }
                        }
                    } catch (cacheError) {
                        // cleanLogger.error(`Error caching response for /${commandName}:`, cacheError);
                    }
                    
                    return result;
                };
                
                // Execute the command
                await command.execute(interaction);
                
                // Log successful command execution
                const executionTime = Date.now() - startTime;
                console.log(`[${new Date().toISOString()}] SUCCESS: /${commandName} | User: ${userName} (${userId}) | Time: ${executionTime}ms`);
            }
        } catch (error) {
            // Log command error with details
            console.error(`[${new Date().toISOString()}] ERROR: /${commandName} | User: ${interaction.user.tag} (${interaction.user.id}) | Error: ${error.message}`);
            // logger.error(`Error executing command ${commandName}:`, error);
            throw error;
        }
    }

    /**
     * Try to get command result from cache
     * @param {string} commandName - The command name
     * @param {Interaction} interaction - The interaction
     * @returns {Promise<boolean>} - Whether we got a cache hit
     */
    async tryGetFromCache(commandName, interaction) {
        const command = this.client.commands.get(commandName);
        
        // Skip cache if:
        // 1. Command is not in cacheable list
        // 2. Command has neverCache property set to true
        // 3. Command has subcommands
        if (!CACHEABLE_COMMANDS.includes(commandName) || 
            command.neverCache === true || 
            interaction.options.getSubcommand(false) !== null) {
            return false;
        }

        // For commands that work with caching
        // Create a cache key based on the command and its options
        let cacheKey = buildCacheKey(interaction);
        
        // For user-specific commands, add user ID to cache key
        if (['whois'].includes(commandName)) {
            cacheKey += `:${interaction.user.id}`;
        }

        try {
            // Try to get cached result
            const cachedResult = commandCacheManager.getCommandCache(commandName, cacheKey);
            
            if (cachedResult) {
                // If we have a cached result, use it instead of executing the command
                if (typeof cachedResult === 'string') {
                    await interaction.reply({
                        content: `${cachedResult} ⚡`,
                        ephemeral: getEphemeralFlag(cachedResult)
                    });
                } else if (cachedResult.embeds) {
                    // For embed results
                    await interaction.reply({
                        embeds: cachedResult.embeds,
                        files: cachedResult.files || [],
                        components: cachedResult.components || [],
                        ephemeral: cachedResult.ephemeral
                    });
                } else if (cachedResult.content) {
                    // For content-only results
                    await interaction.reply({
                        content: `${cachedResult.content} ⚡`,
                        ephemeral: cachedResult.ephemeral
                    });
                }
                
                // Log cache hit
                // cleanLogger.debug(`Cache hit for command /${commandName} with key ${cacheKey}`);
                return true;
            }
            
            // No cache hit, execute command normally
            // cleanLogger.debug(`Cache miss for command /${commandName} with key ${cacheKey}`);
            return false;
        } catch (error) {
            // If there's any error with caching, just execute the command normally
            // cleanLogger.error(`Error in command cache for /${commandName}:`, error);
            return false;
        }
    }
}

/**
 * Helper to build a cache key from an interaction
 * @param {Interaction} interaction - The interaction
 * @returns {string} - The cache key
 */
function buildCacheKey(interaction) {
    const options = interaction.options;
    
    // Start with a base key
    let key = 'base';
    
    // Add subcommand if present
    const subcommand = options.getSubcommand(false);
    if (subcommand) {
        key += `:${subcommand}`;
    }
    
    // Add major options that would change the result
    // List of common option keys that affect command output
    const optionKeys = ['color', 'breed', 'action', 'user', 'query', 'category'];
    
    for (const optionKey of optionKeys) {
        try {
            // Try to get string option first - most common
            const stringValue = options.getString(optionKey, false);
            if (stringValue !== null) {
                key += `:${optionKey}=${stringValue}`;
                continue; // Skip to next option key
            }
            
            // Try other option types one by one
            const numberValue = options.getNumber(optionKey, false);
            if (numberValue !== null) {
                key += `:${optionKey}=${numberValue}`;
                continue;
            }
            
            const integerValue = options.getInteger(optionKey, false);
            if (integerValue !== null) {
                key += `:${optionKey}=${integerValue}`;
                continue;
            }
            
            const booleanValue = options.getBoolean(optionKey, false);
            if (booleanValue !== null) {
                key += `:${optionKey}=${booleanValue}`;
                continue;
            }
            
            // Handle user option separately - ONLY if we know it's a user type
            // This should only be attempted for options that are actually user types
            if (optionKey === 'user') {
                const user = options.getUser(optionKey, false);
                if (user) {
                    key += `:${optionKey}=${user.id}`;
                }
            }
        } catch (error) {
            // Silently ignore errors from trying to get option with wrong type
            // cleanLogger.debug(`Error getting option ${optionKey} for cache key: ${error.message}`);
        }
    }
    
    return key;
}

/**
 * Helper to determine if response should be ephemeral
 * @param {string} content - The content to check
 * @returns {boolean} - Whether it should be ephemeral
 */
function getEphemeralFlag(content) {
    // Typically error messages should be ephemeral
    return content.includes('error') || content.includes('Error') || content.includes('❌');
}

/**
 * Helper function to get TTL for a command
 * @param {string} commandName - The command name
 * @returns {number} - The TTL in milliseconds
 */
function getTtlForCommand(commandName) {
    // Different TTLs based on how frequently the data changes
    switch (commandName) {
        case 'hex':
            return 7 * 24 * 60 * 60 * 1000; // 7 days - colors never change
        case 'help':
            return 24 * 60 * 60 * 1000; // 1 day - help content rarely changes
        case 'serverinfo':
            return 30 * 60 * 1000; // 30 minutes - server stats change regularly  
        case 'whois':
            return 60 * 60 * 1000; // 1 hour - user info changes occasionally
        case 'cat':
        case 'dog':
            return 3 * 60 * 60 * 1000; // 3 hours - external API data
        case 'lofi':
            return 60 * 60 * 1000; // 1 hour - audio stream info
        default:
            return 60 * 60 * 1000; // 1 hour default
    }
}

module.exports = CommandHandler;
