const fs = require('fs');

/**
 * Writes data to a file atomically by writing to a temporary file first
 * and then renaming it to the target file.
 * 
 * @param {string} filePath - Absolute path to target file
 * @param {any} data - JS object/value to serialize to JSON
 * @param {number|string} [space] - Spacing for JSON formatting
 */
function writeJsonAtomic(filePath, data, space = undefined) {
  const tempPath = filePath + '.tmp';
  const content = JSON.stringify(data, null, space);
  fs.writeFileSync(tempPath, content, 'utf-8');
  fs.renameSync(tempPath, filePath);
}

module.exports = {
  writeJsonAtomic
};
