const fs = require('fs');
const { stringify } = require('csv-stringify/sync');
const TRANSLATABLE_KEYS = require('./settings');

/**
 * Converts translatable data in JSON data to CSV format
 * @param {*} jsonData JSON data
 * @returns {string} Data in CSV format
 */
function toLangFile(jsonData) {
    const rows = [];

    // Recursive function to explore the JSON tree and extract translatable data
    function exploreTree(node, path) {
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const value = node[key];
                const newPath = path ? `${path}.${key}` : key;

                // Check if the key is translatable
                if (TRANSLATABLE_KEYS.includes(key)) {
                    // Replace §◯ with [§◯] and \n with \\n
                    const replacedValue = value.replace(/(§[0-9a-f§])/g, '[$1]').replace(/\n/g, '\\n');
                    // Add https:// prefix to the path and write to CSV
                    rows.push([`https://${newPath}`, replacedValue]);
                } else if (typeof value === 'object') {
                    // If the value is an object, recursively explore it
                    exploreTree(value, newPath);
                }
            }
        }
    }

    // Explore the JSON data
    exploreTree(jsonData, '');

    // Convert to CSV format and return
    return stringify(rows);
}

// Get file paths from command line arguments
const [jsonFilePath, csvFilePath] = process.argv.slice(2);

if (!jsonFilePath || !csvFilePath) {
    console.error('Usage: node toLangFile.js <path to JSON file> <path to output CSV file>');
    process.exit(1);
}

// Read the JSON file
const quests = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

// Convert to CSV
const result = toLangFile(quests);

// Write the CSV file
fs.writeFileSync(csvFilePath, result);
console.log(`CSV file written to ${csvFilePath}`);
