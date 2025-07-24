const { readFile, writeFile } = require('../utils/common');
const { logger } = require('../utils/logger');
const PROJECT_PATHS = require('../utils/paths');

class ConfigManager {
    constructor(configPath = null) {
        this.configPath = configPath || PROJECT_PATHS.CONFIG.CONFIG_FILE;
        this.config = null;
    }

    async loadConfig() {
        try {
            const data = await readFile(this.configPath, 'utf8');
            this.config = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Configuration file not found: ${this.configPath}. Please create config.json first.`);
            } else {
                throw new Error(`Configuration file format error: ${error.message}`);
            }
        }
        
        return this.config;
    }

    async saveConfig(config = null) {
        const configToSave = config || this.config;
        if (!configToSave) {
            throw new Error('No config to save');
        }
        
        try {
            await writeFile(this.configPath, JSON.stringify(configToSave, null, 4), 'utf8');
        } catch (error) {
            throw new Error(`Cannot save configuration file: ${error.message}`);
        }
    }

    static async createInstance(configPath = null) {
        const manager = new ConfigManager(configPath);
        await manager.loadConfig();
        return manager;
    }

    askQuestion(question, rl) {
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    async askValidatedQuestion(question, validator, errorMessage, rl) {
        while (true) {
            const answer = await this.askQuestion(question, rl);
            
            if (validator(answer)) {
                return answer;
            }
            
            logger.error(errorMessage);
            logger.info('Please try again.');
        }
    }
}

module.exports = ConfigManager; 