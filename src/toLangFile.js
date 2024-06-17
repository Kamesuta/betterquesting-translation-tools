const fs = require('fs');
const path = require('path');
const { processDirectory, exploreTree, writeCSV, hashFilePath } = require('./common');

/**
 * Converts translatable data in JSON files to a single CSV file
 * @param {string} inputPath The directory or file containing JSON files
 * @param {string} csvFilePath Path to the output CSV file
 */
function toLangFile(inputPath, csvFilePath) {
    const rows = [];

    /**
     * Processes each JSON file to extract translatable data
     * @param {Object} jsonData JSON data
     * @param {string} hashedPath Hashed file path
     * @param {string} relativePath Relative file path
     * @param {string} fullPath Full file path
     */
    function processFile(jsonData, hashedPath, relativePath, fullPath) {
        exploreTree(jsonData, hashedPath, (node, key, value, newPath) => {
            const replacedValue = value.replace(/(§[0-9a-f§])/g, '[$1]').replace(/\n/g, '\\n');
            const translationKey = hashFilePath(newPath);
            rows.push([hashedPath, translationKey, replacedValue]);
        });
    }

    const stats = fs.statSync(inputPath);

    if (stats.isDirectory()) {
        processDirectory(inputPath, processFile);
    } else if (stats.isFile() && path.extname(inputPath) === '.json') {
        const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        const relativePath = path.relative(path.dirname(inputPath), inputPath).replace(/\\/g, '/');
        const hashedPath = hashFilePath(relativePath);
        processFile(jsonData, hashedPath, relativePath, inputPath);
    } else {
        console.error('Invalid input path. Must be a directory or a JSON file.');
        process.exit(1);
    }

    writeCSV(csvFilePath, rows);
}

// Get directory or file paths from command line arguments
const [inputPath, csvFilePath] = process.argv.slice(2);

if (!inputPath || !csvFilePath) {
    console.error('Usage: node toLangFile.js <path to input directory or file> <path to output CSV file>');
    process.exit(1);
}

toLangFile(inputPath, csvFilePath);
