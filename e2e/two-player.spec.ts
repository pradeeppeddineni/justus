import { test, chromium, type Page } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

async function click(page: Page, text: string | RegExp, timeout = 15000) {
  const el = page.getByText(text).first();
  await el.waitFor({ state: 'attached', timeout });
  await el.click({ force: true });
}

async function typeInto(page: Page, placeholder: string, value: string, timeout = 30000) {
  // Try input first, then textarea (multiline TextInput uses textarea)
  const input = page.locator(`input[placeholder="${placeholder}"], textarea[placeholder="${placeholder}"]`);
  await input.first().waitFor({ state: 'visible', timeout });
  await input.first().fill(value);
  await page.waitForTimeout(200); // Let React re-render state
  // Try Enter first, then fall back to clicking "send" button
  await input.first().press('Enter');
  await page.waitForTimeout(300);
}

// For multiline textareas — type text and click the "send" button
async function typeAndSubmit(page: Page, placeholder: string, value: string, timeout = 30000) {
  const input = page.locator(`input[placeholder="${placeholder}"], textarea[placeholder="${placeholder}"]`);
  await input.first().waitFor({ state: 'visible', timeout });
  await input.first().click();
  await page.keyboard.type(value, { delay: 10 });
  await page.waitForTimeout(500);

  // Try clicking "send" button (TextInput shows it when text is non-empty)
  const sendBtn = page.getByText('send', { exact: true }).first();
  try {
    await sendBtn.waitFor({ state: 'attached', timeout: 3000 });
    await sendBtn.click({ force: true });
  } catch {
    // Fall back to Enter key
    await input.first().press('Enter');
  }
  await page.waitForTimeout(300);
}

async function waitForAct(page: Page, act: string, timeout = 30000) {
  await page.waitForFunction(
    (a) => document.querySelector('.fixed.top-0')?.textContent?.includes(a),
    act,
    { timeout }
  );
}

async function tryClick(page: Page, text: string | RegExp, timeout = 5000) {
  try {
    await click(page, text, timeout);
    return true;
  } catch {
    return false;
  }
}

async function waitForText(page: Page, text: string, timeout = 20000) {
  await page.waitForFunction(
    (t) => document.body.textContent?.includes(t),
    text,
    { timeout }
  );
}

// Draw a simple shape on canvas by simulating mouse events
async function drawOnCanvas(page: Page) {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 8000 });
  const box = await canvas.boundingBox();
  if (!box) return;

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy - 50);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy - 80, { steps: 5 });
  await page.mouse.move(cx + 60, cy - 40, { steps: 5 });
  await page.mouse.move(cx, cy + 40, { steps: 5 });
  await page.mouse.move(cx - 60, cy - 40, { steps: 5 });
  await page.mouse.move(cx - 30, cy - 80, { steps: 5 });
  await page.mouse.move(cx, cy - 50, { steps: 5 });
  await page.mouse.up();
}

test('Two-player full experience', async () => {
  test.setTimeout(900000); // 15 minutes

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  });

  const ctx1 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['camera'],
  });
  const ctx2 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['camera'],
  });

  const p1 = await ctx1.newPage();
  const p2 = await ctx2.newPage();

  // Connect both players
  await p1.goto(APP_URL);
  await p1.waitForFunction(
    () => document.querySelector('.fixed.top-0')?.textContent?.includes('connected'),
    { timeout: 15000 }
  );
  console.log('P1 connected');

  await p2.goto(APP_URL);
  await p2.waitForFunction(
    () => document.querySelector('.fixed.top-0')?.textContent?.includes('connected'),
    { timeout: 15000 }
  );
  console.log('P2 connected');

  // Trigger audio init
  await p1.locator('body').click();
  await p2.locator('body').click();

  // =============================================
  // ACT 0: INVITATION — auto-advances after 3s
  // =============================================
  console.log('\n>>> INVITATION');
  await waitForAct(p1, 'the_lock');
  console.log('  Auto-advanced past invitation');

  // =============================================
  // ACT 1: THE LOCK — both tap
  // =============================================
  console.log('\n>>> THE LOCK');
  await p1.waitForTimeout(3000);

  await click(p1, /Tap when ready|waiting\. Tap/);
  console.log('  P1 tapped');
  await p1.waitForTimeout(300);
  await click(p2, /Tap when ready|waiting\. Tap/);
  console.log('  P2 tapped');

  await waitForAct(p1, 'know_me');
  console.log('  Lock unlocked!');

  // =============================================
  // ACT 2: KNOW ME — 4 questions
  // =============================================
  console.log('\n>>> KNOW ME');
  await p1.waitForTimeout(3500);

  for (let q = 0; q < 4; q++) {
    console.log(`  Q${q + 1}: answering...`);
    await typeInto(p1, 'Type your answer...', `Love answer ${q + 1} from P1`);
    await p1.waitForTimeout(200);
    await typeInto(p2, 'Type your answer...', `Love answer ${q + 1} from P2`);

    await p1.waitForTimeout(1500);
    const isLast = q === 3;
    await tryClick(p1, isLast ? /^finish$/i : /^next$/i);
    await tryClick(p2, isLast ? /^finish$/i : /^next$/i);
    await p1.waitForTimeout(800);
  }

  await p1.waitForTimeout(1000);
  await tryClick(p1, 'continue');
  await tryClick(p2, 'continue');
  console.log('  Know Me complete');

  await waitForAct(p1, 'lie_detector');

  // =============================================
  // ACT 2.5: LIE DETECTOR — 3 rounds
  // =============================================
  console.log('\n>>> LIE DETECTOR');
  await p1.waitForTimeout(3500);

  for (let r = 0; r < 3; r++) {
    console.log(`  Round ${r + 1}:`);
    await p1.waitForTimeout(2000);

    let teller: Page = p1;
    let guesser: Page = p2;
    let tellerName = 'P1';

    const p1HasBtn = p1.getByText("I've told them both").first().waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
    const p2HasBtn = p2.getByText("I've told them both").first().waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
    const [p1Found, p2Found] = await Promise.all([p1HasBtn, p2HasBtn]);

    if (p2Found && !p1Found) {
      teller = p2;
      guesser = p1;
      tellerName = 'P2';
    }
    console.log(`    Teller=${tellerName}`);

    await click(teller, "I've told them both");
    console.log('    Teller done telling');

    await guesser.waitForTimeout(1000);
    const opts = guesser.locator('button.w-full');
    await opts.first().waitFor({ state: 'attached', timeout: 8000 });
    await opts.first().click({ force: true });
    console.log('    Guesser picked');

    await p1.waitForTimeout(2000);
    await tryClick(p1, /next round|finish/i);
    await tryClick(p2, /next round|finish/i);
    await p1.waitForTimeout(1000);
  }

  console.log('  Lie Detector complete');
  await waitForAct(p1, 'through_your_eyes');

  // =============================================
  // ACT 3: THROUGH YOUR EYES — draw + done
  // =============================================
  console.log('\n>>> THROUGH YOUR EYES');
  await p1.waitForTimeout(4000);

  for (let round = 0; round < 2; round++) {
    console.log(`  Draw round ${round + 1}:`);

    await drawOnCanvas(p1);
    console.log('    P1 drew');
    await drawOnCanvas(p2);
    console.log('    P2 drew');

    await tryClick(p1, /^done$/i);
    await tryClick(p2, /^done$/i);
    console.log('    Both clicked done');

    await p1.waitForTimeout(2000);
  }

  await p1.waitForTimeout(3000);
  await tryClick(p1, 'continue');
  await tryClick(p2, 'continue');
  console.log('  Drawing complete');

  await waitForAct(p1, 'heartbeat');

  // =============================================
  // ACT 3.5: HEARTBEAT — camera-based BPM
  // =============================================
  console.log('\n>>> HEARTBEAT');
  await p1.waitForTimeout(3500); // intro

  // Both click "begin" to start measurement
  await click(p1, 'begin');
  console.log('  P1 measuring');
  await p1.waitForTimeout(500);
  await click(p2, 'begin');
  console.log('  P2 measuring');

  // Wait for measurement duration (8s) + processing + network
  await p1.waitForTimeout(12000);

  // Wait for reveal phase
  await waitForText(p1, 'Two hearts');
  console.log('  Heartbeat reveal');

  // Click "bring them together" for merge animation
  await p1.waitForTimeout(3000);
  await tryClick(p1, /bring them together|continue/i);
  await tryClick(p2, /bring them together|continue/i);
  console.log('  Merge animation');

  // Wait for merge animation then click continue
  await p1.waitForTimeout(6000);
  await tryClick(p1, 'continue');
  await tryClick(p2, 'continue');
  console.log('  Heartbeat complete');

  await waitForAct(p1, 'the_unsaid');

  // =============================================
  // ACT 4: THE UNSAID — type, dissolve, reform, reveal
  // =============================================
  console.log('\n>>> THE UNSAID');
  await p1.waitForTimeout(4000); // intro → writing

  await typeAndSubmit(p1, 'Type what was left unsaid...', 'I love you');
  console.log('  P1 typed unsaid');
  await p1.waitForTimeout(500);
  await typeAndSubmit(p2, 'Type what was left unsaid...', 'You mean everything');
  console.log('  P2 typed unsaid');

  // Wait for dissolve → reform → reveal
  await waitForText(p1, 'they said', 45000);
  console.log('  Messages revealed');

  await p1.waitForTimeout(2000);
  await tryClick(p1, 'continue');
  await tryClick(p2, 'continue');
  console.log('  The Unsaid complete');

  await waitForAct(p1, 'rewrite_history');

  // =============================================
  // ACT 4.5: REWRITE HISTORY — 3 memories
  // =============================================
  console.log('\n>>> REWRITE HISTORY');
  await p1.waitForTimeout(4000); // intro

  for (let m = 0; m < 3; m++) {
    console.log(`  Memory ${m + 1}:`);
    await p1.waitForTimeout(5000); // memory display → writing transition

    await typeAndSubmit(p1, 'Whisper to your past self...', `Whisper ${m + 1}`);
    console.log('    P1 whispered');
    await p1.waitForTimeout(300);
    await typeAndSubmit(p2, 'Whisper to your past self...', `Whisper ${m + 1}`);
    console.log('    P2 whispered');

    // Wait for reveal
    await waitForText(p1, 'whispered');
    console.log('    Revealed');

    await p1.waitForTimeout(2500);
    const isLast = m === 2;
    await tryClick(p1, isLast ? /^finish$/i : /next memory/i);
    await tryClick(p2, isLast ? /^finish$/i : /next memory/i);
    await p1.waitForTimeout(1500);
  }

  console.log('  Rewrite History complete');
  await waitForAct(p1, 'come_closer');

  // =============================================
  // ACT 5: COME CLOSER — 4 physical prompts
  // =============================================
  console.log('\n>>> COME CLOSER');
  await p1.waitForTimeout(3500); // intro

  // Config: durations [5, 3, tap, 10]
  const comeCloserPrompts = [
    { duration: 5, hasTap: false },
    { duration: 3, hasTap: false },
    { duration: 0, hasTap: true },   // kiss — tap to continue
    { duration: 10, hasTap: false },  // embrace
  ];

  for (let i = 0; i < comeCloserPrompts.length; i++) {
    const prompt = comeCloserPrompts[i];
    console.log(`  Prompt ${i + 1}:`);

    // Wait for "ready" button to appear on both pages before clicking
    await click(p1, 'ready', 30000);
    await p1.waitForTimeout(500);
    await click(p2, 'ready', 30000);

    if (prompt.hasTap) {
      // Wait for "Tap to continue" text to confirm waiting phase mounted
      await waitForText(p1, 'Tap to continue', 30000);
      console.log('    Waiting phase visible');
      // Click the continue button (use exact match to avoid "Tap to continue" paragraph)
      const continueBtn = p1.locator('button:has-text("continue")').first();
      await continueBtn.waitFor({ state: 'attached', timeout: 10000 });
      await continueBtn.click({ force: true });
      console.log('    Tapped continue');
      await p1.waitForTimeout(500);
    } else if (prompt.duration > 0) {
      // Wait for countdown to finish plus AnimatePresence transitions
      console.log(`    Counting down ${prompt.duration}s...`);
      await p1.waitForTimeout(prompt.duration * 1000 + 3000);
    }

    await p1.waitForTimeout(500);
  }

  console.log('  Come Closer complete');
  await waitForAct(p1, 'heat');

  // =============================================
  // ACT 5.5: HEAT — truth or consequences (4 rounds)
  // =============================================
  console.log('\n>>> HEAT');
  await p1.waitForTimeout(3500); // intro

  for (let r = 0; r < 4; r++) {
    console.log(`  Round ${r + 1}:`);
    await p1.waitForTimeout(1500);

    // P1's turn on even rounds, P2's turn on odd rounds
    const isP1Turn = r % 2 === 0;
    const active = isP1Turn ? p1 : p2;
    const passive = isP1Turn ? p2 : p1;
    const activeName = isP1Turn ? 'P1' : 'P2';

    // Active player clicks "truth"
    await click(active, 'truth');
    console.log(`    ${activeName} chose truth`);

    // Type answer
    await typeAndSubmit(active, 'Type your truth...', `Truth ${r + 1}`);
    console.log(`    ${activeName} answered`);

    // Passive player sees result and clicks next
    await passive.waitForTimeout(2000);
    const isLast = r === 3;
    await tryClick(passive, isLast ? /^finish$/i : /next round/i, 8000);
    console.log(`    ${isP1Turn ? 'P2' : 'P1'} advanced`);
    await p1.waitForTimeout(500);
  }

  console.log('  Heat complete');
  await waitForAct(p1, 'our_moment');

  // =============================================
  // ACT 5.75: OUR MOMENT — camera capture
  // =============================================
  console.log('\n>>> OUR MOMENT');
  await p1.waitForTimeout(3500); // intro

  // Wait for camera to initialize (fake device stream)
  await p1.waitForTimeout(2000);

  // Both capture photos
  await click(p1, 'capture');
  console.log('  P1 captured');
  await p1.waitForTimeout(500);
  await click(p2, 'capture');
  console.log('  P2 captured');

  // Wait for preview (both photos exchanged)
  await p1.waitForTimeout(3000);
  await tryClick(p1, 'continue');
  await tryClick(p2, 'continue');
  console.log('  Our Moment complete');

  await waitForAct(p1, 'the_promise');

  // =============================================
  // ACT 6: THE PROMISE — name a star
  // =============================================
  console.log('\n>>> THE PROMISE');
  await p1.waitForTimeout(3500); // intro
  await p1.waitForTimeout(5500); // starfield phase (5s auto-transition)

  // Naming phase
  await typeInto(p1, 'One word...', 'Forever');
  console.log('  P1 named: Forever');
  await p1.waitForTimeout(500);
  await typeInto(p2, 'One word...', 'Love');
  console.log('  P2 named: Love');

  // Wait for reveal
  await waitForText(p1, 'Your star is named');
  console.log('  Star revealed: Forever Love');

  await p1.waitForTimeout(3500);
  await click(p1, 'continue');
  await p1.waitForTimeout(300);
  await tryClick(p2, 'continue');
  console.log('  The Promise complete');

  await waitForAct(p1, 'the_glitch');

  // =============================================
  // ACT 7: THE GLITCH — credits, glitch, video, end
  // =============================================
  console.log('\n>>> THE GLITCH');

  // Credits: 3 items × 3.5s each + 2s transition = ~12.5s
  console.log('  Credits rolling...');
  await p1.waitForTimeout(14000);
  console.log('  Credits done');

  // Glitch effect: ~2.5s
  await p1.waitForTimeout(3000);
  console.log('  Glitch effect done');

  // Black screen: 2s
  await p1.waitForTimeout(2500);

  // Video phase — video file may not exist, so dispatch ended event
  await p1.waitForTimeout(2000);
  for (const page of [p1, p2]) {
    await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        video.dispatchEvent(new Event('ended'));
      }
    });
  }
  console.log('  Video completed');

  // End phase: "Just us."
  await p1.waitForTimeout(3000);

  // Take final screenshots
  await p1.screenshot({ path: 'e2e/screenshots/p1-end.png' });
  await p2.screenshot({ path: 'e2e/screenshots/p2-end.png' });

  const devText = await p1.locator('.fixed.top-0').textContent().catch(() => '?');
  console.log(`\nFinal state: ${devText?.trim()}`);
  console.log('Screenshots saved to e2e/screenshots/');
  console.log('\n=== EXPERIENCE COMPLETE ===');

  await p1.waitForTimeout(5000);
  await browser.close();
});
