/**
 * Component handler for managing and loading interactive components
 * Created for the BreakBread bot
 */
//created by Itznan 
// Discord = itz._.nan_

const fs = require('fs').promises;
const path = require('path');
const { Collection, MessageFlags } = require('discord.js');
const { convertEphemeralToFlags } = require('../utils/ephemeralHelper');
// const logger = require('../utils/cleanLogger');

class ComponentHandler {
    constructor(client) {
        this.client = client;
        this.buttons = new Collection();
        this.selectMenus = new Collection();
        this.modals = new Collection();
        
        // Add collections to client for easy access
        this.client.buttons = this.buttons;
        this.client.selectMenus = this.selectMenus;
        this.client.modals = this.modals;
    }

    /**
     * Load all components from their respective directories
     */
    async loadComponents() {
        try {
            // Load buttons
            await this.#loadComponentsOfType('buttons', this.buttons);
            // logger.info(`Loaded ${this.buttons.size} buttons.`);
            
            // Load select menus
            await this.#loadComponentsOfType('select-menus', this.selectMenus);
            // logger.info(`Loaded ${this.selectMenus.size} select menus.`);
            
            // Load modals
            await this.#loadComponentsOfType('modals', this.modals);
            // logger.info(`Loaded ${this.modals.size} modals.`);
            
        } catch (error) {
            // logger.error('Error loading components:', error);
            throw error;
        }
    }

    /**
     * Private method to load components of a specific type
     * @param {string} type - Type of component (buttons, select-menus, modals)
     * @param {Collection} collection - Collection to store components in
     */
    async #loadComponentsOfType(type, collection) {
        const componentsPath = path.join(__dirname, '..', 'components', type);
        
        try {
            // Check if directory exists and log the path we're checking
            // logger.debug(`Checking for components in: ${componentsPath}`);
            
            try {
                // Check if directory exists
                await fs.access(componentsPath);
                // logger.debug(`Directory exists: ${componentsPath}`);
            } catch (accessError) {
                if (accessError.code === 'ENOENT') {
                    // logger.warn(`Directory does not exist: ${componentsPath}`);
                    
                    // Try to create the missing directory structure
                    try {
                        await fs.mkdir(path.join(__dirname, '..', 'components'), { recursive: true });
                        await fs.mkdir(componentsPath, { recursive: true });
                        // logger.info(`Created missing component directory: ${componentsPath}`);
                    } catch (mkdirError) {
                        // logger.error(`Failed to create component directory: ${componentsPath}`, mkdirError);
                    }
                    
                    return;
                }
                throw accessError;
            }
            
            const componentFiles = (await fs.readdir(componentsPath))
                .filter(file => file.endsWith('.js'));
            
            // logger.debug(`Found ${componentFiles.length} ${type} files`);
            
            for (const file of componentFiles) {
                const filePath = path.join(componentsPath, file);
                // logger.debug(`Loading component: ${filePath}`);
                
                const component = require(filePath);
                
                if (component.id && component.execute) {
                    collection.set(component.id, component);
                    // logger.debug(`Successfully loaded ${type} component: ${component.id}`);
                } else {
                    // logger.warn(`The component at ${filePath} is missing required "id" or "execute" property.`);
                }
            }
        } catch (error) {
            // If directory doesn't exist, just log and continue
            if (error.code === 'ENOENT') {
                // logger.warn(`No ${type} directory found at ${componentsPath}. Creating it...`);
                try {
                    // Create the directory structure
                    await fs.mkdir(path.join(__dirname, '..', 'components'), { recursive: true });
                    await fs.mkdir(componentsPath, { recursive: true });
                    // logger.info(`Created ${type} directory: ${componentsPath}`);
                } catch (mkdirError) {
                    // logger.error(`Failed to create ${type} directory:`, mkdirError);
                }
                return;
            }
            // logger.error(`Error loading ${type} components:`, error);
            throw error;
        }
    }

    /**
     * Handle button interactions
     * @param {import('discord.js').ButtonInteraction} interaction 
     */
    async handleButton(interaction) {
        const button = this.buttons.get(interaction.customId);
        
        if (!button) {
            // logger.warn(`No button found with ID: ${interaction.customId}`);
            return;
        }
        
        try {
            await button.execute(interaction);
        } catch (error) {
            // logger.error(`Error executing button ${interaction.customId}:`, error);
            this.#handleInteractionError(interaction);
        }
    }

    /**
     * Handle select menu interactions
     * @param {import('discord.js').SelectMenuInteraction} interaction 
     */
    async handleSelectMenu(interaction) {
        const selectMenu = this.selectMenus.get(interaction.customId);
        
        if (!selectMenu) {
            // logger.warn(`No select menu found with ID: ${interaction.customId}`);
            return;
        }
        
        try {
            await selectMenu.execute(interaction);
        } catch (error) {
            // logger.error(`Error executing select menu ${interaction.customId}:`, error);
            this.#handleInteractionError(interaction);
        }
    }

    /**
     * Handle modal submit interactions
     * @param {import('discord.js').ModalSubmitInteraction} interaction 
     */
    async handleModal(interaction) {
        const modal = this.modals.get(interaction.customId);
        
        if (!modal) {
            // logger.warn(`No modal found with ID: ${interaction.customId}`);
            return;
        }
        
        try {
            await modal.execute(interaction);
        } catch (error) {
            // logger.error(`Error executing modal ${interaction.customId}:`, error);
            this.#handleInteractionError(interaction);
        }
    }

    /**
     * Private method to handle interaction errors
     * @param {import('discord.js').Interaction} interaction 
     */
    async #handleInteractionError(interaction) {
        const errorMessage = {
            content: 'There was an error processing this interaction!',
            flags: MessageFlags.Ephemeral
        };
        
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (followUpError) {
            // logger.error('Error sending interaction error message:', followUpError);
        }
    }
}

module.exports = ComponentHandler; 