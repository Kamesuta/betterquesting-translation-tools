const { processDirectory, exploreTree, writeCSV } = require('./common');

/**
 * Converts translatable data in JSON files to a single CSV file
 * @param {string} inputDir The directory containing JSON files
 * @param {string} csvFilePath Path to the output CSV file
 */
function toLangFile(inputDir, csvFilePath) {
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
            rows.push([hashedPath, `https://${newPath}`, replacedValue]);
        });
    }

    processDirectory(inputDir, processFile);
    writeCSV(csvFilePath, rows);
}

// Get directory paths from command line arguments
const [inputDir, csvFilePath] = process.argv.slice(2);

if (!inputDir || !csvFilePath) {
    console.error('Usage: node toLangFile.js <path to input directory> <path to output CSV file>');
    process.exit(1);
}

toLangFile(inputDir, csvFilePath);
