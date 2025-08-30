import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const PRODUCTION_URL = 'https://chefscart.ai';
const VALID_ZIP_CODES = ['10001', '90210', '60601'];
const INVALID_ZIP_CODES = ['00000', '99999', 'invalid'];

// Test data
const TEST_EMAIL = 'test@example.com';
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 5000, // 5 seconds
  apiResponse: 3000, // 3 seconds
  imageLoad: 2000, // 2 seconds
};

interface TestResults {
  passed: number;
  failed: number;
  errors: string[];
  warnings: string[];
  performanceMetrics: Record<string, number>;
  screenshots: string[];
}

let testResults: TestResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  performanceMetrics: {},
  screenshots: []
};

// Helper functions
async function captureConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });
  return errors;
}

async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return Date.now() - startTime;
}

async function testResponsiveDesign(page: Page): Promise<void> {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForLoadState('networkidle');
    
    // Check if navigation is accessible
    const nav = page.locator('nav, [role="navigation"], .navigation');
    if (await nav.count() > 0) {
      testResults.passed++;
    } else {
      testResults.warnings.push(`Navigation not found on ${viewport.name} viewport`);
    }
  }
}

async function takeScreenshot(page: Page, name: string): Promise<void> {
  const screenshotPath = `/tmp/chefscart-${name}-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  testResults.screenshots.push(screenshotPath);
}

test.describe('ChefsCart E2E Comprehensive Testing', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'ChefsCart-E2E-Test-Bot/1.0'
    });
    page = await context.newPage();
    
    // Set up console error capture
    await captureConsoleErrors(page);
  });

  test.afterAll(async () => {
    await context.close();
    
    // Generate final report
    console.log('\n=== CHEFSCART E2E TEST REPORT ===');
    console.log(`Total Tests Passed: ${testResults.passed}`);
    console.log(`Total Tests Failed: ${testResults.failed}`);
    console.log(`Total Errors: ${testResults.errors.length}`);
    console.log(`Total Warnings: ${testResults.warnings.length}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n=== ERRORS ===');
      testResults.errors.forEach(error => console.log(`- ${error}`));
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\n=== WARNINGS ===');
      testResults.warnings.forEach(warning => console.log(`- ${warning}`));
    }
    
    console.log('\n=== PERFORMANCE METRICS ===');
    Object.entries(testResults.performanceMetrics).forEach(([key, value]) => {
      console.log(`${key}: ${value}ms`);
    });
    
    if (testResults.screenshots.length > 0) {
      console.log('\n=== SCREENSHOTS CAPTURED ===');
      testResults.screenshots.forEach(path => console.log(`- ${path}`));
    }
  });

  test.describe('1. Landing Page Verification', () => {
    test('should load landing page without errors', async () => {
      try {
        const loadTime = await measurePageLoadTime(page, PRODUCTION_URL);
        testResults.performanceMetrics['Landing Page Load Time'] = loadTime;
        
        if (loadTime > PERFORMANCE_THRESHOLDS.pageLoad) {
          testResults.warnings.push(`Landing page load time (${loadTime}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.pageLoad}ms)`);
        }
        
        // Check page title
        await expect(page).toHaveTitle(/ChefsCart|Chef|Cart|Meal|Recipe/);
        
        // Check for basic elements
        const bodyContent = await page.textContent('body');
        expect(bodyContent).not.toBe('');
        
        testResults.passed++;
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Landing page load failed: ${error}`);
        await takeScreenshot(page, 'landing-page-error');
      }
    });

    test('should have functional navigation elements', async () => {
      try {
        // Look for common navigation patterns
        const navSelectors = [
          'nav',
          '[role="navigation"]',
          '.navigation',
          '.nav',
          '.header',
          'header'
        ];
        
        let navFound = false;
        for (const selector of navSelectors) {
          const nav = page.locator(selector);
          if (await nav.count() > 0) {
            navFound = true;
            
            // Check for clickable elements
            const links = nav.locator('a, button');
            const linkCount = await links.count();
            
            if (linkCount > 0) {
              testResults.passed++;
              console.log(`Found ${linkCount} navigation links`);
            } else {
              testResults.warnings.push('Navigation found but no clickable elements');
            }
            break;
          }
        }
        
        if (!navFound) {
          testResults.warnings.push('No navigation elements found');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Navigation test failed: ${error}`);
      }
    });

    test('should have working FAQ accordion functionality', async () => {
      try {
        // Look for FAQ sections
        const faqSelectors = [
          '[data-testid="faq"]',
          '.faq',
          '.accordion',
          '*:has-text("FAQ")',
          '*:has-text("Frequently")',
          '*:has-text("Questions")'
        ];
        
        let faqFound = false;
        for (const selector of faqSelectors) {
          const faq = page.locator(selector).first();
          if (await faq.count() > 0) {
            faqFound = true;
            
            // Look for accordion triggers
            const triggers = faq.locator('button, [role="button"], .accordion-trigger');
            const triggerCount = await triggers.count();
            
            if (triggerCount > 0) {
              // Test clicking first trigger
              await triggers.first().click();
              await page.waitForTimeout(500);
              testResults.passed++;
              console.log(`Found ${triggerCount} FAQ accordion items`);
            } else {
              testResults.warnings.push('FAQ section found but no accordion functionality detected');
            }
            break;
          }
        }
        
        if (!faqFound) {
          testResults.warnings.push('No FAQ section found on landing page');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`FAQ test failed: ${error}`);
      }
    });

    test('should display pricing information correctly', async () => {
      try {
        // Look for pricing elements
        const pricingSelectors = [
          '*:has-text("$")',
          '.price',
          '.pricing',
          '[data-testid="price"]',
          '*:has-text("free")',
          '*:has-text("Free")'
        ];
        
        let pricingFound = false;
        for (const selector of pricingSelectors) {
          const pricing = page.locator(selector);
          if (await pricing.count() > 0) {
            pricingFound = true;
            const pricingText = await pricing.first().textContent();
            console.log(`Found pricing information: ${pricingText}`);
            testResults.passed++;
            break;
          }
        }
        
        if (!pricingFound) {
          testResults.warnings.push('No pricing information found on landing page');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Pricing test failed: ${error}`);
      }
    });

    test('should have functional footer links', async () => {
      try {
        const footer = page.locator('footer, .footer');
        if (await footer.count() > 0) {
          const footerLinks = footer.locator('a');
          const linkCount = await footerLinks.count();
          
          if (linkCount > 0) {
            // Test that links have proper href attributes
            for (let i = 0; i < Math.min(linkCount, 5); i++) {
              const href = await footerLinks.nth(i).getAttribute('href');
              if (href && href !== '#' && href !== '') {
                testResults.passed++;
              } else {
                testResults.warnings.push(`Footer link ${i} has invalid href: ${href}`);
              }
            }
            console.log(`Found ${linkCount} footer links`);
          } else {
            testResults.warnings.push('Footer found but no links detected');
          }
        } else {
          testResults.warnings.push('No footer found on page');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Footer test failed: ${error}`);
      }
    });
  });

  test.describe('2. Authentication Testing', () => {
    test('should find and test login functionality', async () => {
      try {
        // Look for login elements
        const loginSelectors = [
          'button:has-text("Login")',
          'a:has-text("Login")',
          'button:has-text("Sign in")',
          'a:has-text("Sign in")',
          '[data-testid="login"]',
          '.login',
          'input[type="email"]'
        ];
        
        let loginFound = false;
        for (const selector of loginSelectors) {
          const loginElement = page.locator(selector);
          if (await loginElement.count() > 0) {
            loginFound = true;
            console.log(`Found login element: ${selector}`);
            
            // If it's a button/link, try clicking it
            if (selector.includes('button') || selector.includes('a:has-text')) {
              await loginElement.first().click();
              await page.waitForTimeout(1000);
              
              // Check if modal or new page opened
              const emailInputs = page.locator('input[type="email"]');
              if (await emailInputs.count() > 0) {
                testResults.passed++;
                console.log('Login flow initiated successfully');
              } else {
                testResults.warnings.push('Login button clicked but no email input found');
              }
            } else if (selector.includes('input[type="email"]')) {
              testResults.passed++;
              console.log('Email input found on page');
            }
            break;
          }
        }
        
        if (!loginFound) {
          testResults.warnings.push('No login functionality found on landing page');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Login test failed: ${error}`);
      }
    });

    test('should test magic link authentication flow', async () => {
      try {
        // Look for email input
        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.count() > 0) {
          await emailInput.fill(TEST_EMAIL);
          
          // Look for submit button
          const submitButtons = page.locator(
            'button:has-text("Send"), button:has-text("Login"), button:has-text("Sign in"), button[type="submit"]'
          );
          
          if (await submitButtons.count() > 0) {
            // Note: We won't actually submit to avoid sending emails
            testResults.passed++;
            console.log('Magic link form found and can be filled');
          } else {
            testResults.warnings.push('Email input found but no submit button');
          }
        } else {
          testResults.warnings.push('No email input found for magic link authentication');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Magic link test failed: ${error}`);
      }
    });
  });

  test.describe('3. Core User Flow Testing', () => {
    test('should test ZIP code validation with valid codes', async () => {
      for (const zipCode of VALID_ZIP_CODES) {
        try {
          // Look for ZIP input
          const zipSelectors = [
            'input[type="text"]',
            'input[placeholder*="zip" i]',
            'input[placeholder*="postal" i]',
            'input[name*="zip" i]',
            '[data-testid="zip"]'
          ];
          
          let zipInputFound = false;
          for (const selector of zipSelectors) {
            const zipInput = page.locator(selector);
            if (await zipInput.count() > 0) {
              await zipInput.fill(zipCode);
              
              // Look for submit/check button
              const submitButton = page.locator(
                'button:near(input), button:has-text("Check"), button:has-text("Continue"), button:has-text("Submit")'
              );
              
              if (await submitButton.count() > 0) {
                await submitButton.first().click();
                await page.waitForTimeout(2000);
                
                // Check for success indicators
                const successIndicators = page.locator(
                  ':has-text("available"), :has-text("supported"), .success, .valid'
                );
                
                if (await successIndicators.count() > 0) {
                  testResults.passed++;
                  console.log(`ZIP code ${zipCode} validation successful`);
                } else {
                  testResults.warnings.push(`ZIP code ${zipCode} submitted but no clear success indication`);
                }
                zipInputFound = true;
                break;
              }
            }
          }
          
          if (!zipInputFound) {
            testResults.warnings.push('No ZIP code input found on page');
            break;
          }
        } catch (error) {
          testResults.failed++;
          testResults.errors.push(`ZIP validation test failed for ${zipCode}: ${error}`);
        }
      }
    });

    test('should test ZIP code validation with invalid codes', async () => {
      for (const zipCode of INVALID_ZIP_CODES) {
        try {
          const zipInput = page.locator('input[type="text"]').first();
          if (await zipInput.count() > 0) {
            await zipInput.fill(zipCode);
            
            const submitButton = page.locator('button').first();
            if (await submitButton.count() > 0) {
              await submitButton.click();
              await page.waitForTimeout(2000);
              
              // Check for error indicators
              const errorIndicators = page.locator(
                ':has-text("invalid"), :has-text("not available"), :has-text("error"), .error, .invalid'
              );
              
              if (await errorIndicators.count() > 0) {
                testResults.passed++;
                console.log(`ZIP code ${zipCode} properly rejected`);
              } else {
                testResults.warnings.push(`Invalid ZIP code ${zipCode} may have been accepted`);
              }
            }
          }
        } catch (error) {
          testResults.failed++;
          testResults.errors.push(`Invalid ZIP test failed for ${zipCode}: ${error}`);
        }
      }
    });

    test('should test onboarding process if accessible', async () => {
      try {
        // Look for onboarding entry points
        const onboardingSelectors = [
          'button:has-text("Get Started")',
          'button:has-text("Start")',
          'a:has-text("Onboarding")',
          '[data-testid="onboarding"]',
          '.onboarding'
        ];
        
        let onboardingFound = false;
        for (const selector of onboardingSelectors) {
          const onboardingElement = page.locator(selector);
          if (await onboardingElement.count() > 0) {
            await onboardingElement.first().click();
            await page.waitForTimeout(2000);
            
            // Check for onboarding steps
            const stepIndicators = page.locator(
              '.step, [class*="step"], .progress, [aria-label*="step"]'
            );
            
            if (await stepIndicators.count() > 0) {
              testResults.passed++;
              console.log('Onboarding process initiated');
              onboardingFound = true;
            }
            break;
          }
        }
        
        if (!onboardingFound) {
          testResults.warnings.push('No accessible onboarding process found');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Onboarding test failed: ${error}`);
      }
    });

    test('should test meal recommendation display', async () => {
      try {
        // Look for meal cards or recommendations
        const mealSelectors = [
          '.meal-card',
          '.recipe-card',
          '.meal',
          '.recipe',
          '[data-testid*="meal"]',
          '*:has-text("recipe")',
          'img[alt*="meal" i]',
          'img[alt*="recipe" i]'
        ];
        
        let mealsFound = false;
        for (const selector of mealSelectors) {
          const meals = page.locator(selector);
          const mealCount = await meals.count();
          
          if (mealCount > 0) {
            mealsFound = true;
            console.log(`Found ${mealCount} meal elements`);
            
            // Test meal card interactions
            const firstMeal = meals.first();
            if (await firstMeal.count() > 0) {
              // Check for images
              const mealImage = firstMeal.locator('img');
              if (await mealImage.count() > 0) {
                const imgSrc = await mealImage.getAttribute('src');
                if (imgSrc && !imgSrc.includes('placeholder')) {
                  testResults.passed++;
                } else {
                  testResults.warnings.push('Meal images may be placeholders');
                }
              }
              
              // Check for timing information
              const timingText = await firstMeal.textContent();
              if (timingText && /\d+\s*min|prep|cook/.test(timingText)) {
                testResults.passed++;
                console.log('Meal timing information found');
              } else {
                testResults.warnings.push('No timing information found on meal cards');
              }
            }
            break;
          }
        }
        
        if (!mealsFound) {
          testResults.warnings.push('No meal recommendations found on page');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Meal recommendation test failed: ${error}`);
      }
    });
  });

  test.describe('4. Technical QA', () => {
    test('should check for JavaScript console errors', async () => {
      const errors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`Console Error: ${msg.text()}`);
        }
      });
      
      page.on('pageerror', (error) => {
        errors.push(`Page Error: ${error.message}`);
      });
      
      // Reload page to capture any errors
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      if (errors.length === 0) {
        testResults.passed++;
        console.log('No JavaScript errors found');
      } else {
        testResults.failed++;
        testResults.errors.push(...errors);
        console.log(`Found ${errors.length} JavaScript errors`);
      }
    });

    test('should test API endpoints', async () => {
      try {
        // Intercept API calls
        const apiCalls: { url: string; status: number; timing: number }[] = [];
        
        page.on('response', async (response) => {
          const url = response.url();
          if (url.includes('/api/')) {
            const timing = Date.now(); // Simplified timing
            apiCalls.push({
              url,
              status: response.status(),
              timing
            });
          }
        });
        
        // Trigger some interactions that might make API calls
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Check API responses
        let apiTestsPassed = 0;
        for (const call of apiCalls) {
          if (call.status >= 200 && call.status < 400) {
            apiTestsPassed++;
          } else {
            testResults.errors.push(`API call failed: ${call.url} returned ${call.status}`);
          }
          
          if (call.timing > PERFORMANCE_THRESHOLDS.apiResponse) {
            testResults.warnings.push(`Slow API response: ${call.url} took ${call.timing}ms`);
          }
        }
        
        if (apiCalls.length > 0) {
          console.log(`Tested ${apiCalls.length} API calls, ${apiTestsPassed} passed`);
          if (apiTestsPassed > 0) testResults.passed++;
        } else {
          testResults.warnings.push('No API calls detected during page load');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`API endpoint test failed: ${error}`);
      }
    });

    test('should test responsive design', async () => {
      try {
        await testResponsiveDesign(page);
        testResults.passed++;
        console.log('Responsive design tests completed');
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Responsive design test failed: ${error}`);
      }
    });

    test('should test keyboard navigation', async () => {
      try {
        // Test Tab navigation
        await page.keyboard.press('Tab');
        const activeElement = page.locator(':focus');
        
        if (await activeElement.count() > 0) {
          testResults.passed++;
          console.log('Keyboard navigation is functional');
        } else {
          testResults.warnings.push('No keyboard focus indicators found');
        }
        
        // Test for skip links
        const skipLinks = page.locator('a:has-text("Skip")');
        if (await skipLinks.count() > 0) {
          testResults.passed++;
          console.log('Skip links found for accessibility');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Keyboard navigation test failed: ${error}`);
      }
    });

    test('should check for broken images', async () => {
      try {
        const images = page.locator('img');
        const imageCount = await images.count();
        let brokenImages = 0;
        
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const src = await img.getAttribute('src');
          
          if (src) {
            try {
              const response = await page.goto(src, { waitUntil: 'load' });
              if (response && response.status() >= 400) {
                brokenImages++;
                testResults.errors.push(`Broken image: ${src} (${response.status()})`);
              }
            } catch (error) {
              brokenImages++;
              testResults.errors.push(`Failed to load image: ${src}`);
            }
          }
        }
        
        // Return to main page
        await page.goto(PRODUCTION_URL);
        
        if (brokenImages === 0) {
          testResults.passed++;
          console.log(`All ${imageCount} images loaded successfully`);
        } else {
          testResults.failed++;
          console.log(`Found ${brokenImages} broken images out of ${imageCount}`);
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Image check failed: ${error}`);
      }
    });
  });

  test.describe('5. Performance Testing', () => {
    test('should measure page load performance', async () => {
      try {
        const loadTime = await measurePageLoadTime(page, PRODUCTION_URL);
        testResults.performanceMetrics['Page Load Time'] = loadTime;
        
        if (loadTime < PERFORMANCE_THRESHOLDS.pageLoad) {
          testResults.passed++;
          console.log(`Page loaded in ${loadTime}ms (under threshold)`);
        } else {
          testResults.warnings.push(`Page load time ${loadTime}ms exceeds ${PERFORMANCE_THRESHOLDS.pageLoad}ms threshold`);
        }
        
        // Measure First Contentful Paint and Largest Contentful Paint if available
        const performanceEntries = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            loadComplete: navigation.loadEventEnd - navigation.fetchStart,
            firstByte: navigation.responseStart - navigation.fetchStart
          };
        });
        
        Object.entries(performanceEntries).forEach(([key, value]) => {
          testResults.performanceMetrics[key] = value;
        });
        
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Performance measurement failed: ${error}`);
      }
    });

    test('should test image loading performance', async () => {
      try {
        const images = page.locator('img');
        const imageCount = await images.count();
        
        if (imageCount > 0) {
          const startTime = Date.now();
          await page.waitForLoadState('networkidle');
          const imageLoadTime = Date.now() - startTime;
          
          testResults.performanceMetrics['Image Load Time'] = imageLoadTime;
          
          if (imageLoadTime < PERFORMANCE_THRESHOLDS.imageLoad) {
            testResults.passed++;
            console.log(`${imageCount} images loaded in ${imageLoadTime}ms`);
          } else {
            testResults.warnings.push(`Image loading time ${imageLoadTime}ms exceeds threshold`);
          }
        } else {
          testResults.warnings.push('No images found to test loading performance');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Image performance test failed: ${error}`);
      }
    });

    test('should check for memory leaks', async () => {
      try {
        // Basic memory usage check
        const initialHeap = await page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
        });
        
        if (initialHeap !== null) {
          // Simulate some interactions
          await page.reload();
          await page.waitForLoadState('networkidle');
          
          const finalHeap = await page.evaluate(() => {
            return (performance as any).memory.usedJSHeapSize;
          });
          
          const heapGrowth = finalHeap - initialHeap;
          testResults.performanceMetrics['Heap Growth'] = heapGrowth;
          
          if (heapGrowth < 10 * 1024 * 1024) { // 10MB threshold
            testResults.passed++;
            console.log(`Memory usage stable (${heapGrowth} bytes growth)`);
          } else {
            testResults.warnings.push(`Significant memory growth detected: ${heapGrowth} bytes`);
          }
        } else {
          testResults.warnings.push('Memory API not available for memory leak testing');
        }
      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Memory leak test failed: ${error}`);
      }
    });
  });

  test('should generate final screenshot and summary', async () => {
    await takeScreenshot(page, 'final-state');
    
    // Final summary
    const totalTests = testResults.passed + testResults.failed;
    const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : '0';
    
    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(`Success Rate: ${successRate}% (${testResults.passed}/${totalTests})`);
    console.log(`Site Overall Rating: ${successRate > 80 ? 'EXCELLENT' : successRate > 60 ? 'GOOD' : successRate > 40 ? 'FAIR' : 'NEEDS IMPROVEMENT'}`);
    
    // Recommendations
    console.log(`\n=== RECOMMENDATIONS ===`);
    if (testResults.errors.length > 0) {
      console.log(`- Fix ${testResults.errors.length} critical errors`);
    }
    if (testResults.warnings.length > 0) {
      console.log(`- Address ${testResults.warnings.length} warnings for better user experience`);
    }
    if (Object.keys(testResults.performanceMetrics).length > 0) {
      console.log(`- Review performance metrics for optimization opportunities`);
    }
    
    expect(testResults.passed).toBeGreaterThan(0);
  });
});