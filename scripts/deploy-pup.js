const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function deployToPlayground() {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    // Navigate to Solana Playground
    console.log('Opening Solana Playground...');
    await page.goto('https://beta.solpg.io', { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    console.log('Page loaded! Taking screenshot...');
    await page.screenshot({ path: '/home/clawd/playground-loaded.png', fullPage: true });
    console.log('Screenshot saved: /home/clawd/playground-loaded.png');

    // Look for project creation
    console.log('Looking for new project button...');
    const pageContent = await page.content();
    
    // Try multiple selectors for create button
    const createSelectors = [
      'button:has-text("Create")',
      'button:has-text("New")',
      '[aria-label*="Create"]',
      '[title*="Create"]',
      'button'
    ];
    
    for (const selector of createSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          const text = await page.evaluate(el => el.textContent, button);
          console.log(`Found button: "${text}"`);
          
          if (text.toLowerCase().includes('create') || text.toLowerCase().includes('new')) {
            console.log('Clicking create button...');
            await button.click();
            await new Promise(r => setTimeout(r, 3000));
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Take screenshot after click
    await page.screenshot({ path: '/home/clawd/playground-after-click.png', fullPage: true });
    console.log('Screenshot after click saved');

    // Extract page info
    const info = await page.evaluate(() => {
      return {
        title: document.title,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).slice(0, 20),
        inputs: Array.from(document.querySelectorAll('input')).length,
        textareas: Array.from(document.querySelectorAll('textarea')).length
      };
    });
    
    console.log('Page info:', JSON.stringify(info, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/home/clawd/playground-error.png', fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
}

deployToPlayground().catch(console.error);
