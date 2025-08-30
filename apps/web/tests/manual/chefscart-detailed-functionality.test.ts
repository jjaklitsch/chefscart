import { test, expect, Page } from '@playwright/test';

const PRODUCTION_URL = 'https://chefscart.ai';

test.describe('ChefsCart Detailed Functionality Tests', () => {
  test('should analyze landing page content and structure in detail', async ({ page }) => {
    console.log('=== DETAILED LANDING PAGE ANALYSIS ===');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // Capture page structure
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    
    // Check for main sections
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Main Headings Found:');
    headings.forEach((heading, index) => {
      console.log(`  ${index + 1}. ${heading}`);
    });
    
    // Check for call-to-action buttons
    const buttons = await page.locator('button, a[class*="button"], .btn').allTextContents();
    console.log('Call-to-Action Elements:');
    buttons.forEach((button, index) => {
      console.log(`  ${index + 1}. ${button}`);
    });
    
    // Check for pricing information
    const pricingElements = page.locator('*').filter({ hasText: /\$|free|pricing|plan/i });
    const pricingCount = await pricingElements.count();
    console.log(`Pricing Elements Found: ${pricingCount}`);
    
    // Check for testimonials or social proof
    const testimonials = await page.locator('*').filter({ hasText: /★|testimonial|review|says/i }).count();
    console.log(`Social Proof Elements: ${testimonials}`);
    
    // Capture screenshots
    await page.screenshot({ 
      path: '/tmp/chefscart-landing-detailed.png', 
      fullPage: true 
    });
    
    expect(title).toContain('ChefsCart');
    expect(headings.length).toBeGreaterThan(3);
  });

  test('should test ZIP code input functionality if available', async ({ page }) => {
    console.log('=== ZIP CODE FUNCTIONALITY TEST ===');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for ZIP input patterns
    const zipInputSelectors = [
      'input[placeholder*="zip" i]',
      'input[placeholder*="postal" i]', 
      'input[name*="zip" i]',
      'input[type="text"]',
      'input[inputmode="numeric"]'
    ];
    
    let zipInputFound = false;
    for (const selector of zipInputSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`Found ${count} potential ZIP inputs with selector: ${selector}`);
        
        for (let i = 0; i < count; i++) {
          const element = elements.nth(i);
          const placeholder = await element.getAttribute('placeholder');
          const name = await element.getAttribute('name');
          const type = await element.getAttribute('type');
          
          console.log(`  Input ${i + 1}: placeholder="${placeholder}", name="${name}", type="${type}"`);
          
          if (placeholder && /zip|postal/i.test(placeholder)) {
            zipInputFound = true;
            console.log('    ^ This appears to be a ZIP code input');
            
            // Test the input
            try {
              await element.fill('10001');
              console.log('    Successfully entered test ZIP: 10001');
              
              // Look for submit button near this input
              const submitButton = page.locator('button').filter({ hasText: /check|continue|submit|start/i });
              const submitCount = await submitButton.count();
              
              if (submitCount > 0) {
                console.log(`    Found ${submitCount} potential submit buttons`);
                // Don't actually submit to avoid triggering real functionality
              }
            } catch (error) {
              console.log(`    Error testing input: ${error}`);
            }
          }
        }
      }
    }
    
    if (!zipInputFound) {
      console.log('No ZIP code inputs found on landing page');
    }
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: '/tmp/chefscart-zip-test.png', 
      fullPage: true 
    });
  });

  test('should analyze navigation and user flow patterns', async ({ page }) => {
    console.log('=== NAVIGATION AND USER FLOW ANALYSIS ===');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // Find all clickable elements
    const clickableElements = page.locator('a, button, [role="button"], [onclick], [data-testid*="button"]');
    const count = await clickableElements.count();
    
    console.log(`Total Clickable Elements: ${count}`);
    
    // Analyze links
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    console.log(`External/Internal Links: ${linkCount}`);
    
    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      const target = await link.getAttribute('target');
      
      console.log(`  Link ${i + 1}: "${text}" → "${href}" ${target === '_blank' ? '(new tab)' : ''}`);
    }
    
    // Check for potential onboarding entry points
    const onboardingTriggers = page.locator('*').filter({ hasText: /get started|sign up|try|demo|start/i });
    const triggerCount = await onboardingTriggers.count();
    
    console.log(`Potential User Journey Entry Points: ${triggerCount}`);
    for (let i = 0; i < Math.min(triggerCount, 5); i++) {
      const trigger = onboardingTriggers.nth(i);
      const text = await trigger.textContent();
      const tag = await trigger.evaluate((el) => el.tagName.toLowerCase());
      console.log(`  Entry Point ${i + 1}: <${tag}> "${text}"`);
    }
  });

  test('should test page performance and loading behavior', async ({ page }) => {
    console.log('=== PERFORMANCE AND LOADING ANALYSIS ===');
    
    // Clear cache and measure fresh load
    await page.context().clearCookies();
    
    const startTime = Date.now();
    
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    const endTime = Date.now();
    const totalLoadTime = endTime - startTime;
    
    console.log(`Total Load Time: ${totalLoadTime}ms`);
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstByte: navigation.responseStart - navigation.fetchStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || null,
        largestContentfulPaint: paintEntries.find(entry => entry.name === 'largest-contentful-paint')?.startTime || null
      };
    });
    
    console.log('Performance Metrics:');
    Object.entries(performanceMetrics).forEach(([key, value]) => {
      if (value !== null) {
        console.log(`  ${key}: ${value}ms`);
      }
    });
    
    // Test image loading
    const images = page.locator('img');
    const imageCount = await images.count();
    console.log(`Total Images: ${imageCount}`);
    
    let loadedImages = 0;
    let failedImages = 0;
    
    for (let i = 0; i < imageCount; i++) {
      try {
        const img = images.nth(i);
        const src = await img.getAttribute('src');
        const alt = await img.getAttribute('alt');
        
        // Check if image is loaded by checking natural dimensions
        const isLoaded = await img.evaluate((el: HTMLImageElement) => {
          return el.complete && el.naturalHeight !== 0;
        });
        
        if (isLoaded) {
          loadedImages++;
        } else {
          failedImages++;
          console.log(`  Failed to load: ${src} (alt: "${alt}")`);
        }
      } catch (error) {
        failedImages++;
      }
    }
    
    console.log(`Images Loaded: ${loadedImages}/${imageCount}`);
    if (failedImages > 0) {
      console.log(`Images Failed: ${failedImages}`);
    }
    
    // Check for accessibility basics
    const altTexts = await images.evaluateAll((imgs: HTMLImageElement[]) => 
      imgs.map(img => ({ src: img.src, alt: img.alt }))
    );
    
    const missingAlt = altTexts.filter(img => !img.alt || img.alt.trim() === '');
    if (missingAlt.length > 0) {
      console.log(`Images Missing Alt Text: ${missingAlt.length}`);
    }
  });

  test('should analyze form interactions and input validation', async ({ page }) => {
    console.log('=== FORM INTERACTION ANALYSIS ===');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // Find all forms
    const forms = page.locator('form');
    const formCount = await forms.count();
    console.log(`Forms Found: ${formCount}`);
    
    // Find all input elements
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    console.log(`Form Inputs Found: ${inputCount}`);
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const required = await input.getAttribute('required');
      const disabled = await input.getAttribute('disabled');
      
      console.log(`  Input ${i + 1}: type="${type}", name="${name}", placeholder="${placeholder}", required="${required !== null}", disabled="${disabled !== null}"`);
      
      // Test basic interaction
      if (disabled === null && (type === 'text' || type === 'email' || type === null)) {
        try {
          await input.click({ timeout: 1000 });
          await input.fill('test', { timeout: 1000 });
          await input.clear({ timeout: 1000 });
          console.log(`    ✓ Input is interactive`);
        } catch (error) {
          console.log(`    ✗ Input interaction failed: ${error.message}`);
        }
      }
    }
    
    // Check for validation messages
    const validationMessages = page.locator('[role="alert"], .error, .invalid, .validation-error');
    const validationCount = await validationMessages.count();
    console.log(`Validation Message Elements: ${validationCount}`);
    
    // Look for ARIA labels and accessibility
    const ariaLabels = await inputs.evaluateAll((elements: HTMLElement[]) =>
      elements.map(el => ({
        ariaLabel: el.getAttribute('aria-label'),
        ariaDescribedBy: el.getAttribute('aria-describedby'),
        id: el.id,
        hasLabel: !!document.querySelector(`label[for="${el.id}"]`)
      }))
    );
    
    const accessibleInputs = ariaLabels.filter(input => 
      input.ariaLabel || input.ariaDescribedBy || input.hasLabel
    );
    
    console.log(`Accessible Inputs: ${accessibleInputs.length}/${inputCount}`);
    
    if (accessibleInputs.length < inputCount) {
      console.log(`Accessibility Warning: ${inputCount - accessibleInputs.length} inputs may lack proper labels`);
    }
  });

  test('should generate comprehensive test summary', async ({ page }) => {
    console.log('=== COMPREHENSIVE TEST SUMMARY ===');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // Final assessment
    const assessment = {
      pageLoads: true,
      hasContent: true,
      hasNavigation: false,
      hasInteractiveElements: false,
      hasAccessibilityFeatures: false,
      hasFormValidation: false,
      performanceAcceptable: false,
      mobileResponsive: false
    };
    
    // Test page loads and has content
    const bodyText = await page.textContent('body');
    assessment.hasContent = bodyText.length > 100;
    
    // Test navigation
    const navElements = await page.locator('nav, [role="navigation"], .navigation').count();
    assessment.hasNavigation = navElements > 0;
    
    // Test interactive elements
    const interactiveCount = await page.locator('button, a, input, [role="button"]').count();
    assessment.hasInteractiveElements = interactiveCount > 5;
    
    // Test accessibility features
    const accessibleElements = await page.locator('[aria-label], [alt], [role]').count();
    assessment.hasAccessibilityFeatures = accessibleElements > 3;
    
    // Test mobile responsive
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileContent = await page.locator('body').boundingBox();
    assessment.mobileResponsive = mobileContent && mobileContent.width <= 375;
    
    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('Final Assessment:');
    Object.entries(assessment).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✓ PASS' : '✗ FAIL'}`);
    });
    
    const passedTests = Object.values(assessment).filter(Boolean).length;
    const totalTests = Object.keys(assessment).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\nOverall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
    
    // Final screenshot
    await page.screenshot({ 
      path: '/tmp/chefscart-final-assessment.png', 
      fullPage: true 
    });
    
    expect(passedTests).toBeGreaterThan(totalTests * 0.5); // At least 50% should pass
  });
});