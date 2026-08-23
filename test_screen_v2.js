const { chromium } = require('playwright');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  try {
    console.log('Launching Chrome...');
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1024 }
    });
    const page = await context.newPage();
    console.log('Browser launched');
    
    // Navigate and hard refresh
    console.log('\nNavigating to http://localhost:3001 with hard refresh...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Hard refresh equivalent - reload with cache bypass
    await page.reload({ waitUntil: 'networkidle' });
    console.log('Hard refresh complete');
    await sleep(2000);
    
    // Ensure SCREEN atelier
    console.log('\n=== STEP 1: Ensuring SCREEN atelier ===');
    const screenButton = await page.locator('button:has-text("SCREEN")').first();
    await screenButton.click();
    await sleep(1000);
    
    // Step 2: Portrait source
    console.log('\n=== STEP 2: Portrait source (Lacquer) ===');
    const portraitButton = await page.locator('button:has-text("Portrait")').first();
    await portraitButton.click();
    console.log('Portrait clicked, waiting 12 seconds for painting...');
    await sleep(12000);
    
    // Get canvas element
    const canvas = await page.locator('canvas').first();
    
    // Screenshot panel close-up
    if (canvas) {
      await canvas.screenshot({ path: '/tmp/screenshots/v2_portrait_lacquer.png' });
      console.log('✓ Screenshot: v2_portrait_lacquer.png');
    }
    
    // Screenshot full page
    await page.screenshot({ path: '/tmp/screenshots/v2_portrait_full.png', fullPage: true });
    console.log('✓ Screenshot: v2_portrait_full.png');
    
    // Step 3: Gold leaf ground
    console.log('\n=== STEP 3: Portrait with Gold leaf ===');
    const goldLeafButton = await page.locator('button:has-text("Gold leaf")').first();
    await goldLeafButton.click();
    console.log('Gold leaf clicked, waiting 8 seconds...');
    await sleep(8000);
    
    if (canvas) {
      await canvas.screenshot({ path: '/tmp/screenshots/v2_portrait_gold.png' });
      console.log('✓ Screenshot: v2_portrait_gold.png');
    }
    
    // Step 4: Courtyard source
    console.log('\n=== STEP 4: Courtyard source ===');
    const courtyardButton = await page.locator('button:has-text("Courtyard")').first();
    await courtyardButton.click();
    console.log('Courtyard clicked, waiting 10 seconds...');
    await sleep(10000);
    
    if (canvas) {
      await canvas.screenshot({ path: '/tmp/screenshots/v2_courtyard.png' });
      console.log('✓ Screenshot: v2_courtyard.png');
    }
    
    // Step 5: Plant source
    console.log('\n=== STEP 5: Plant source ===');
    const plantButton = await page.locator('button:has-text("Plant")').first();
    await plantButton.click();
    console.log('Plant clicked, waiting 8 seconds...');
    await sleep(8000);
    
    if (canvas) {
      await canvas.screenshot({ path: '/tmp/screenshots/v2_plant.png' });
      console.log('✓ Screenshot: v2_plant.png');
    }
    
    console.log('\n=== V2 Testing Complete ===');
    console.log('All screenshots saved to /tmp/screenshots/');
    
    await browser.close();
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
