const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { stringify } = require('csv-stringify/sync');
const TRANSLATABLE_KEYS = require('./settings');

/**
 * Converts translatable data in JSON data to CSV format
 * @param {*} jsonData JSON data
 * @param {string} filePath Path to the JSON file
 * @returns {Array} Rows of CSV data
 */
function toLangFile(jsonData, filePath) {
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
                    rows.push([filePath, `https://${newPath}`, replacedValue]);
                } else if (typeof value === 'object') {
                    // If the value is an object, recursively explore it
                    exploreTree(value, newPath);
                }
            }
        }
    }

    // Explore the JSON data
    exploreTree(jsonData, '');

    return rows;
}

function hashFilePath(filePath) {
    return `https://${crypto.createHash('md5').update(filePath).digest('hex').substring(0, 7)}`;
}

function processJsonFiles(inputDir, csvFilePath) {
    const rows = [];

    function processDirectory(directory, baseDir) {
        const files = fs.readdirSync(directory);

        files.forEach(file => {
            const fullPath = path.join(directory, file);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                // Recursively process directories
                processDirectory(fullPath, baseDir);
            } else if (stats.isFile() && path.extname(file) === '.json') {
                // Process JSON files
                const jsonData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                // Get relative path and replace backslashes with forward slashes
                const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                const hashedPath = hashFilePath(relativePath);
                const fileRows = toLangFile(jsonData, hashedPath);
                rows.push(...fileRows);
            }
        });
    }

    processDirectory(inputDir, inputDir);

    // Convert to CSV format and write to file
    const csvData = stringify(rows);
    fs.writeFileSync(csvFilePath, csvData);
    console.log(`CSV file written to ${csvFilePath}`);
}

// Get directory paths from command line arguments
const [inputDir, csvFilePath] = process.argv.slice(2);

if (!inputDir || !csvFilePath) {
    console.error('Usage: node toLangFile.js <path to input directory> <path to output CSV file>');
    process.exit(1);
}

// Process the input directory
processJsonFiles(inputDir, csvFilePath);
