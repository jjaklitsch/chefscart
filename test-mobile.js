const { chromium } = require('playwright');

async function testMobileImprovements() {
  console.log('Starting mobile testing for ChefsCart...');
  
  const browser = await chromium.launch({ headless: false });
  
  // Test different mobile viewport sizes
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12 Pro', width: 390, height: 844 }
  ];
  
  for (const viewport of viewports) {
    console.log(`\nTesting on ${viewport.name} (${viewport.width}x${viewport.height})`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const page = await context.newPage();
    
    try {
      // Navigate to homepage
      await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
      
      // Take screenshot of homepage
      await page.screenshot({ 
        path: `mobile-homepage-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true 
      });
      
      // Check for common mobile issues
      console.log('Testing mobile improvements...');
      
      // 1. Check font sizes (should be 16px minimum)
      const fontSizes = await page.evaluate(() => {
        const elements = document.querySelectorAll('input, textarea, select, button');
        return Array.from(elements).map(el => {
          const style = window.getComputedStyle(el);
          return {
            tag: el.tagName,
            fontSize: style.fontSize,
            element: el.outerHTML.substring(0, 100)
          };
        });
      });
      
      console.log('Font sizes check:');
      fontSizes.forEach(item => {
        const size = parseInt(item.fontSize);
        if (size < 16) {
          console.log(`⚠️  Small font: ${item.tag} - ${item.fontSize} - ${item.element}`);
        } else {
          console.log(`✅ Good font: ${item.tag} - ${item.fontSize}`);
        }
      });
      
      // 2. Check touch target sizes (should be 44x44px minimum)
      const touchTargets = await page.evaluate(() => {
        const clickableElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], .cursor-pointer');
        return Array.from(clickableElements).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            text: el.textContent?.substring(0, 30) || el.getAttribute('aria-label') || 'No text',
            visible: rect.width > 0 && rect.height > 0
          };
        }).filter(item => item.visible);
      });
      
      console.log('Touch target sizes check:');
      touchTargets.forEach(item => {
        if (item.width < 44 || item.height < 44) {
          console.log(`⚠️  Small target: ${item.tag} ${item.width}x${item.height} - "${item.text}"`);
        } else {
          console.log(`✅ Good target: ${item.tag} ${item.width}x${item.height} - "${item.text}"`);
        }
      });
      
      // 3. Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      if (hasOverflow) {
        console.log('⚠️  Horizontal overflow detected');
      } else {
        console.log('✅ No horizontal overflow');
      }
      
      // 4. Test mobile menu (if exists)
      const mobileMenuButton = await page.locator('[aria-label*="menu"], .mobile-menu-button, button:has-text("Menu")').first();
      if (await mobileMenuButton.count() > 0) {
        console.log('Testing mobile menu...');
        await mobileMenuButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: `mobile-menu-open-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
          fullPage: true 
        });
        
        console.log('✅ Mobile menu opened successfully');
        
        // Close menu
        const closeButton = await page.locator('[aria-label*="close"], .close-button, button:has-text("Close")').first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(300);
        }
      } else {
        console.log('ℹ️  No mobile menu button found');
      }
      
      // 5. Test key navigation
      const navigationLinks = await page.locator('nav a, header a').all();
      if (navigationLinks.length > 0) {
        console.log(`Found ${navigationLinks.length} navigation links`);
        
        // Test first navigation link
        const firstLink = navigationLinks[0];
        const linkText = await firstLink.textContent();
        console.log(`Testing navigation to: ${linkText}`);
        
        try {
          await firstLink.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: `mobile-navigation-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
            fullPage: true 
          });
          
          console.log('✅ Navigation successful');
        } catch (error) {
          console.log(`⚠️  Navigation issue: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error(`Error testing ${viewport.name}:`, error.message);
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log('\nMobile testing completed! Check the generated screenshots.');
}

testMobileImprovements().catch(console.error);