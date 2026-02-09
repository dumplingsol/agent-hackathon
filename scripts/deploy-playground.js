const { chromium } = require('playwright');
const fs = require('fs');

async function deployToPlayground() {
  console.log('Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to Solana Playground
    console.log('Opening Solana Playground...');
    await page.goto('https://beta.solpg.io', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check if we need to create a new project
    console.log('Looking for project creation...');
    
    // Try to find and click "Create a new project" or similar
    const createButton = await page.locator('button:has-text("Create"), button:has-text("New")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      console.log('Creating new project...');
      await createButton.click();
      await page.waitForTimeout(2000);
      
      // Look for Anchor/Rust option
      const anchorOption = await page.locator('text=Anchor, text=Rust').first();
      if (await anchorOption.isVisible({ timeout: 3000 })) {
        await anchorOption.click();
        await page.waitForTimeout(2000);
      }
    }

    // Wait for editor to load
    console.log('Waiting for editor...');
    await page.waitForTimeout(5000);

    // Take a screenshot to see what we have
    await page.screenshot({ path: '/home/clawd/playground-loaded.png', fullPage: true });
    console.log('Screenshot saved to /home/clawd/playground-loaded.png');

    // Try to find the Monaco editor
    console.log('Looking for code editor...');
    const editor = await page.locator('.monaco-editor, [class*="editor"], textarea').first();
    
    if (await editor.isVisible({ timeout: 5000 })) {
      console.log('Found editor, preparing to paste code...');
      
      // Read our contract code
      const contractCode = fs.readFileSync('/home/clawd/payinbox-contract.rs', 'utf8');
      
      // Select all and paste
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(contractCode, { delay: 1 });
      
      console.log('Code pasted!');
      await page.waitForTimeout(2000);
      
      // Look for Build button
      console.log('Looking for Build button...');
      const buildButton = await page.locator('button:has-text("Build"), [title*="Build"]').first();
      
      if (await buildButton.isVisible({ timeout: 3000 })) {
        console.log('Clicking Build...');
        await buildButton.click();
        
        // Wait for build to complete (this takes time)
        console.log('Waiting for build to complete...');
        await page.waitForTimeout(60000); // 60 seconds for build
        
        // Take screenshot of build result
        await page.screenshot({ path: '/home/clawd/playground-built.png', fullPage: true });
        console.log('Build screenshot saved');
        
        // Look for Deploy button
        const deployButton = await page.locator('button:has-text("Deploy")').first();
        
        if (await deployButton.isVisible({ timeout: 5000 })) {
          console.log('Deploy button found!');
          console.log('');
          console.log('=================================');
          console.log('MANUAL STEP REQUIRED:');
          console.log('1. Open /home/clawd/playground-built.png');
          console.log('2. Click Deploy button in the browser');
          console.log('3. Connect your wallet');
          console.log('4. Approve the transaction');
          console.log('5. Copy the Program ID');
          console.log('=================================');
        }
      }
    }

    // Keep browser open for manual intervention
    console.log('');
    console.log('Browser staying open for manual deployment...');
    console.log('Press Ctrl+C when done');
    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/home/clawd/playground-error.png', fullPage: true });
    console.log('Error screenshot saved to /home/clawd/playground-error.png');
  } finally {
    await browser.close();
  }
}

deployToPlayground().catch(console.error);
