const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const TRANSLATABLE_KEYS = require('./settings');

/**
 * Merges translated CSV data with the original JSON data and applies the translation
 * @param {*} jsonData original JSON data
 * @param {Object} translatedDataMap Map of translated data
 * @param {string} filePath Path to the JSON file
 */
function fromLangFile(jsonData, translatedDataMap, filePath) {
    // Recursive function to explore the JSON tree and apply translation data
    function applyTranslation(node, path) {
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const value = node[key];
                const newPath = path ? `${path}.${key}` : key;

                if (typeof value === 'object' && value !== null) {
                    // If the value is an object, recursively apply translation
                    applyTranslation(value, newPath);
                } else if (TRANSLATABLE_KEYS.includes(key)) {
                    // Apply translation data if available
                    const translationKey = `${filePath} https://${newPath}`;
                    if (translatedDataMap.hasOwnProperty(translationKey)) {
                        node[key] = translatedDataMap[translationKey].replace(/\[(§[0-9a-f§])\]/g, '$1').replace(/\\n/g, '\n');
                    } else {
                        console.log(`No translation found for key: ${translationKey}`);
                    }
                }
            }
        }
    }

    // Apply the translation to the JSON data
    applyTranslation(jsonData, '');
}

function hashFilePath(filePath) {
    return `https://${crypto.createHash('md5').update(filePath).digest('hex').substring(0, 7)}`;
}

function processTranslationFiles(inputJsonDir, csvFilePath, outputJsonDir) {
    const translatedRows = parse(fs.readFileSync(csvFilePath, 'utf8'));
    const translatedDataMap = {};

    // Parse the CSV data and map translatable keys and values
    translatedRows.forEach(row => {
        const key = row[0] + ' ' + row[1];
        const value = row[2];
        translatedDataMap[key] = value;
    });

    function processDirectory(directory, baseDir, outputDirectory) {
        const files = fs.readdirSync(directory);

        files.forEach(file => {
            const fullPathJson = path.join(directory, file);
            const stats = fs.statSync(fullPathJson);

            if (stats.isDirectory()) {
                // Recursively process directories
                const newOutputDirectory = path.join(outputDirectory, file);
                if (!fs.existsSync(newOutputDirectory)) {
                    fs.mkdirSync(newOutputDirectory);
                }
                processDirectory(fullPathJson, baseDir, newOutputDirectory);
            } else if (stats.isFile() && path.extname(file) === '.json') {
                // Process JSON files
                const jsonData = JSON.parse(fs.readFileSync(fullPathJson, 'utf8'));
                // Get relative path and replace backslashes with forward slashes
                const relativePath = path.relative(baseDir, fullPathJson).replace(/\\/g, '/');
                const hashedPath = hashFilePath(relativePath);
                fromLangFile(jsonData, translatedDataMap, hashedPath);
                const outputJsonPath = path.join(outputDirectory, file);
                fs.writeFileSync(outputJsonPath, JSON.stringify(jsonData, null, 2));
                console.log(`Translated JSON file written to ${outputJsonPath}`);
            }
        });
    }

    processDirectory(inputJsonDir, inputJsonDir, outputJsonDir);
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

// Process the input directories
processTranslationFiles(inputJsonDir, csvFilePath, outputJsonDir);
