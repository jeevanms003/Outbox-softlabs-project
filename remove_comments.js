const fs = require('fs');
const path = require('path');

function removeComments(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove block comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove line comments (but carefully avoid URLs like http://)
    content = content.replace(/([^:]|^)\/\/.*/g, '');
    fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        if (file === 'node_modules' || file === '.next' || file === '.git') continue;
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.prisma')) {
            removeComments(fullPath);
        }
    }
}

processDirectory(path.join(__dirname, 'backend'));
processDirectory(path.join(__dirname, 'frontend'));
