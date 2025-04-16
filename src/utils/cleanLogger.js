/**
 * Simple, clean logging utility.
 * Provides consistent logging format with timestamp and level highlighting.
 * created by Itznan 
 * Discord = itz._.nan_
 */

const COLORS = {
    DEBUG: '\x1b[34m', // Blue
    INFO: '\x1b[32m',  // Green
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
    RESET: '\x1b[0m'   // Reset
};

class CleanLogger {
    debug(message, ...args) {
        this.log('DEBUG', message, ...args);
    }

    info(message, ...args) {
        this.log('INFO', message, ...args);
    }

    warn(message, ...args) {
        this.log('WARN', message, ...args);
    }

    error(message, ...args) {
        this.log('ERROR', message, ...args);
    }

    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const color = COLORS[level] || COLORS.RESET;
        
        // Format the message
        console.log(`${color}[${level}]${COLORS.RESET} ${timestamp} ${message}`);
        
        // Log additional args if they exist
        if (args.length > 0) {
            args.forEach(arg => {
                if (arg instanceof Error) {
                    console.log(`${color}[${level}]${COLORS.RESET} ${arg.stack || arg.message}`);
                } else if (typeof arg === 'object') {
                    console.log(`${color}[${level}]${COLORS.RESET}`, arg);
                } else {
                    console.log(`${color}[${level}]${COLORS.RESET} ${arg}`);
                }
            });
        }
    }
}

module.exports = new CleanLogger(); 