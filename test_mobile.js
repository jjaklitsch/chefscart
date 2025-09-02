const { chromium } = require('playwright');

(async () => {
  console.log('🔧 Starting ChefsCart Mobile Testing - iPhone SE (375x667)');
  console.log('=' + '='.repeat(59));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📱 Navigating to ChefsCart homepage...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await page.screenshot({ path: '/tmp/chefscart_iphone_se_homepage.png', fullPage: true });
    console.log('📸 Homepage screenshot saved: /tmp/chefscart_iphone_se_homepage.png');
    
    // Test footer touch targets
    console.log('\n1️⃣ Testing Footer Touch Targets...');
    const footerElements = await page.$$('footer a, footer button');
    
    for (let i = 0; i < footerElements.length; i++) {
      const element = footerElements[i];
      const box = await element.boundingBox();
      if (box) {
        const text = await element.innerText();
        console.log(`   Footer element ${i+1}: "${text}" - Height: ${box.height}px, Width: ${box.width}px`);
        
        if (box.height >= 44) {
          console.log(`   ✅ Touch target height OK (${box.height}px)`);
        } else {
          console.log(`   ❌ Touch target too small (${box.height}px < 44px)`);
        }
      }
    }
    
    // Test social media icons
    console.log('\n2️⃣ Testing Social Media Icons...');
    const socialSelectors = [
      '[class*="social"]', 
      '[aria-label*="social"]', 
      'a[href*="twitter"]', 
      'a[href*="facebook"]', 
      'a[href*="instagram"]'
    ];
    
    let socialIconsFound = 0;
    for (const selector of socialSelectors) {
      const icons = await page.$$(selector);
      for (let i = 0; i < icons.length; i++) {
        const icon = icons[i];
        const box = await icon.boundingBox();
        if (box) {
          socialIconsFound++;
          const href = await icon.getAttribute('href') || 'N/A';
          console.log(`   Social icon: ${href} - Size: ${box.width}x${box.height}px`);
          
          if (box.width >= 48 && box.height >= 48) {
            console.log('   ✅ Icon size meets requirement (48x48px)');
          } else {
            console.log(`   ❌ Icon too small (${box.width}x${box.height}px)`);
          }
        }
      }
    }
    
    if (socialIconsFound === 0) {
      console.log('   ⚠️ No social media icons found with standard selectors');
    }
    
    // Test Start planning button
    console.log('\n3️⃣ Testing "Start planning now!" Button...');
    let startButton = await page.$('text="Start planning now!"');
    
    // Try alternative selectors if not found
    if (!startButton) {
      startButton = await page.$('button:has-text("Get Started")');
    }
    if (!startButton) {
      startButton = await page.$('button:has-text("Start")');
    }
    
    if (startButton) {
      const box = await startButton.boundingBox();
      const tagName = await startButton.evaluate(el => el.tagName.toLowerCase());
      
      console.log(`   Button element: <${tagName}> - Height: ${box.height}px, Width: ${box.width}px`);
      
      if (['button', 'a'].includes(tagName) && box.height >= 56) {
        console.log(`   ✅ Proper button element with good height (${box.height}px)`);
      } else {
        console.log(`   ❌ Issues detected - Tag: ${tagName}, Height: ${box.height}px`);
      }
    } else {
      console.log('   ⚠️ "Start planning now!" or "Get Started" button not found');
    }
    
    // Test mobile menu
    console.log('\n4️⃣ Testing Mobile Menu Navigation...');
    const menuTrigger = await page.$('button[aria-label="Toggle navigation"]') || 
                       await page.$('.hamburger') || 
                       await page.$('[class*="menu-toggle"]') ||
                       await page.$('button[class*="mobile"]');
    
    if (menuTrigger) {
      console.log('   📱 Found mobile menu trigger, testing...');
      await menuTrigger.click();
      await page.waitForTimeout(500);
      
      // Take screenshot of open menu
      await page.screenshot({ path: '/tmp/chefscart_mobile_menu_open.png', fullPage: true });
      console.log('   📸 Mobile menu screenshot: /tmp/chefscart_mobile_menu_open.png');
      
      // Test navigation links
      const navLinks = await page.$$('nav a, [role="navigation"] a');
      let clickableCount = 0;
      
      for (const link of navLinks) {
        const isVisible = await link.isVisible();
        const isEnabled = await link.isEnabled();
        if (isVisible && isEnabled) {
          clickableCount++;
        }
      }
      
      console.log(`   ✅ Found ${clickableCount} clickable navigation links`);
    } else {
      console.log('   ⚠️ Mobile menu trigger not found');
    }
    
    // Test overall viewport
    console.log('\n5️⃣ Testing Overall Mobile Experience...');
    const viewportInfo = await page.evaluate(() => ({
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      documentHeight: document.body.scrollHeight,
      devicePixelRatio: window.devicePixelRatio
    }));
    
    console.log(`   Viewport: ${viewportInfo.windowWidth}x${viewportInfo.windowHeight}px`);
    console.log(`   Document height: ${viewportInfo.documentHeight}px`);
    console.log(`   Device pixel ratio: ${viewportInfo.devicePixelRatio}`);
    
    // Scroll to bottom and take footer screenshot
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: '/tmp/chefscart_footer_mobile.png', fullPage: false });
    console.log('   📸 Footer area screenshot: /tmp/chefscart_footer_mobile.png');
    
    console.log('\n✅ iPhone SE testing completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await browser.close();
  }
})();