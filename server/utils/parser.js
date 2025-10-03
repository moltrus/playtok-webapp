/**
 * CSV Parser utility
 * Parses CSV files into JSON objects
 */

const fs = require('fs');

/**
 * Parse CSV string into array of objects
 * @param {string} csvString - Raw CSV string to parse
 * @param {boolean} hasHeader - Whether the CSV has a header row (default: true)
 * @returns {Array} Array of objects with keys from header row
 */
const parseCSV = (csvString, hasHeader = true) => {
  // Split the CSV string into rows
  const rows = csvString.trim().split('\n');
  
  // If empty, return empty array
  if (!rows || rows.length === 0) {
    return [];
  }
  
  // Extract headers (column names) from first row if hasHeader is true
  const headers = hasHeader 
    ? rows[0].split(',').map(header => header.trim()) 
    : [];
  
  // Start from first or second row based on hasHeader flag
  const startIndex = hasHeader ? 1 : 0;
  
  // Parse each row into an object
  return rows.slice(startIndex).map((row, rowIndex) => {
    // Handle potential quoted CSV values with commas inside them
    const values = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"' && (i === 0 || row[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
        continue;
      }
      
      if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
        continue;
      }
      
      currentValue += char;
    }
    
    // Add the last value
    values.push(currentValue.trim());
    
    // If no headers, return array of values
    if (!hasHeader) {
      return values;
    }
    
    // Map values to headers
    const result = {};
    headers.forEach((header, index) => {
      // Skip empty headers
      if (header.trim().length > 0) {
        result[header] = index < values.length ? values[index] : '';
      }
    });
    
    return result;
  });
};

/**
 * Parse games CSV specifically - with custom field formatting
 * @param {string} csvString - Raw CSV data from games.csv
 * @returns {Array} Array of formatted game objects
 */
const parseGamesCsv = (csvString) => { // Removed async since it's not needed
  const parsedData = parseCSV(csvString, true);
  
  // Transform into more usable format for frontend
  return parsedData.map(row => {
    // Clean up the ID to use as a slug/key
    // Also normalize by replacing underscores with hyphens
    const id = (row.ID || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/_/g, '-');
    
    return {
      id: id,
      name: row.Name || '',
      category: row.Category || '',
      mechanics: {
        core: row.CoreMechanic || '',
        controls: row.Controls || '',
        sessionLength: parseInt(row.SessionLengthSec, 10) || 30,
        outcome: {
          type: row.OutcomeType || '',
          condition: row.OutcomeCondition || ''
        }
      },
      scoring: row.Scoring || '',
      notes: row.Notes || ''
    };
  }).filter(game => game.id) // Filter out any rows without an ID
    .filter(game => game.id !== 'tap-jump' && game.id !== 'tilt-maze'); // Filter out "tilt maze" and "tap to jump" games
};

module.exports = {
  parseCSV,
  parseGamesCsv
};
