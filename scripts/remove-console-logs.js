#!/usr/bin/env node

/**
 * Script to remove unnecessary console.log statements from the codebase
 * Preserves console.error, console.warn, and essential debugging logs
 */

const fs = require('fs')
const path = require('path')

// Files to process
const patterns = [
  'apps/web/src/**/*.{ts,tsx,js,jsx}',
  'apps/web/components/**/*.{ts,tsx,js,jsx}',
  'apps/web/lib/**/*.{ts,tsx,js,jsx}'
]

// Patterns to preserve (important logging)
const preservePatterns = [
  /console\.error/,
  /console\.warn/,
  /console\.info.*error/i,
  /console\.log.*error/i,
  /console\.log.*failed/i,
  /console\.log.*warning/i,
  // Keep logs in development/debug contexts
  /if.*process\.env\.NODE_ENV.*development.*console\.log/,
  /if.*DEBUG.*console\.log/,
]

// Patterns to remove (debugging/development logs)
const removePatterns = [
  /^\s*console\.log\([^)]*\)\.?;?\s*$/,
  /^\s*console\.log\([^)]*\)\s*$/,
]

function getFilesToProcess() {
  const files = []
  const directories = [
    'apps/web/src',
    'apps/web/components', 
    'apps/web/lib'
  ]
  
  function walkDirectory(dir) {
    if (!fs.existsSync(dir)) return
    
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        walkDirectory(fullPath)
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        files.push(fullPath)
      }
    }
  }
  
  for (const dir of directories) {
    walkDirectory(dir)
  }
  
  return files
}

function shouldPreserveLine(line) {
  return preservePatterns.some(pattern => pattern.test(line))
}

function shouldRemoveLine(line) {
  // Don't remove if it should be preserved
  if (shouldPreserveLine(line)) {
    return false
  }
  
  // Remove if it matches remove patterns
  return removePatterns.some(pattern => pattern.test(line))
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  
  let removedCount = 0
  const newLines = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (shouldRemoveLine(line)) {
      console.log(`  Removing: ${line.trim()}`)
      removedCount++
      // Don't add the line (effectively removes it)
    } else {
      newLines.push(line)
    }
  }
  
  if (removedCount > 0) {
    const newContent = newLines.join('\n')
    fs.writeFileSync(filePath, newContent, 'utf8')
    console.log(`✅ ${filePath}: Removed ${removedCount} console.log statements`)
    return removedCount
  }
  
  return 0
}

function main() {
  console.log('🧹 Starting console.log cleanup...')
  
  try {
    const files = getFilesToProcess()
    console.log(`📁 Found ${files.length} files to process`)
    
    let totalRemoved = 0
    let filesModified = 0
    
    for (const file of files) {
      const removed = processFile(file)
      if (removed > 0) {
        totalRemoved += removed
        filesModified++
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`)
    console.log(`📊 Summary:`)
    console.log(`  - Files processed: ${files.length}`)
    console.log(`  - Files modified: ${filesModified}`)
    console.log(`  - Console.log statements removed: ${totalRemoved}`)
    
    if (totalRemoved === 0) {
      console.log('✨ No unnecessary console.log statements found!')
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

// Preview mode - just show what would be removed without actually removing
function preview() {
  console.log('👀 Preview mode: Showing what would be removed...')
  
  const files = getFilesToProcess()
  let totalFound = 0
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')
    
    let foundCount = 0
    for (const line of lines) {
      if (shouldRemoveLine(line)) {
        if (foundCount === 0) {
          console.log(`\n📄 ${file}:`)
        }
        console.log(`  - ${line.trim()}`)
        foundCount++
      }
    }
    
    if (foundCount > 0) {
      totalFound += foundCount
      console.log(`  Total in file: ${foundCount}`)
    }
  }
  
  console.log(`\n📊 Preview summary: ${totalFound} console.log statements would be removed`)
}

// Run preview if --preview flag is passed
if (process.argv.includes('--preview')) {
  preview()
} else {
  main()
}