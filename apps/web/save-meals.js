const fs = require('fs');
const path = require('path');

// Since I can't access the conversation images directly, let me use the existing fettuccini image
// and create a script that you can run after saving the other images manually

async function copyFettucciniImage() {
  const sharp = require('sharp');
  
  const inputPath = '/Users/jonathanjaklitsch/Downloads/fettuccini_alfredo.png';
  const outputDir = path.join(__dirname, 'public/images/meals');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (fs.existsSync(inputPath)) {
    try {
      await sharp(inputPath)
        .resize(400, 300, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toFile(path.join(outputDir, 'meal-8.webp'));
      
      console.log('✅ Converted fettuccini alfredo to meal-8.webp');
    } catch (error) {
      console.error('❌ Failed to convert image:', error.message);
    }
  } else {
    console.log('⚠️  Fettuccini alfredo image not found');
  }
}

copyFettucciniImage().catch(console.error);