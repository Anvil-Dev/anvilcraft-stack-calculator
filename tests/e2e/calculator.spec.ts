import { expect, test, type Page } from 'playwright/test'

async function waitForSingleResult(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector('.material-line strong')?.textContent?.trim() === '110')
}

test('calculates the proven single-unit layout and renders nonblank WebGL', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')
  await waitForSingleResult(page)

  await expect(page.locator('.topbar-status .arco-tag')).toContainText('已证明最优')
  await expect(page.locator('.material-line strong')).toHaveText(['110', '14', '1'])
  await expect(page.locator('[role="gridcell"]')).toHaveCount(25)

  const pixels = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return { nonBackground: 0, uniqueColors: 0, error: -1 }
    const data = new Uint8Array(canvas.width * canvas.height * 4)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data)
    let nonBackground = 0
    const colors = new Set<string>()
    for (let index = 0; index < data.length; index += 64) {
      const color = `${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`
      colors.add(color)
      if (color !== '23,26,31,255') nonBackground += 1
    }
    return { nonBackground, uniqueColors: colors.size, error: gl.getError() }
  })
  expect(pixels.nonBackground).toBeGreaterThan(500)
  expect(pixels.uniqueColors).toBeGreaterThan(20)
  expect(pixels.error).toBe(0)

  const visibilitySwitches = page.locator('.switch-line .arco-switch')
  await visibilitySwitches.nth(0).click()
  await visibilitySwitches.nth(2).click()
  await page.waitForTimeout(100)
  const negativeMatterPixels = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return { outline: 0, purpleBody: 0 }
    const data = new Uint8Array(canvas.width * canvas.height * 4)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data)
    let outline = 0
    let purpleBody = 0
    for (let index = 0; index < data.length; index += 16) {
      const red = data[index] ?? 0
      const green = data[index + 1] ?? 0
      const blue = data[index + 2] ?? 0
      if (red > 245 && green > 245 && blue > 245) outline += 1
      if (blue > red && red > 140 && green > 130) purpleBody += 1
    }
    return { outline, purpleBody }
  })
  expect(negativeMatterPixels.outline).toBeGreaterThan(100)
  expect(negativeMatterPixels.purpleBody).toBeGreaterThan(150)
  expect(pageErrors).toEqual([])
})

test('switches to plutonium assets without changing the valid topology', async ({ page }) => {
  await page.goto('/')
  await waitForSingleResult(page)
  await page.locator('input[value="plutonium-heat"]').evaluate((input: HTMLInputElement) => input.click())
  await page.waitForFunction(() => document.querySelector('.material-section img')?.getAttribute('src')?.includes('plutonium'))

  await expect(page.locator('.material-line strong')).toHaveText(['110', '14', '1'])
  await expect(page.locator('.topbar-status .arco-tag')).toContainText('已证明最优')
})

test('keeps the calculator within all target viewport widths', async ({ page }) => {
  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 })
    await page.goto('/')
    await waitForSingleResult(page)
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.documentElement.clientWidth + 1)
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false)
  }
})
