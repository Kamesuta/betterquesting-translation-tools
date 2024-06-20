const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { TRANSLATABLE_KEYS, JOINT_CHARACTERS } = require('./settings');
const { readCSV, writeCSV, hashFilePath, readJSON, exploreTree, processDirectory } = require('./common');

/**
 * Merges multiple CSV files into one
 * @param {string} jsonInputPath Path to the input JSON directory or file
 * @param {Array<string>} inputCsvPaths Array of input CSV file paths
 * @param {string} outputCsvPath Path to the output CSV file
 */
function mergeLangFiles(jsonInputPath, inputCsvPaths, outputCsvPath) {
    const jsonKeyMap = {};

    // Build JSON key map from input JSON files
    const stats = fs.statSync(jsonInputPath);
    if (stats.isDirectory()) {
        processDirectory(jsonInputPath, (relativePath, fullPath) => {
            if (path.extname(fullPath) === '.json') {
                const jsonData = readJSON(fullPath);
                exploreTree(jsonData, fullPath, (node, key, value, newPath) => {
                    const hashedKey = hashFilePath(newPath);
                    jsonKeyMap[hashedKey] = newPath;
                });
            }
        });
    } else if (stats.isFile() && path.extname(jsonInputPath) === '.json') {
        const jsonData = readJSON(jsonInputPath);
        exploreTree(jsonData, jsonInputPath, (node, key, value, newPath) => {
            const hashedKey = hashFilePath(newPath);
            jsonKeyMap[hashedKey] = newPath;
        });
    } else {
        console.error('Invalid input JSON path. Must be a directory or a JSON file.');
        process.exit(1);
    }

    const primaryCsvPath = inputCsvPaths.shift(); // The first CSV
    const primaryCsvData = readCSV(primaryCsvPath);
    const additionalCsvData = inputCsvPaths.map(readCSV);

    // Process the primary CSV
    primaryCsvData.forEach(row => {
        const [hashedPath, hashedTranslationKey, value] = row;
        const originalKey = jsonKeyMap[hashedTranslationKey] || hashedTranslationKey;

        // Get the join character for the key
        const endDelimiter = TRANSLATABLE_KEYS.find(key => originalKey.endsWith(key));
        const joinCharacter = JOINT_CHARACTERS[endDelimiter] || ' ';

        // Get row from the additional CSV files
        const additionalRows = additionalCsvData.flatMap(csvData => csvData.filter(row => row[0] === hashedPath && row[1] === hashedTranslationKey));
        const additionalValues = additionalRows.map(row => row[2]);

        // Combine the values
        const combinedValue = [value, ...additionalValues].join(joinCharacter);
        row[2] = combinedValue;
    });

    writeCSV(outputCsvPath, primaryCsvData);
}

// Get paths from command line arguments
const [outputCsvPath, jsonInputPath, ...inputCsvPaths] = process.argv.slice(2);

if (!outputCsvPath || !jsonInputPath || inputCsvPaths.length === 0) {
    console.error('Usage: node mergeLangFile.js <path to output CSV file> <path to input JSON directory or file> <paths to input CSV files>');
    process.exit(1);
}

mergeLangFiles(jsonInputPath, inputCsvPaths, outputCsvPath);
