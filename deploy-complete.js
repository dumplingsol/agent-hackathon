const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function deployToPlayground() {
  console.log('🚀 Starting PayInbox deployment to Solana Playground...\n');
  
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true, // Headless mode for WSL
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Step 1: Load Solana Playground
    console.log('📂 Loading Solana Playground...');
    await page.goto('https://beta.solpg.io', { waitUntil: 'networkidle0', timeout: 60000 });
    await wait(3000);

    // Step 2: Create new project
    console.log('➕ Creating new project...');
    await page.click('button::-p-text(Create a new project)');
    await wait(2000);

    // Step 3: Select Anchor framework
    console.log('⚓ Selecting Anchor framework...');
    const anchorButtons = await page.$$('button');
    for (const button of anchorButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.toLowerCase().includes('anchor')) {
        await button.click();
        break;
      }
    }
    await wait(2000);

    // Step 4: Enter project name
    console.log('✏️  Entering project name...');
    const input = await page.$('input[type="text"]');
    if (input) {
      await input.click({ clickCount: 3 }); // Select all
      await input.type('payinbox');
    }
    await wait(1000);

    // Step 5: Click final Create button
    console.log('✅ Creating project...');
    const createBtn = await page.$('button::-p-text(Create)');
    if (createBtn) {
      await createBtn.click();
    }
    await wait(5000); // Wait for project to initialize

    console.log('📝 Project created! Preparing to paste contract code...');
    await wait(3000);

    // Step 6: Find and clear the editor
    console.log('📋 Pasting contract code...');
    
    // Try to find Monaco editor
    await page.keyboard.press('Control+A'); // Select all
    await wait(500);
    
    // Read our contract
    const contractCode = fs.readFileSync('/home/clawd/payinbox-contract.rs', 'utf8');
    
    // Use clipboard API
    await page.evaluate((code) => {
      navigator.clipboard.writeText(code);
    }, contractCode);
    
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
    
    console.log('✅ Contract code pasted!');
    await wait(3000);

    // Step 7: Build
    console.log('\n🔨 Building contract...');
    console.log('(This takes ~30-60 seconds)\n');
    
    const buildBtn = await page.$('button::-p-text(Build)');
    if (buildBtn) {
      await buildBtn.click();
    }
    
    // Wait for build (check for completion)
    let buildComplete = false;
    for (let i = 0; i < 60; i++) {
      await wait(2000);
      const pageText = await page.evaluate(() => document.body.textContent);
      if (pageText.includes('Build successful') || pageText.includes('successful')) {
        buildComplete = true;
        break;
      }
      if (i % 5 === 0) {
        console.log(`   ... still building (${i * 2}s)`);
      }
    }

    if (buildComplete) {
      console.log('✅ Build successful!\n');
    } else {
      console.log('⏳ Build may still be running...\n');
    }

    await page.screenshot({ path: '/home/clawd/playground-built.png', fullPage: true });

    // Step 8: Deploy
    console.log('🚀 Ready to deploy!');
    console.log('\n' + '='.repeat(50));
    console.log('MANUAL STEPS REQUIRED:');
    console.log('='.repeat(50));
    console.log('1. Look at the browser window that just opened');
    console.log('2. Click the "Deploy" button');
    console.log('3. Connect your wallet (make sure you\'re on DEVNET)');
    console.log('4. Approve the transaction');
    console.log('5. COPY THE PROGRAM ID that appears');
    console.log('6. Paste it back in Discord');
    console.log('='.repeat(50) + '\n');

    // Keep browser open
    console.log('Browser will stay open for 10 minutes...');
    console.log('Press Ctrl+C to close early\n');
    
    await wait(600000); // 10 minutes

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/home/clawd/playground-error.png', fullPage: true });
  } finally {
    console.log('\nClosing browser...');
    await browser.close();
  }
}

deployToPlayground().catch(console.error);
