const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(__dirname, '../../..');

const PATHS = {
    PROJECT_ROOT,
    REPO_ROOT,
    CONFIG: {
        ROOT: path.join(PROJECT_ROOT, 'config'),
        CONFIG_FILE: path.join(PROJECT_ROOT, 'config', 'config.json'),
        FOLDER_MAPPING: path.join(PROJECT_ROOT, 'config', 'folder-mapping.json'),
        CREDENTIALS: path.join(PROJECT_ROOT, 'config', 'credentials.json'),
    },
    OUTPUT: {
        ROOT: path.join(PROJECT_ROOT, 'output'),
        DOWNLOADS: path.join(PROJECT_ROOT, 'output', 'downloads'),
    },
    SCRIPTS: {
        ROOT: path.join(PROJECT_ROOT, 'src', 'scripts'),
    }
};

module.exports = PATHS; 