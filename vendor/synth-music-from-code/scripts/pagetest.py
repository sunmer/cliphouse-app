import asyncio, time
from playwright.async_api import async_playwright
PAGE = 'page.html'  # path relative to /mnt/user-data/outputs; pass another as argv[1]
async def run(width, height, shot, dark=False):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        t0 = time.time()
        await pg.goto('file:///mnt/user-data/outputs/' + PAGE)
        await pg.wait_for_function("[...document.querySelectorAll('.status')].every(s => s.textContent.includes('LUFS'))", timeout=90000)
        print(f'{width}px: all four ready in {time.time()-t0:.1f}s')
        print('  statuses:', await pg.eval_on_selector_all('.status', 'els => els.map(e => e.textContent)'))
        await pg.click('.track:nth-of-type(2) .play')
        await pg.wait_for_timeout(1500)
        print('  playing class on:', await pg.eval_on_selector_all('.track.playing h2', 'els => els.map(e => e.textContent)'),
              ' playhead x:', await pg.eval_on_selector('.track.playing .playhead', 'e => e.style.transform'))
        await pg.click('.track:nth-of-type(2) .play')
        await pg.screenshot(path=shot, full_page=True)
        print('  errors:', errs or 'none')
        await b.close()
import sys
if len(sys.argv) > 1: PAGE = sys.argv[1]
asyncio.run(run(1100, 900, 'shot_desktop.png'))
asyncio.run(run(390, 844, 'shot_mobile.png', dark=True))
