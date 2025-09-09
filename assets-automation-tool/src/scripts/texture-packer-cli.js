const { execSync } = require('child_process');
const path = require('path');
const { logger } = require('../utils/logger');
const readline = require('readline');

class TexturePackerCLI {
    constructor(existingRl = null) {
        // If an existing readline interface is passed, use it; otherwise create a new one
        this.rl = existingRl || readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
            removeHistoryDuplicates: true
        });
        this.shouldCloseRl = !existingRl; // Only close readline interface if we created it ourselves
        this.vpnConnected = false;
    }

    /**
     * Mock VPN connection (always fails)
     */
    async connectToVPN() {
        logger.error('❌❌ VPN connection failed ❌❌');
        logger.warn('📱 This feature requires Google Authenticator verification');
        logger.info('🚫 VPN connection function is currently disabled');
        logger.info('💬 For texture-packer support, please contact RD team');
        await this.delay(1000);
        this.vpnConnected = false;
        return false;
    }

    /**
     * Execute texture packing
     */
    async executePackImages() {
        try {
            logger.info('📦 Starting texture packing...');
            
            const graphicsDir = path.resolve(__dirname, '../../../graphics');
            process.chdir(graphicsDir);
            
            logger.info('📥 Installing dependencies...');
            execSync('npm install', { stdio: 'inherit' });

            logger.info('🐍 Running pack-resources.py...');
            execSync('python pack-resources.py', { stdio: 'inherit' });
            logger.success('✅ Texture packing completed');

            return true;
        } catch (error) {
            logger.error('❌ Pack failed:', error.message);
            return false;
        }
    }

    /**
     * Main execution flow
     */
    async run() {
        try {
            logger.info('🎨 Welcome to Texture Packer CLI Tool!');
            
            let shouldContinue = true;
            
            while (shouldContinue) {
                logger.info('\n📋 Available operations:');
                logger.info('   1. Full workflow (VPN + Pack)');
                logger.info('   2. Pack textures (if VPN is connected, it will work!)');
                logger.info('   3. Connect VPN (mock) - requires Google Authenticator verification, please contact RD team');
                logger.info('   4. Exit');

                const choice = await this.askSelect(
                    'Please select operation (1-4): ', 
                    ['1', '2', '3', '4']
                );

                switch (choice) {
                    case '1':
                        await this.connectToVPN();
                        if (!this.vpnConnected) {
                            logger.warn('⚠️ Skipping pack process due to VPN connection failure.');
                            break;
                        }
                        await this.executePackImages();
                        break;
                    case '2':
                        await this.executePackImages();
                        break;
                    case '3':
                        await this.connectToVPN();
                        break;
                    case '4':
                        logger.info('👋 Goodbye!');
                        shouldContinue = false;
                        break;
                }

                if (shouldContinue) {
                    shouldContinue = await this.askYesNo('\nDo you want to perform another operation? (y/N): ');
                }
            }

        } catch (error) {
            logger.error(`❌ Error: ${error.message}`);
        } finally {
            // Only close readline interface if we created it ourselves
            if (this.shouldCloseRl) {
                this.rl.close();
            }
        }
    }

    // Helper methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    askQuestion(question) {
        return new Promise((resolve, reject) => {
            try {
                if (this.rl.closed) {
                    reject(new Error('readline interface is closed'));
                    return;
                }
                this.rl.question(question, (answer) => {
                    resolve(answer.trim());
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async askSelect(question, validOptions) {
        const answer = await this.askQuestion(question);
        if (validOptions.includes(answer)) return answer;
        logger.warn('❌ Invalid input, please try again');
        return await this.askSelect(question, validOptions);
    }

    async askYesNo(question) {
        const answer = await this.askQuestion(question);
        return ['y', 'yes'].includes(answer.toLowerCase());
    }
}

// Main program
async function main() {
    const cli = new TexturePackerCLI();
    await cli.run();
}

// If this file is executed directly
if (require.main === module) {
    main();
}

module.exports = TexturePackerCLI;