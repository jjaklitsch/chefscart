#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function monitorProgress() {
  const generatedDir = path.join(__dirname, 'generated-meals');
  const totalMeals = 529; // Total meals in list
  
  let completedCount = 0;
  
  try {
    if (fs.existsSync(generatedDir)) {
      const files = fs.readdirSync(generatedDir);
      completedCount = files.filter(file => file.endsWith('.json')).length;
    }
  } catch (error) {
    console.log('No generated meals directory yet');
  }
  
  const percentage = ((completedCount / totalMeals) * 100).toFixed(1);
  
  console.log(`📊 Progress: ${completedCount}/${totalMeals} meals (${percentage}%)`);
  
  if (completedCount > 0) {
    const remaining = totalMeals - completedCount;
    const avgTimePerMeal = 4; // seconds (2s wait + ~2s generation)
    const estimatedMinutes = (remaining * avgTimePerMeal) / 60;
    
    console.log(`⏰ Estimated time remaining: ${estimatedMinutes.toFixed(1)} minutes`);
  }
  
  return { completed: completedCount, total: totalMeals, percentage };
}

if (require.main === module) {
  monitorProgress();
}

module.exports = { monitorProgress };