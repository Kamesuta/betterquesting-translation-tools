const fs = require('fs');
const { parse } = require('csv-parse/sync');
const TRANSLATABLE_KEYS = require('./settings');

/**
 * Merges translated CSV data with the original JSON data and applies the translation
 * @param {*} jsonData original JSON data
 * @param {string} translatedCsv translated CSV data
 */
function fromLangFile(jsonData, translatedCsv) {
    const translatedRows = parse(translatedCsv);

    // Parse the CSV data and map translatable keys and values
    const translatedDataMap = {};
    translatedRows.forEach(row => {
        const key = row[0];
        const value = row[1];
        translatedDataMap[key] = value;
    });

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
                    const translationKey = `https://${newPath}`;
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

// Get file paths from command line arguments
const [inputJsonFilePath, csvFilePath, outputJsonFilePath] = process.argv.slice(2);

if (!inputJsonFilePath || !csvFilePath || !outputJsonFilePath) {
    console.error('Usage: node fromLangFile.js <path to input JSON file> <path to input CSV file> <path to output JSON file>');
    process.exit(1);
}

// Read the JSON file
const quests = JSON.parse(fs.readFileSync(inputJsonFilePath, 'utf8'));

// Read the translated CSV file
const translatedText = fs.readFileSync(csvFilePath, 'utf8');

// Apply translation and write the output
fromLangFile(quests, translatedText);

// Write the updated JSON data to the output file
fs.writeFileSync(outputJsonFilePath, JSON.stringify(quests, null, 2));
console.log(`Translated JSON file written to ${outputJsonFilePath}`);
