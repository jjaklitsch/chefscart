// Utility functions for text formatting

export function toTitleCase(str: string): string {
  if (!str) return '';
  
  // Handle hyphenated words and special cases
  return str
    .toLowerCase()
    .split(/[\s-]+/)
    .map(word => {
      // Handle special cases that should remain lowercase
      const lowercaseWords = ['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      
      // Always capitalize first word, otherwise check if it should remain lowercase
      if (word.length === 0) return word;
      
      // Always capitalize the first letter, handle the rest based on word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/\s-\s/g, '-'); // Re-join hyphenated words
}