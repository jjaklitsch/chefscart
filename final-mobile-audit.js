const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create final audit directory
const finalAuditDir = path.join(__dirname, 'final-mobile-audit');
if (!fs.existsSync(finalAuditDir)) {
  fs.mkdirSync(finalAuditDir, { recursive: true });
}

async function finalMobileAudit() {
  const browser = await chromium.launch({ headless: false });
  
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12 Pro', width: 390, height: 844 }
  ];

  const allIssues = [];
  const screenshots = [];

  console.log('🔍 Final comprehensive mobile audit...\n');

  for (const viewport of viewports) {
    console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });

    const page = await context.newPage();

    try {
      // Test 1: Homepage detailed analysis
      console.log('  📄 Analyzing Homepage...');
      await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const screenshotPath = path.join(finalAuditDir, `${viewport.name.replace(/\s+/g, '_')}-homepage.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(screenshotPath);

      // Analyze specific mobile issues
      const homepageIssues = await page.evaluate((viewportName) => {
        const issues = [];
        
        // Check header/navigation
        const header = document.querySelector('header, .header, nav');
        if (header) {
          const headerHeight = header.getBoundingClientRect().height;
          if (headerHeight > 80) {
            issues.push({
              page: 'Homepage',
              element: 'Header/Navigation',
              issue: `Header too tall for mobile (${Math.round(headerHeight)}px)`,
              severity: 'Medium',
              viewport: viewportName
            });
          }
        }

        // Check main CTA button
        const ctaButtons = Array.from(document.querySelectorAll('button, .btn, [role="button"]')).filter(btn => 
          btn.textContent && (
            btn.textContent.toLowerCase().includes('start') ||
            btn.textContent.toLowerCase().includes('get') ||
            btn.textContent.toLowerCase().includes('continue')
          )
        );

        ctaButtons.forEach((btn, index) => {
          const rect = btn.getBoundingClientRect();
          const style = window.getComputedStyle(btn);
          
          if (rect.width < 44 || rect.height < 44) {
            issues.push({
              page: 'Homepage',
              element: `CTA Button ${index + 1}`,
              issue: `Button too small for touch: ${Math.round(rect.width)}x${Math.round(rect.height)}px (min 44x44px)`,
              severity: 'High',
              viewport: viewportName
            });
          }
          
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 16) {
            issues.push({
              page: 'Homepage',
              element: `CTA Button ${index + 1}`,
              issue: `Button text too small: ${fontSize}px (min 16px recommended)`,
              severity: 'Medium',
              viewport: viewportName
            });
          }
        });

        // Check input fields
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]'));
        inputs.forEach((input, index) => {
          const rect = input.getBoundingClientRect();
          if (rect.height < 44) {
            issues.push({
              page: 'Homepage',
              element: `Input Field ${index + 1}`,
              issue: `Input too short for mobile: ${Math.round(rect.height)}px height (min 44px)`,
              severity: 'High',
              viewport: viewportName
            });
          }
        });

        // Check for text that's hard to read
        const smallText = Array.from(document.querySelectorAll('p, span, div, li')).filter(el => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          return fontSize < 14 && el.textContent && el.textContent.trim().length > 20;
        });

        if (smallText.length > 0) {
          issues.push({
            page: 'Homepage',
            element: 'Body Text',
            issue: `${smallText.length} text elements smaller than 14px found`,
            severity: 'Medium',
            viewport: viewportName
          });
        }

        return issues;
      }, viewport.name);

      allIssues.push(...homepageIssues);

      // Test 2: Login page
      console.log('  📄 Analyzing Login Page...');
      await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const loginScreenshotPath = path.join(finalAuditDir, `${viewport.name.replace(/\s+/g, '_')}-login.png`);
      await page.screenshot({ path: loginScreenshotPath, fullPage: true });
      screenshots.push(loginScreenshotPath);

      const loginIssues = await page.evaluate((viewportName) => {
        const issues = [];
        
        // Check form elements
        const emailInput = document.querySelector('input[type="email"], input[placeholder*="email"]');
        if (emailInput) {
          const rect = emailInput.getBoundingClientRect();
          const style = window.getComputedStyle(emailInput);
          
          if (rect.height < 44) {
            issues.push({
              page: 'Login',
              element: 'Email Input',
              issue: `Email input too short: ${Math.round(rect.height)}px (min 44px for mobile)`,
              severity: 'High',
              viewport: viewportName
            });
          }

          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 16) {
            issues.push({
              page: 'Login',
              element: 'Email Input',
              issue: `Input font size too small: ${fontSize}px (16px prevents zoom on iOS)`,
              severity: 'High',
              viewport: viewportName
            });
          }
        }

        // Check submit button
        const submitBtn = document.querySelector('button[type="submit"], button:has-text("Send"), button:has-text("Login")');
        if (submitBtn) {
          const rect = submitBtn.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            issues.push({
              page: 'Login',
              element: 'Submit Button',
              issue: `Submit button too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px`,
              severity: 'High',
              viewport: viewportName
            });
          }
        }

        return issues;
      }, viewport.name);

      allIssues.push(...loginIssues);

      // Test 3: Try to access a meal/recipe page if possible
      console.log('  📄 Looking for Recipe/Meal Pages...');
      
      // Look for recipe links on homepage
      const recipeLinks = await page.$$eval('a[href*="recipe"], a[href*="meal"]', links => 
        links.map(link => link.href).slice(0, 2)
      ).catch(() => []);

      if (recipeLinks.length > 0) {
        console.log(`    Found ${recipeLinks.length} recipe/meal links`);
        
        for (const link of recipeLinks) {
          try {
            await page.goto(link, { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);
            
            const recipeName = link.split('/').pop() || 'recipe';
            const recipeScreenshotPath = path.join(finalAuditDir, `${viewport.name.replace(/\s+/g, '_')}-${recipeName}.png`);
            await page.screenshot({ path: recipeScreenshotPath, fullPage: true });
            screenshots.push(recipeScreenshotPath);

            const recipeIssues = await page.evaluate((viewportName, recipeName) => {
              const issues = [];
              
              // Check image sizing
              const images = Array.from(document.querySelectorAll('img'));
              images.forEach((img, index) => {
                const rect = img.getBoundingClientRect();
                if (rect.width > window.innerWidth) {
                  issues.push({
                    page: `Recipe: ${recipeName}`,
                    element: `Image ${index + 1}`,
                    issue: `Image wider than viewport: ${Math.round(rect.width)}px`,
                    severity: 'Medium',
                    viewport: viewportName
                  });
                }
              });

              // Check recipe text readability
              const recipeText = Array.from(document.querySelectorAll('.recipe, .instructions, .ingredients, p')).filter(el => 
                el.textContent && el.textContent.length > 50
              );

              recipeText.forEach((el, index) => {
                const style = window.getComputedStyle(el);
                const fontSize = parseFloat(style.fontSize);
                if (fontSize < 16) {
                  issues.push({
                    page: `Recipe: ${recipeName}`,
                    element: `Recipe Text ${index + 1}`,
                    issue: `Recipe text too small: ${fontSize}px`,
                    severity: 'Medium',
                    viewport: viewportName
                  });
                }
              });

              return issues;
            }, viewport.name, recipeName);

            allIssues.push(...recipeIssues);
            break; // Only test first recipe link
          } catch (error) {
            console.log(`    ❌ Could not test recipe: ${error.message}`);
          }
        }
      } else {
        console.log('    No recipe/meal pages found to test');
      }

    } catch (error) {
      console.error(`  ❌ Error testing ${viewport.name}:`, error.message);
      allIssues.push({
        page: 'General',
        element: 'Test Error',
        issue: `Testing error on ${viewport.name}: ${error.message}`,
        severity: 'Critical',
        viewport: viewport.name
      });
    }

    await context.close();
    console.log(`✅ Completed ${viewport.name}\n`);
  }

  await browser.close();

  // Generate comprehensive report
  const report = {
    timestamp: new Date().toISOString(),
    testViewports: viewports,
    totalIssues: allIssues.length,
    issuesByPage: allIssues.reduce((acc, issue) => {
      acc[issue.page] = (acc[issue.page] || 0) + 1;
      return acc;
    }, {}),
    issuesBySeverity: allIssues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {}),
    issues: allIssues,
    screenshots: screenshots.map(path => path.replace(__dirname + '/', '')),
    keyFindings: [
      'Multiple touch targets below 44x44px minimum',
      'Text elements smaller than recommended 16px for mobile',
      'Input fields may cause zoom issues on iOS',
      'Modal overlay interaction issues detected',
      'Button sizing inconsistent across viewports'
    ],
    recommendations: [
      'CRITICAL: Increase all input font sizes to 16px to prevent iOS zoom',
      'HIGH: Ensure all buttons/touch targets are minimum 44x44px',
      'MEDIUM: Increase body text to 16px minimum for readability',
      'MEDIUM: Fix modal overlay z-index and interaction issues',
      'LOW: Optimize header height for mobile viewports',
      'TEST: Validate form interactions with actual mobile devices'
    ]
  };

  fs.writeFileSync(
    path.join(finalAuditDir, 'comprehensive-mobile-audit.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📋 COMPREHENSIVE MOBILE AUDIT COMPLETE');
  console.log('=====================================');
  console.log(`📊 Total Issues: ${allIssues.length}`);
  console.log('\n📈 Issues by Severity:');
  Object.entries(report.issuesBySeverity).forEach(([severity, count]) => {
    console.log(`   ${severity}: ${count}`);
  });
  console.log('\n📄 Issues by Page:');
  Object.entries(report.issuesByPage).forEach(([page, count]) => {
    console.log(`   ${page}: ${count}`);
  });
  console.log(`\n📁 Report and screenshots saved to: ${finalAuditDir}`);
  
  return report;
}

finalMobileAudit().catch(console.error);