const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'mobile-audit-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runMobileAudit() {
  const browser = await chromium.launch({ headless: false });
  
  // Test different mobile viewports
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12 Pro', width: 390, height: 844 },
    { name: 'iPad Mini', width: 768, height: 1024 }
  ];

  const pages = [
    { url: 'http://localhost:3001', name: 'homepage' },
    { url: 'http://localhost:3001/login', name: 'login' }
  ];

  console.log('🔍 Starting mobile audit of ChefsCart...\n');

  for (const viewport of viewports) {
    console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    });

    const page = await context.newPage();

    for (const pageInfo of pages) {
      try {
        console.log(`  📄 Loading ${pageInfo.name}...`);
        await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
        
        // Wait for page to fully load
        await page.waitForTimeout(2000);
        
        // Take full page screenshot
        const screenshotPath = path.join(screenshotsDir, `${viewport.name.replace(/\s+/g, '_')}-${pageInfo.name}-fullpage.png`);
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: true,
          animations: 'disabled'
        });
        
        console.log(`    📸 Screenshot saved: ${screenshotPath}`);
        
        // Analyze mobile-specific issues
        const mobileIssues = await page.evaluate(() => {
          const issues = [];
          
          // Check for text that might be too small
          const allText = Array.from(document.querySelectorAll('*')).filter(el => {
            const computedStyle = window.getComputedStyle(el);
            const fontSize = parseFloat(computedStyle.fontSize);
            return fontSize > 0 && fontSize < 16 && el.textContent.trim().length > 0;
          });
          
          if (allText.length > 0) {
            issues.push(`Found ${allText.length} elements with text smaller than 16px`);
          }
          
          // Check for buttons that might be too small for touch
          const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
          const smallButtons = buttons.filter(btn => {
            const rect = btn.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44; // Apple's recommended minimum touch target
          });
          
          if (smallButtons.length > 0) {
            issues.push(`Found ${smallButtons.length} buttons/links smaller than 44px touch target`);
          }
          
          // Check for horizontal scrolling issues
          const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
          if (hasHorizontalScroll) {
            issues.push('Page has horizontal scrolling issues');
          }
          
          // Check for overlapping elements
          const overlappingElements = [];
          const elements = Array.from(document.querySelectorAll('*')).slice(0, 100); // Limit for performance
          
          for (let i = 0; i < elements.length; i++) {
            const el1 = elements[i];
            const rect1 = el1.getBoundingClientRect();
            
            if (rect1.width === 0 || rect1.height === 0) continue;
            
            for (let j = i + 1; j < elements.length; j++) {
              const el2 = elements[j];
              const rect2 = el2.getBoundingClientRect();
              
              if (rect2.width === 0 || rect2.height === 0) continue;
              
              // Check for overlap
              if (!(rect1.right < rect2.left || 
                    rect2.right < rect1.left || 
                    rect1.bottom < rect2.top || 
                    rect2.bottom < rect1.top)) {
                overlappingElements.push({
                  el1: el1.tagName + (el1.className ? '.' + el1.className.split(' ')[0] : ''),
                  el2: el2.tagName + (el2.className ? '.' + el2.className.split(' ')[0] : '')
                });
                break;
              }
            }
            
            if (overlappingElements.length >= 5) break; // Limit results
          }
          
          if (overlappingElements.length > 0) {
            issues.push(`Found ${overlappingElements.length} potentially overlapping elements`);
          }
          
          return {
            issues,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight
          };
        });
        
        console.log(`    🔍 Mobile issues found:`, mobileIssues.issues);
        
        // Test specific interactions if it's the homepage
        if (pageInfo.name === 'homepage') {
          // Look for the main CTA button or ZIP input
          const mainCTA = await page.$('[data-testid="zip-input"], input[placeholder*="ZIP"], input[placeholder*="zip"]');
          if (mainCTA) {
            await page.screenshot({
              path: path.join(screenshotsDir, `${viewport.name.replace(/\s+/g, '_')}-${pageInfo.name}-main-cta.png`),
              clip: await mainCTA.boundingBox()
            });
            console.log(`    📸 Main CTA screenshot saved`);
          }
        }
        
      } catch (error) {
        console.error(`    ❌ Error testing ${pageInfo.name}:`, error.message);
      }
    }
    
    await context.close();
    console.log(`✅ Completed testing ${viewport.name}\n`);
  }
  
  await browser.close();
  console.log('🎉 Mobile audit complete! Check the mobile-audit-screenshots directory for results.');
}

runMobileAudit().catch(console.error);