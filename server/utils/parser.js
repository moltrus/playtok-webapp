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

const parseGamesCsv = (csvString) => {
  const parsedData = parseCSV(csvString, true);
  
  return parsedData.map(row => {
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
  }).filter(game => game.id)
    .filter(game => {
      const allowedGames = [
        'ball-bounce',
        'fruit-slice',
        'memory-flip',
        'quick-tap',
        'stack-tower',
        'dodge-game',
        'maze-escape',
        'bubble-pop',
        'quiz-blitz',
        'color-match-tap',
        'sky-drop',
        'shape-builder'
      ];
      return allowedGames.includes(game.id);
    });
};

export default {
  parseCSV,
  parseGamesCsv
};
