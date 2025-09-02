const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create detailed audit directory
const auditDir = path.join(__dirname, 'detailed-mobile-audit');
if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
}

async function detailedMobileAudit() {
  const browser = await chromium.launch({ headless: false });
  
  const viewport = { width: 375, height: 667 }; // iPhone SE
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });

  const page = await context.newPage();
  const issues = [];

  console.log('🔍 Starting detailed mobile audit...\n');

  try {
    // 1. Test Homepage
    console.log('📱 Testing Homepage...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Screenshot homepage
    await page.screenshot({ 
      path: path.join(auditDir, 'homepage-mobile.png'),
      fullPage: true 
    });

    // Test ZIP input interaction
    const zipInput = await page.$('input[placeholder*="ZIP"], input[placeholder*="zip"], input[type="text"]');
    if (zipInput) {
      console.log('  ✓ Found ZIP input');
      
      // Test typing in ZIP input
      await zipInput.click();
      await page.waitForTimeout(500);
      await zipInput.fill('10001');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: path.join(auditDir, 'homepage-zip-filled.png'),
        fullPage: true 
      });
      
      // Check if we can proceed (look for continue button)
      const continueBtn = await page.$('button:has-text("Continue"), button:has-text("Start"), button:has-text("Get Started")');
      if (continueBtn) {
        const btnRect = await continueBtn.boundingBox();
        if (btnRect && (btnRect.width < 44 || btnRect.height < 44)) {
          issues.push({
            page: 'Homepage',
            issue: `Continue button too small for touch: ${btnRect.width}x${btnRect.height}px`,
            severity: 'High'
          });
        }
        
        console.log('  📱 Testing onboarding flow...');
        await continueBtn.click();
        await page.waitForTimeout(2000);
        
        // Screenshot first onboarding step
        await page.screenshot({ 
          path: path.join(auditDir, 'onboarding-step1.png'),
          fullPage: true 
        });
        
        // Test multiple onboarding steps
        for (let step = 1; step <= 5; step++) {
          console.log(`    🔸 Testing onboarding step ${step}...`);
          
          // Look for selection options
          const options = await page.$$('button:not([disabled]), .option, .selection-item, [role="button"]');
          
          if (options.length > 0) {
            console.log(`      Found ${options.length} interactive elements`);
            
            // Test first available option
            const firstOption = options[0];
            const optionRect = await firstOption.boundingBox();
            
            if (optionRect) {
              if (optionRect.width < 44 || optionRect.height < 44) {
                issues.push({
                  page: `Onboarding Step ${step}`,
                  issue: `Interactive element too small: ${optionRect.width}x${optionRect.height}px`,
                  severity: 'Medium'
                });
              }
              
              // Click the option
              await firstOption.click();
              await page.waitForTimeout(1000);
            }
          }
          
          // Look for Next button
          const nextBtn = await page.$('button:has-text("Next"), button:has-text("Continue"), button:has-text("Proceed")');
          if (nextBtn) {
            await nextBtn.click();
            await page.waitForTimeout(2000);
            
            // Screenshot the next step
            await page.screenshot({ 
              path: path.join(auditDir, `onboarding-step${step + 1}.png`),
              fullPage: true 
            });
          } else {
            console.log(`      No next button found in step ${step}`);
            break;
          }
        }
      }
    } else {
      issues.push({
        page: 'Homepage',
        issue: 'Could not find ZIP input field',
        severity: 'Critical'
      });
    }

    // 2. Test Navigation Menu
    console.log('📱 Testing Mobile Navigation...');
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);
    
    const menuButton = await page.$('button[aria-label*="menu"], .hamburger, [data-testid="menu"]');
    if (menuButton) {
      console.log('  ✓ Found mobile menu button');
      await menuButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: path.join(auditDir, 'mobile-menu-open.png'),
        fullPage: true 
      });
    } else {
      issues.push({
        page: 'Navigation',
        issue: 'Mobile menu button not found or not accessible',
        severity: 'High'
      });
    }

    // 3. Test Form Elements
    console.log('📱 Testing Form Elements...');
    await page.goto('http://localhost:3001/login');
    await page.waitForTimeout(2000);
    
    const emailInput = await page.$('input[type="email"], input[placeholder*="email"]');
    if (emailInput) {
      const inputRect = await emailInput.boundingBox();
      if (inputRect && inputRect.height < 44) {
        issues.push({
          page: 'Login',
          issue: `Email input too short for mobile: ${inputRect.height}px height`,
          severity: 'Medium'
        });
      }
      
      // Test input interaction
      await emailInput.click();
      await page.waitForTimeout(500);
      await emailInput.fill('test@example.com');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: path.join(auditDir, 'login-form-filled.png'),
        fullPage: true 
      });
    }

    // 4. Text Readability Analysis
    console.log('📱 Analyzing Text Readability...');
    const textAnalysis = await page.evaluate(() => {
      const issues = [];
      const allElements = Array.from(document.querySelectorAll('*'));
      
      allElements.forEach(el => {
        if (el.textContent && el.textContent.trim().length > 10) {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          const lineHeight = parseFloat(style.lineHeight);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          
          // Check for small text
          if (fontSize < 16) {
            issues.push({
              element: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
              text: el.textContent.trim().substring(0, 50) + '...',
              fontSize: fontSize + 'px',
              issue: 'Text too small for mobile'
            });
          }
          
          // Check for poor contrast (simplified)
          if (color === 'rgb(128, 128, 128)' || color.includes('gray')) {
            issues.push({
              element: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
              text: el.textContent.trim().substring(0, 50) + '...',
              color: color,
              issue: 'Low contrast text'
            });
          }
        }
      });
      
      return issues.slice(0, 20); // Limit results
    });
    
    console.log(`  Found ${textAnalysis.length} text readability issues`);
    issues.push(...textAnalysis.map(item => ({
      page: 'Text Analysis',
      issue: `${item.issue}: "${item.text}" (${item.fontSize || item.color})`,
      severity: 'Medium'
    })));

    // 5. Button and Touch Target Analysis
    console.log('📱 Analyzing Touch Targets...');
    const touchTargetAnalysis = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], .clickable, [role="button"]'));
      const issues = [];
      
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        const style = window.getComputedStyle(btn);
        
        if (rect.width > 0 && rect.height > 0) {
          if (rect.width < 44 || rect.height < 44) {
            issues.push({
              element: btn.tagName.toLowerCase() + (btn.className ? '.' + btn.className.split(' ')[0] : ''),
              text: btn.textContent ? btn.textContent.trim().substring(0, 30) : 'No text',
              size: `${Math.round(rect.width)}x${Math.round(rect.height)}px`,
              issue: 'Touch target too small (minimum 44x44px recommended)'
            });
          }
        }
      });
      
      return issues.slice(0, 15); // Limit results
    });
    
    console.log(`  Found ${touchTargetAnalysis.length} touch target issues`);
    issues.push(...touchTargetAnalysis.map(item => ({
      page: 'Touch Targets',
      issue: `${item.issue}: "${item.text}" (${item.size})`,
      severity: 'High'
    })));

  } catch (error) {
    console.error('❌ Error during audit:', error);
    issues.push({
      page: 'General',
      issue: `Audit error: ${error.message}`,
      severity: 'Critical'
    });
  }

  await context.close();
  await browser.close();

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    viewport: viewport,
    totalIssues: issues.length,
    issues: issues,
    recommendations: [
      'Increase minimum font size to 16px for body text',
      'Ensure all touch targets are at least 44x44px',
      'Improve color contrast for better readability',
      'Test forms with actual mobile keyboards',
      'Consider sticky navigation for better UX',
      'Optimize button spacing for thumb navigation'
    ]
  };

  fs.writeFileSync(
    path.join(auditDir, 'mobile-audit-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📋 MOBILE AUDIT SUMMARY');
  console.log('========================');
  console.log(`Total Issues Found: ${issues.length}`);
  console.log('\nTop Issues:');
  
  const groupedIssues = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(groupedIssues).forEach(([severity, count]) => {
    console.log(`  ${severity}: ${count} issues`);
  });

  console.log('\n📁 Screenshots and detailed report saved to:', auditDir);
  
  return report;
}

detailedMobileAudit().catch(console.error);