# BreakBread Discord Bot

<div align="center">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org)
  [![Node.js](https://img.shields.io/badge/Node.js->=23-green.svg)](https://nodejs.org)
  
  **A powerful, feature-rich Discord bot for server management, entertainment, and community engagement.**
  
</div>

## 📋 Overview

BreakBread is a versatile Discord bot designed to enhance your server experience with comprehensive moderation tools and entertaining commands. Built with Discord.js v14, BreakBread offers a seamless and reliable experience for server administrators and users alike.

## ✨ Features

### 🛡️ Moderation System
- **User Management**: Ban, kick, mute, warn, timeout with customizable durations
- **Message Control**: Clear chat, slowmode, lock/unlock channels
- **Role Management**: Add/remove roles, change nicknames
- **Anti-Spam Protection**: Smart cooldown system for commands

### 🎮 Fun & Entertainment
- **Interactive Games**: Rock Paper Scissors, calculator, and more
- **Random Content**: Cat images, dog images, advice, and other amusing commands
- **Visual Elements**: Color visualization with hex command
- **Music Features**: Lofi stream for ambient music in voice channels

### 🔧 Utility Tools
- **Server Information**: Statistics and details about your Discord server
- **User Information**: Profile details with the whois command
- **Help System**: Comprehensive command documentation for users

## 📥 Installation

### Prerequisites
- Node.js 23 or higher
- Discord Bot Token ([Create a bot here](https://discord.com/developers/applications))
- Basic knowledge of Discord bot hosting

### Setup Steps
1. Clone the repository
   ```bash
   https://github.com/9nan/Break-Bread-v2
   cd Break-Bread-v2
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   Create a `.env` file in the root directory with the following content:
   ```
   # Discord Bot Configuration
   TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_client_id_here
   CLIENT_SECRET=your_client_secret_here
   APPLICATION_ID=your_application_id_here
   PUBLIC_KEY=your_public_key_here
   
   # YouTube API Key (for music features)
   YoutubeAPIKey=your_youtube_api_key_here
   
   # Bot Owner User ID
   USER_ID=your_user_id_here
   
   # Guild ID (optional, for testing)
   GUILD_ID=your_guild_id_here
   
   # Logging level (none, error, warn, info, debug)
   LOG_LEVEL=info
   ```

4. Start the bot
   ```bash
   node index.js
   ```

## 🤖 Commands

BreakBread uses Discord's slash command system for intuitive interaction.

### Moderation Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `/ban` | Ban a user from the server | `/ban user:@user reason:optional_reason` |
| `/kick` | Kick a user from the server | `/kick user:@user reason:optional_reason` |
| `/mute` | Mute a user for a specified duration | `/mute user:@user duration:time` |
| `/unmute` | Remove a mute from a user | `/unmute user:@user` |
| `/timeout` | Timeout a user for a specified duration | `/timeout user:@user duration:time` |
| `/untimeout` | Remove a timeout from a user | `/untimeout user:@user` |
| `/warn` | Issue a warning to a user | `/warn user:@user reason:reason` |
| `/purge` | Delete multiple messages at once | `/purge amount:number` |
| `/lock` | Lock a channel | `/lock` |
| `/unlock` | Unlock a channel | `/unlock` |
| `/slowmode` | Set slowmode for a channel | `/slowmode seconds:number` |
| `/role` | Add or remove a role from a user | `/role user:@user role:@role` |
| `/nick` | Change a user's nickname | `/nick user:@user nickname:text` |
| `/softban` | Ban and immediately unban to clear messages | `/softban user:@user` |

### Fun Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `/hex` | Generate a color image from a hex code | `/hex color:#FF5733` |
| `/rps` | Play rock paper scissors | `/rps` |
| `/calculator` | Open an interactive calculator | `/calculator` |
| `/cat` | Get a random cat image | `/cat` |
| `/dog` | Get a random dog image | `/dog` |
| `/advice` | Get random life advice | `/advice` |

### Music Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `/lofi` | Play lofi music in a voice channel | `/lofi` |

### Utility Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `/help` | Shows all available commands | `/help` |
| `/serverinfo` | Get information about the server | `/serverinfo` |
| `/whois` | Get detailed information about a user | `/whois user:@user` |

## 🛠️ Development


### Performance Optimizations
- **Command Caching**: Frequently used commands use smart caching for faster responses
- **Anti-Spam Protection**: Commands have cooldowns to prevent abuse
- **Server-wide Cooldowns**: High-impact commands have server-wide cooldowns

### Project Structure
```
breakbread/
├── src/
│   ├── commands/       # Command files organized by category
│   │   ├── admin/      # Admin commands
│   │   ├── contexts/   # Context menu commands
│   │   ├── fun/        # Entertainment commands
│   │   ├── general/    # General purpose commands
│   │   ├── moderation/ # Moderation commands
│   │   ├── music/      # Music-related commands
│   │   └── utility/    # Utility commands
│   ├── events/         # Event handlers
│   ├── handlers/       # Command and event handlers
│   ├── utils/          # Utility functions
│   ├── components/     # UI components
│   └── database/       # JSON database files
├── config.js           # Bot configuration
├── index.js            # Main bot file
├── .env                # Environment variables
└── package.json        # Dependencies and scripts
```

## 📄 License

This project is licensed under the MIT License.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⚠️ Important Configuration Notes

### Environment Variables Setup
1. **Token Security**: Never hardcode your Discord bot token in any file. Always use environment variables.
2. Copy the `.env.example` file to `.env` and fill in your actual token values.

### Anti-Spam System

BreakBread has a comprehensive anti-spam system to prevent command abuse:

1. **Command-specific Cooldowns**: Commands have individual cooldown periods
2. **Server-wide Cooldowns**: High-impact commands (like purge, ban, kick) have server-wide cooldowns
3. **Detailed Logging**: All blocked spam attempts are logged for monitoring

### Command Cooldowns
The following commands have specific cooldowns to prevent spam:
- Fun commands: advice (10s), cat (15s), dog (15s), rps (8s), calculator (10s), hex (8s)
- Moderation commands: purge (20s), ban (10s), kick (10s), timeout (10s), warn (10s)

### Server-wide Cooldowns
Some commands have server-wide cooldowns to prevent coordinated abuse:
- purge: 8 seconds server-wide cooldown
- ban: 5 seconds server-wide cooldown
- kick: 5 seconds server-wide cooldown

## Troubleshooting

If you're encountering issues:

1. Check your `.env` file is properly configured
2. Verify your Discord bot has the required permissions and intents
3. Look for error messages in the console (try setting `LOG_LEVEL=debug` for more details)
4. Make sure your Node.js version is compatible (Node.js 23+ recommended)

---

<div align="center">
  Made with ❤️ by itznan
  Discord itz._.nan_
</div> 
