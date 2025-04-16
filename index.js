/**
 * Main bot initialization file
 * Created by itznan 2025
 * Discord = itz._.nan_
 */

// Patch setTimeout to prevent negative timeout values that cause warnings
// This fixes an issue in the @discordjs/voice library
const originalSetTimeout = setTimeout;
global.setTimeout = function(fn, timeout, ...args) {
  if (timeout < 0) {
    // Fix negative timeout value - common in @discordjs/voice
    timeout = 1;
  }
  return originalSetTimeout(fn, timeout, ...args);
};

// Simple console logger
global.logger = {
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  info: (...args) => console.log('[INFO]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args)
};

// Load environment variables before importing config
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import modules after environment variables are loaded
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const config = require('./config');
const CommandHandler = require('./src/handlers/commandHandler');
const EventHandler = require('./src/handlers/eventHandler');
const ComponentHandler = require('./src/handlers/componentHandler');

// Connection retry settings
const MAX_RETRY_COUNT = 5;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds
let retryCount = 0;
let retryDelay = INITIAL_RETRY_DELAY;

// Validate token before setup
if (!config.token) {
  logger.error('No Discord bot token found in environment variables or config. Bot cannot start.');
  logger.error('Please make sure your .env file contains a valid TOKEN entry.');
  process.exit(1);
}

// Setup client with all necessary intents for v14
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ],
    allowedMentions: { 
        parse: ['users', 'roles'],
        repliedUser: true
    },
    // Enhanced WebSocket configuration
    rest: {
        timeout: 60000, // Increase timeout to 60 seconds
        retries: 3 // Allow 3 retries for REST API calls
    },
    ws: {
        large_threshold: 50, // Reduce memory usage
        compress: true, // Enable gateway compression
        properties: {
            browser: 'Discord iOS' // Sometimes mobile clients get better stability
        }
    },
    failIfNotExists: false,
    shards: 'auto'
});

// Add collections to the client
client.commands = new Collection();
client.cooldowns = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.selectMenus = new Collection();

// Initialize handlers
const commandHandler = new CommandHandler(client);
const eventHandler = new EventHandler(client);
const componentHandler = new ComponentHandler(client);

// Store handlers on client for access in events
client.commandHandler = commandHandler;
client.componentHandler = componentHandler;

// Error handling
process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection:', error);
    
    // Check if it's a connection timeout error
    if (error.message && (
        error.message.includes('timeout') || 
        error.message.includes('Opening handshake has timed out') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')
    )) {
        handleConnectionError(error);
    }
});

client.on('error', error => {
    logger.error('Discord client error:', error);
    
    if (error.message && (
        error.message.includes('timeout') || 
        error.message.includes('WebSocket') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')
    )) {
        handleConnectionError(error);
    }
});

// Handle WebSocket connection issues
function handleConnectionError(error) {
    if (retryCount < MAX_RETRY_COUNT) {
        retryCount++;
        logger.warn(`Connection attempt ${retryCount}/${MAX_RETRY_COUNT} failed. Retrying in ${retryDelay/1000} seconds...`);
        
        // Implement exponential backoff
        setTimeout(() => {
            logger.info(`Attempting to reconnect (attempt ${retryCount}/${MAX_RETRY_COUNT})...`);
            initialize().catch(err => {
                logger.error('Reconnection attempt failed:', err);
                // Double the retry delay for exponential backoff, up to 5 minutes max
                retryDelay = Math.min(retryDelay * 2, 300000);
                handleConnectionError(err);
            });
        }, retryDelay);
    } else {
        logger.error(`Failed to connect after ${MAX_RETRY_COUNT} attempts. Please check your internet connection and Discord API status.`);
        process.exit(1);
    }
}

// WebSocket and connection event listeners
client.on('disconnect', (event) => {
    logger.warn(`Bot disconnected from Discord with code ${event.code}. Reason: ${event.reason}`);
});

client.on('reconnecting', () => {
    logger.warn('Bot is attempting to reconnect to Discord...');
});

client.on('resume', (replayed) => {
    logger.info(`Bot reconnected! ${replayed} events were replayed.`);
    // Reset retry counter on successful reconnection
    retryCount = 0;
    retryDelay = INITIAL_RETRY_DELAY;
});

async function initialize() {
    try {
        logger.info('Starting bot initialization...');
        
        // Load commands, events, and components
        logger.debug('Loading commands...');
        await commandHandler.loadCommands();
        
        logger.debug('Loading events...');
        await eventHandler.loadEvents();
        
        logger.debug('Loading components...');
        await componentHandler.loadComponents();
        
        // Login to Discord
        logger.debug('Attempting to login to Discord...');
        await client.login(config.token);
        logger.debug('Login successful!');

        // Register commands after login
        logger.debug('Registering application commands...');
        await commandHandler.registerCommands();
        
        logger.info(`Bot initialization complete.`);
        
        // Reset retry counter on successful initialization
        retryCount = 0;
        retryDelay = INITIAL_RETRY_DELAY;

    } catch (error) {
        logger.error('Error during initialization:', error);
        
        // Check if it's a connection or authentication error
        if (error.message && (
            error.message.includes('timeout') || 
            error.message.includes('TOKEN_INVALID') ||
            error.message.includes('DISALLOWED_INTENTS') ||
            error.message.includes('Opening handshake has timed out')
        )) {
            handleConnectionError(error);
        } else {
            process.exit(1);
        }
    }
}

// Start the bot
initialize().then(() => {
    console.log('Bot started successfully');
}).catch(error => {
    logger.error('Failed to initialize the bot:', error);
    process.exit(1);
});