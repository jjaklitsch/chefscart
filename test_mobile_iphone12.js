const { chromium } = require('playwright');

(async () => {
  console.log('🔧 Starting ChefsCart Mobile Testing - iPhone 12 Pro (390x844)');
  console.log('=' + '='.repeat(59));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📱 Navigating to ChefsCart homepage...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await page.screenshot({ path: '/tmp/chefscart_iphone12_homepage.png', fullPage: true });
    console.log('📸 Homepage screenshot saved: /tmp/chefscart_iphone12_homepage.png');
    
    // Test footer touch targets
    console.log('\n1️⃣ Testing Footer Touch Targets...');
    const footerElements = await page.$$('footer a, footer button');
    
    for (let i = 0; i < footerElements.length; i++) {
      const element = footerElements[i];
      const box = await element.boundingBox();
      if (box) {
        const text = await element.innerText();
        if (text && text.trim()) {
          console.log(`   Footer element ${i+1}: "${text}" - Height: ${box.height}px, Width: ${box.width}px`);
          
          if (box.height >= 44) {
            console.log(`   ✅ Touch target height OK (${box.height}px)`);
          } else {
            console.log(`   ❌ Touch target too small (${box.height}px < 44px)`);
          }
        }
      }
    }
    
    // Test social media icons specifically in footer
    console.log('\n2️⃣ Testing Social Media Icons in Footer...');
    const footerSocialIcons = await page.$$('footer svg, footer img[src*="social"], footer a[href*="twitter"], footer a[href*="facebook"], footer a[href*="instagram"]');
    
    if (footerSocialIcons.length > 0) {
      for (let i = 0; i < footerSocialIcons.length; i++) {
        const icon = footerSocialIcons[i];
        const box = await icon.boundingBox();
        if (box) {
          console.log(`   Footer social icon ${i+1}: Size: ${box.width}x${box.height}px`);
          
          if (box.width >= 48 && box.height >= 48) {
            console.log('   ✅ Icon size meets requirement (48x48px)');
          } else {
            console.log(`   ❌ Icon size needs improvement (${box.width}x${box.height}px)`);
          }
        }
      }
    } else {
      console.log('   ⚠️ No social media icons found in footer');
    }
    
    // Test Get Started button
    console.log('\n3️⃣ Testing "Get Started" Button...');
    const getStartedButton = await page.$('button:has-text("Get Started")');
    
    if (getStartedButton) {
      const box = await getStartedButton.boundingBox();
      const tagName = await getStartedButton.evaluate(el => el.tagName.toLowerCase());
      
      console.log(`   Button element: <${tagName}> - Height: ${box.height}px, Width: ${box.width}px`);
      
      if (tagName === 'button' && box.height >= 56) {
        console.log(`   ✅ Proper button element with good height (${box.height}px)`);
      } else {
        console.log(`   ❌ Issues detected - Tag: ${tagName}, Height: ${box.height}px`);
      }
    } else {
      console.log('   ⚠️ "Get Started" button not found');
    }
    
    // Test mobile menu with better approach
    console.log('\n4️⃣ Testing Mobile Menu Navigation...');
    
    // First, let's see what menu elements are available
    const allButtons = await page.$$('button');
    let menuButton = null;
    
    for (const button of allButtons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const classes = await button.getAttribute('class') || '';
      
      if (ariaLabel && (ariaLabel.includes('menu') || ariaLabel.includes('navigation') || ariaLabel.includes('Toggle'))) {
        menuButton = button;
        console.log(`   📱 Found menu button with aria-label: "${ariaLabel}"`);
        break;
      } else if (classes.includes('hamburger') || classes.includes('menu')) {
        menuButton = button;
        console.log(`   📱 Found menu button with classes: "${classes}"`);
        break;
      }
    }
    
    if (menuButton) {
      try {
        // Check if button is enabled before clicking
        const isEnabled = await menuButton.isEnabled();
        const isVisible = await menuButton.isVisible();
        
        console.log(`   Menu button - Enabled: ${isEnabled}, Visible: ${isVisible}`);
        
        if (isEnabled && isVisible) {
          await menuButton.click({ timeout: 5000 });
          await page.waitForTimeout(1000);
          
          // Take screenshot of menu
          await page.screenshot({ path: '/tmp/chefscart_mobile_menu_iphone12.png', fullPage: true });
          console.log('   📸 Mobile menu screenshot: /tmp/chefscart_mobile_menu_iphone12.png');
          
          console.log('   ✅ Mobile menu successfully opened');
        } else {
          console.log('   ⚠️ Mobile menu button found but not clickable');
        }
      } catch (error) {
        console.log(`   ⚠️ Could not interact with menu button: ${error.message}`);
      }
    } else {
      console.log('   ℹ️ No mobile menu found - may be desktop-only navigation');
    }
    
    // Test overall viewport and scrolling
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
    
    // Scroll to footer and take screenshot
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    
    await page.screenshot({ path: '/tmp/chefscart_footer_iphone12.png', fullPage: false });
    console.log('   📸 Footer area screenshot: /tmp/chefscart_footer_iphone12.png');
    
    // Test touch interaction with footer elements
    console.log('\n6️⃣ Testing Footer Touch Interactions...');
    const firstFooterLink = await page.$('footer a:first-of-type');
    if (firstFooterLink) {
      const href = await firstFooterLink.getAttribute('href');
      console.log(`   Testing first footer link: ${href}`);
      
      // Just test if it's hoverable/clickable without actually clicking
      await firstFooterLink.hover();
      console.log('   ✅ Footer link is hoverable and interactive');
    }
    
    console.log('\n✅ iPhone 12 Pro testing completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await browser.close();
  }
})();