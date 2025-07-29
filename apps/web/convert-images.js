const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function convertImagesToWebP() {
  const meals = [
    {
      input: '/Users/jonathanjaklitsch/Downloads/fettuccini_alfredo.png',
      output: 'meal-1.webp',
      alt: 'Korean-style bibimbap bowl with beef, vegetables, and fried egg'
    },
    // The other 7 images will need to be saved first from the conversation
  ];

  const outputDir = path.join(__dirname, 'public/images/meals');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const meal of meals) {
    if (fs.existsSync(meal.input)) {
      try {
        await sharp(meal.input)
          .resize(400, 300, { fit: 'cover', position: 'center' })
          .webp({ quality: 85 })
          .toFile(path.join(outputDir, meal.output));
        
        console.log(`✅ Converted ${meal.output}`);
      } catch (error) {
        console.error(`❌ Failed to convert ${meal.output}:`, error.message);
      }
    } else {
      console.log(`⚠️  Input file not found: ${meal.input}`);
    }
  }
}

convertImagesToWebP().catch(console.error);