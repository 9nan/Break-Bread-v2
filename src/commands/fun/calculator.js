const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

class Calculator {
    constructor(interaction) {
        this.interaction = interaction;
        this.currentDisplay = '';
    }

    createButton(customId, label, style = ButtonStyle.Secondary) {
        return new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(style);
    }

    createEmbed() {
        return {
            color: 0x0099FF,
            title: 'Calculator',
            description: this.currentDisplay || '0',
            footer: {
                text: `Requested by ${this.interaction.user.tag}`
            }
        };
    }

    createButtons() {
        const row1 = new ActionRowBuilder().addComponents(
            this.createButton('calc_7', '7'),
            this.createButton('calc_8', '8'),
            this.createButton('calc_9', '9'),
            this.createButton('calc_/', '÷', ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            this.createButton('calc_4', '4'),
            this.createButton('calc_5', '5'),
            this.createButton('calc_6', '6'),
            this.createButton('calc_*', '×', ButtonStyle.Primary)
        );

        const row3 = new ActionRowBuilder().addComponents(
            this.createButton('calc_1', '1'),
            this.createButton('calc_2', '2'),
            this.createButton('calc_3', '3'),
            this.createButton('calc_-', '-', ButtonStyle.Primary)
        );

        const row4 = new ActionRowBuilder().addComponents(
            this.createButton('calc_c', 'C', ButtonStyle.Danger),
            this.createButton('calc_0', '0'),
            this.createButton('calc_=', '=', ButtonStyle.Success),
            this.createButton('calc_+', '+', ButtonStyle.Primary)
        );

        return [row1, row2, row3, row4];
    }

    async handleButtonClick(button) {
        const value = button.customId.replace('calc_', '');

        switch (value) {
            case 'c':
                this.currentDisplay = '';
                break;
            case '=':
                try {
                    // Replace × with * and ÷ with /
                    const expression = this.currentDisplay.replace(/×/g, '*').replace(/÷/g, '/');
                    this.currentDisplay = eval(expression).toString();
                } catch {
                    this.currentDisplay = 'Error';
                }
                break;
            default:
                this.currentDisplay += value;
        }

        await button.update({
            embeds: [this.createEmbed()],
            components: this.createButtons()
        });
    }

    async initialize() {
        await this.interaction.deferReply();
        const message = await this.interaction.editReply({
            embeds: [this.createEmbed()],
            components: this.createButtons(),
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000,
            filter: i => i.user.id === this.interaction.user.id
        });

        collector.on('collect', button => this.handleButtonClick(button));

        collector.on('end', () => {
            message.edit({
                components: [],
                content: 'Calculator session ended.'
            }).catch(console.error);
        });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculator')
        .setDescription('Open an interactive calculator'),

    async execute(interaction) {
        const calculator = new Calculator(interaction);
        await calculator.initialize();
    }
};
