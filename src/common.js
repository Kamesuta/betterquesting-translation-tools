const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const TRANSLATABLE_KEYS = require('./settings');
const JSONbig = require('json-bigint');

/**
 * Generates a hashed file path for unique identification
 * @param {string} filePath The original file path
 * @returns {string} Hashed file path
 */
function hashFilePath(filePath) {
    return `https://${crypto.createHash('md5').update(filePath).digest('hex').substring(0, 7)}`;
}

/**
 * Recursively explores a JSON object and executes a callback for translatable keys
 * @param {Object} jsonData JSON data
 * @param {string} filePath Path to the JSON file
 * @param {Function} callback Callback function to execute for each translatable key
 */
function exploreTree(jsonData, filePath, callback) {
    function recursiveExplore(node, path) {
        for (const key in node) {
            if (Object.hasOwnProperty.call(node, key)) {
                const value = node[key];
                const newPath = path ? `${path}.${key}` : key;

                if (typeof value === 'object' && value !== null) {
                    recursiveExplore(value, newPath);
                } else if (TRANSLATABLE_KEYS.includes(key)) {
                    callback(node, key, value, newPath);
                }
            }
        }
    }

    recursiveExplore(jsonData, '');
}

/**
 * Recursively processes a directory and executes a callback for each file
 * @param {string} inputDir The directory to process
 * @param {Function} callback Callback function to execute for each file
 */
function processDirectory(inputDir, callback) {
    function recursiveProcess(directory, baseDir) {
        const files = fs.readdirSync(directory);

        files.forEach(file => {
            const fullPath = path.join(directory, file);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                recursiveProcess(fullPath, baseDir);
            } else if (stats.isFile()) {
                const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                callback(relativePath, fullPath);
            }
        });
    }

    recursiveProcess(inputDir, inputDir);
}

/**
 * Reads CSV data from a file
 * @param {string} csvFilePath Path to the CSV file
 * @returns {Array} Parsed CSV data
 */
function readCSV(csvFilePath) {
    return parse(fs.readFileSync(csvFilePath, 'utf8'));
}

/**
 * Writes data to a CSV file
 * @param {string} csvFilePath Path to the CSV file
 * @param {Array} data Data to write to the CSV file
 */
function writeCSV(csvFilePath, data) {
    const csvData = stringify(data);
    fs.writeFileSync(csvFilePath, csvData);
    console.log(`CSV file written to ${csvFilePath}`);
}

/**
 * Reads JSON data from a file
 * @param {string} jsonFilePath Path to the JSON file
 * @returns {Object} Parsed JSON data
 */
function readJSON(jsonFilePath) {
    return JSONbig.parse(fs.readFileSync(jsonFilePath, 'utf8'));
}

/**
 * Writes JSON data to a file
 * @param {string} outputJsonPath Path to the output JSON file
 * @param {Object} data JSON data to write to the file
 */
function writeJSON(outputJsonPath, data) {
    fs.writeFileSync(outputJsonPath, JSONbig.stringify(data, null, 2));
}

module.exports = {
    hashFilePath,
    exploreTree,
    processDirectory,
    readCSV,
    writeCSV,
    readJSON,
    writeJSON
};
