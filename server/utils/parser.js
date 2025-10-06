const parseCSV = (csvString, hasHeader = true) => {
  const rows = csvString.trim().split('\n');
  
  if (!rows || rows.length === 0) {
    return [];
  }
  
  const headers = hasHeader 
    ? rows[0].split(',').map(header => header.trim()) 
    : [];
  
  const startIndex = hasHeader ? 1 : 0;
  
  return rows.slice(startIndex).map((row, rowIndex) => {
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
    values.push(currentValue.trim());
    if (!hasHeader) {
      return values;
    }
    const result = {};
    headers.forEach((header, index) => {
      if (header.trim().length > 0) {
        result[header] = index < values.length ? values[index] : '';
      }
    });
    return result;
  });
};

/**
 * Parses the games CSV file into structured game objects
 * 
 * This function:
 * 1. Parses the CSV string into raw data objects
 * 2. Transforms each row into a structured game object with nested properties
 * 3. Normalizes game IDs (lowercase, spaces/underscores → hyphens)
 * 4. Filters out invalid entries and specific excluded games
 * 
 * @param {string} csvString - Raw CSV file content
 * @returns {Array} Array of game objects
 */
const parseGamesCsv = (csvString) => {
  const parsedData = parseCSV(csvString, true);
  
  return parsedData.map(row => {
    // Normalize ID: lowercase, replace spaces/underscores with hyphens
    // e.g., "Fruit_Slice" → "fruit-slice"
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
  }).filter(game => game.id)  // Remove entries without valid IDs
    .filter(game => game.id !== 'tap-jump' && game.id !== 'tilt-maze');  // Exclude specific games
};

export default {
  parseCSV,
  parseGamesCsv
};
