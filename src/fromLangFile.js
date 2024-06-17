const fs = require('fs');
const path = require('path');
const { processDirectory, exploreTree, readCSV, writeJSON } = require('./common');
const TRANSLATABLE_KEYS = require('./settings');

/**
 * Merges translated CSV data with the original JSON files and applies the translations
 * @param {string} inputJsonDir The directory containing original JSON files
 * @param {string} csvFilePath Path to the translated CSV file
 * @param {string} outputJsonDir Path to the output directory for translated JSON files
 */
function fromLangFile(inputJsonDir, csvFilePath, outputJsonDir) {
    const translatedRows = readCSV(csvFilePath);
    const translatedDataMap = {};

    // Parse the CSV data and map translatable keys and values
    translatedRows.forEach(row => {
        const key = row[0] + ' ' + row[1];
        const value = row[2];
        translatedDataMap[key] = value;
    });

    /**
     * Applies translations to JSON data
     * @param {Object} jsonData JSON data
     * @param {string} hashedPath Hashed file path
     */
    function applyTranslation(jsonData, hashedPath) {
        exploreTree(jsonData, hashedPath, (node, key, value, newPath) => {
            const translationKey = `${hashedPath} https://${newPath}`;
            if (translatedDataMap.hasOwnProperty(translationKey)) {
                node[key] = translatedDataMap[translationKey].replace(/\[(§[0-9a-f§])\]/g, '$1').replace(/\\n/g, '\n');
            } else {
                console.log(`No translation found for key: ${translationKey}`);
            }
        });
    }

    /**
     * Processes each JSON file to apply translations
     * @param {Object} jsonData JSON data
     * @param {string} hashedPath Hashed file path
     * @param {string} relativePath Relative file path
     * @param {string} fullPath Full file path
     */
    function processFile(jsonData, hashedPath, relativePath, fullPath) {
        applyTranslation(jsonData, hashedPath);
        const outputJsonPath = path.join(outputJsonDir, relativePath);
        const outputJsonDirPath = path.dirname(outputJsonPath);
        if (!fs.existsSync(outputJsonDirPath)) {
            fs.mkdirSync(outputJsonDirPath, { recursive: true });
        }
        writeJSON(outputJsonPath, jsonData);
    }

    processDirectory(inputJsonDir, processFile);
}

// Get directory paths from command line arguments
const [inputJsonDir, csvFilePath, outputJsonDir] = process.argv.slice(2);

if (!inputJsonDir || !csvFilePath || !outputJsonDir) {
    console.error('Usage: node fromLangFile.js <path to input JSON directory> <path to input CSV file> <path to output JSON directory>');
    process.exit(1);
}

if (!fs.existsSync(outputJsonDir)) {
    fs.mkdirSync(outputJsonDir);
}

fromLangFile(inputJsonDir, csvFilePath, outputJsonDir);
