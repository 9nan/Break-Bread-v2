/**
 * Bot initialization utility functions
 * Created by itznan 2025
 * created by Itznan 
 * Discord = itz._.nan_
 */

const voiceManager = require('./voiceManager');

class Initializer {
    constructor(client, commandHandler, eventHandler) {
        this.client = client;
        this.commandHandler = commandHandler;
        this.eventHandler = eventHandler;
    }

    async init() {
        try {
            // Load commands and register them
            await this.commandHandler.loadCommands();
            await this.commandHandler.registerCommands();
            
            // Load events
            await this.eventHandler.loadEvents();
            
            console.log('Successfully initialized bot systems');
            
            // Setup process handlers
            this.setupProcessHandlers();
            
            // Login to Discord
            await this.client.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            console.error('Error during initialization:', error);
            process.exit(1);
        }
    }

    setupProcessHandlers() {
        process.on('SIGINT', () => this.handleShutdown('SIGINT'));
        process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
        
        // Handle unhandled rejections
        process.on('unhandledRejection', (error) => {
            console.error('Unhandled promise rejection:', error);
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
            this.handleShutdown('UNCAUGHT_EXCEPTION');
        });
    }

    handleShutdown(signal) {
        console.log(`Received ${signal}. Cleaning up...`);
        voiceManager.cleanup();
        process.exit(0);
    }
}

module.exports = Initializer;
