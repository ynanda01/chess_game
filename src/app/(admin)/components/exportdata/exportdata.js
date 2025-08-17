// utils/exportUtils.js
export const exportExperimentData = (experiment) => {
  if (!experiment) {
    console.error('No experiment data provided');
    return;
  }

  const headers = [

    "Experiment Name",
    "Experiment ID", 
    "Player Name",
    "Session ID",
    "Condition ID",
    
    // Puzzle data
    "Puzzle ID",
    "Puzzle Order",
    "Puzzle FEN",
    "Correct Move",

    // Advice data 
    "Timer Enabled",
    "Condition Name",
    "Advice Format",
    "Advice Text",
    "Advice Confidence",
    "Advice Explanation", 
    "Advice Reliability",
    
    
    // Player Response - Before Advice
    "Move Before Advice",
    "Time Before Advice (s)",
    
    // Player Response - After Advice  
    "Move After Advice",
    "Time After Advice (s)",
    
    // Advice Interaction
    "Advice Shown",
    "Advice Requested", 
    "Move Matches Advice",
    
    // Player Actions
    "Undo Used",
    "Time Exceeded",
    "Skipped",
  ];

  const rows = [];

  // Process each session in the experiment
  (experiment.sessions || []).forEach(session => {
    (session.responses || []).forEach(response => {
      const puzzle = response.puzzle || {};
      const advice = puzzle.advice || {};
      const condition = puzzle.condition || {};
      
      const row = [
        // Basic Info
        experiment.name || '',
        experiment.id || '',
        session.player_name || '',
        session.id || '', 
        condition.id || '',
        
        // Puzzle Info
        puzzle.id || '',
        puzzle.order || '',
        puzzle.fen || '',
        puzzle.correct_move || '',

        // Advice Info (grouped together)
         
        experiment.timerEnabled !== undefined ? (experiment.timerEnabled ? 'Yes' : 'No') : '',
        condition.name || '',
        experiment.adviceformat || condition.adviceformat || '',
        advice.text || '',
        advice.confidence || '',
        advice.explanation || '',
        advice.reliability || '',
        
        
        // Player Response - Before Advice
        response.move_before_advice || '',
        response.time_before_advice || '',
        
        // Player Response - After Advice
        response.move_after_advice || '',
        response.time_after_advice || '',
        
        
        // Advice Interaction
        response.advice_shown ? 'Yes' : 'No',
        response.advice_requested ? 'Yes' : 'No',
        response.move_matches_advice ? 'Yes' : 'No',
        
        // Player Actions
        response.undo_used ? 'Yes' : 'No',
        response.time_exceeded ? 'Yes' : 'No',
        response.skipped ? 'Yes' : 'No',
        
       
      ];
      
      rows.push(row);
    });
  });

  // If no detailed responses, create a summary row
  if (rows.length === 0 && experiment.sessions && experiment.sessions.length > 0) {
    experiment.sessions.forEach(session => {
      const row = [
        experiment.name || '',
        experiment.id || '',
        session.player_name || '',
        session.id || '',
        '', // condition name
        '', // condition id
        '', // puzzle id
        '', // puzzle order
        '', // fen
        '', // correct move
        '', // move before advice
        '', // time before advice
        '', // move after advice
        '', // time after advice
        '', // advice text
        '', // advice confidence
        '', // advice explanation
        '', // advice reliability
        experiment.adviceformat || '',
        '', // advice shown
        '', // advice requested
        '', // move matches advice
        '', // undo used
        '', // time exceeded
        '', // skipped
        experiment.timerEnabled !== undefined ? (experiment.timerEnabled ? 'Yes' : 'No') : ''
      ];
      rows.push(row);
    });
  }

  return { headers, rows };
};

export const downloadCSV = (data, filename) => {
  const { headers, rows } = data;
  
  if (!rows || rows.length === 0) {
    console.warn('No data to export');
    return;
  }

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => {
      // Handle cells that might contain commas, quotes, or newlines
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Single export function for detailed data
export const exportDetailedData = (experiment) => {
  const data = exportExperimentData(experiment);
  const filename = `${experiment.name?.replace(/\s+/g, '_') || 'experiment'}_player_data.csv`;
  downloadCSV(data, filename);
};