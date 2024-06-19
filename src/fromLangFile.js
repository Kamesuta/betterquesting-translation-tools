const fs = require('fs');
const path = require('path');
const { processDirectory, exploreTree, readCSV, writeJSON, hashFilePath, readJSON } = require('./common');

/**
 * Merges translated CSV data with the original JSON files and applies the translations
 * @param {string} inputJsonPath The directory or file containing original JSON files
 * @param {string} csvFilePath Path to the translated CSV file
 * @param {string} outputJsonPath Path to the output directory for translated JSON files
 */
function fromLangFile(inputJsonPath, csvFilePath, outputJsonPath) {
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
            const translationKey = `${hashedPath} ${hashFilePath(newPath)}`;
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
        const outputFilePath = path.join(outputJsonPath, relativePath);
        const outputFileDir = path.dirname(outputFilePath);
        if (!fs.existsSync(outputFileDir)) {
            fs.mkdirSync(outputFileDir, { recursive: true });
        }
        writeJSON(outputFilePath, jsonData);
    }

    /**
     * Copies non-JSON files to the output directory
     * @param {string} relativePath Relative file path
     * @param {string} fullPath Full file path
     */
    function copyFile(relativePath, fullPath) {
        const outputFilePath = path.join(outputJsonPath, relativePath);
        const outputFileDir = path.dirname(outputFilePath);
        if (!fs.existsSync(outputFileDir)) {
            fs.mkdirSync(outputFileDir, { recursive: true });
        }
        fs.copyFileSync(fullPath, outputFilePath);
    }

    /**
     * Processes a file or copies it depending on its extension
     * @param {string} relativePath Relative file path
     * @param {string} fullPath Full file path
     */
    function processFileOrCopy(relativePath, fullPath) {
        if (path.extname(fullPath) === '.json') {
            const jsonData = readJSON(fullPath);
            const hashedPath = hashFilePath(relativePath);
            processFile(jsonData, hashedPath, relativePath, fullPath);
        } else {
            copyFile(relativePath, fullPath);
        }
    }

    const stats = fs.statSync(inputJsonPath);

    if (stats.isDirectory()) {
        processDirectory(inputJsonPath, (relativePath, fullPath) => {
            processFileOrCopy(relativePath, fullPath);
        });
    } else if (stats.isFile()) {
        const relativePath = path.relative(path.dirname(inputJsonPath), inputJsonPath).replace(/\\/g, '/');
        processFileOrCopy(relativePath, inputJsonPath);
    } else {
        console.error('Invalid input path. Must be a directory or a JSON file.');
        process.exit(1);
    }

    console.log(`Translation completed and written to ${outputJsonPath}`);
}

// Get directory or file paths from command line arguments
const [inputJsonPath, csvFilePath, outputJsonPath] = process.argv.slice(2);

if (!inputJsonPath || !csvFilePath || !outputJsonPath) {
    console.error('Usage: node fromLangFile.js <path to input JSON directory or file> <path to input CSV file> <path to output JSON directory>');
    process.exit(1);
}

if (!fs.existsSync(outputJsonPath)) {
    fs.mkdirSync(outputJsonPath);
}

fromLangFile(inputJsonPath, csvFilePath, outputJsonPath);
