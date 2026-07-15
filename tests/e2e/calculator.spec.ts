import { expect, test, type Page } from 'playwright/test'

async function waitForSingleResult(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector('.material-line strong')?.textContent?.trim() === '110')
}

async function waitForPrimaryCount(page: Page, count: string): Promise<void> {
  await page.waitForFunction((expected) => document.querySelector('.material-line strong')?.textContent?.trim() === expected, count)
}

test('calculates the proven single-unit layout and renders nonblank WebGL', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')
  await waitForSingleResult(page)

  const brandIcon = page.locator('.brand-icon')
  await expect(brandIcon).toBeVisible()
  expect(await brandIcon.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1024)
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

test('switches to the feasible plutonium layout and assets', async ({ page }) => {
  await page.goto('/')
  await waitForSingleResult(page)
  await page.locator('input[value="plutonium-heat"]').evaluate((input: HTMLInputElement) => input.click())
  await page.waitForFunction(() => document.querySelector('.material-section img')?.getAttribute('src')?.includes('plutonium'))
  await waitForPrimaryCount(page, '88')

  await expect(page.locator('.material-line strong')).toHaveText(['88', '36', '1'])
  await expect(page.locator('.topbar-status .arco-tag')).toContainText('可行方案')
  await expect(page.locator('.metrics-strip')).toContainText('33–36')

  const visibilitySwitches = page.locator('.switch-line .arco-switch')
  await visibilitySwitches.nth(0).click()
  await visibilitySwitches.nth(1).click()
  const canvas = page.locator('canvas')
  await canvas.hover()
  await page.mouse.wheel(0, -4000)
  await page.waitForTimeout(300)
  const heatCollectorPixels = await canvas.evaluate((element: HTMLCanvasElement) => {
    const gl = element.getContext('webgl2') ?? element.getContext('webgl')
    if (!gl) return { blueCore: 0, orangeFrame: 0 }
    const data = new Uint8Array(element.width * element.height * 4)
    gl.readPixels(0, 0, element.width, element.height, gl.RGBA, gl.UNSIGNED_BYTE, data)
    let blueCore = 0
    let orangeFrame = 0
    for (let index = 0; index < data.length; index += 16) {
      const red = data[index] ?? 0
      const green = data[index + 1] ?? 0
      const blue = data[index + 2] ?? 0
      if (blue > red * 1.2 && blue > 120) blueCore += 1
      if (red > 180 && green > 70 && green < 190 && blue < 160) orangeFrame += 1
    }
    return { blueCore, orangeFrame }
  })
  expect(heatCollectorPixels.blueCore).toBeGreaterThan(100)
  expect(heatCollectorPixels.orangeFrame).toBeGreaterThan(100)
})

test('solves one repeatable unit without quantity inputs', async ({ page }) => {
  await page.goto('/')
  await waitForSingleResult(page)
  await expect(page.locator('.arco-input-number')).toHaveCount(0)
  await expect(page.locator('.unit-definition')).toContainText('不复制')

  await page.locator('input[value="planar"]').evaluate((input: HTMLInputElement) => input.click())
  await waitForPrimaryCount(page, '93')
  await expect(page.locator('.material-line strong')).toHaveText(['93', '31', '1'])
  await expect(page.locator('.unit-definition')).toContainText('X / Z')
  await expect(page.locator('.arco-input-number')).toHaveCount(0)

  await page.locator('input[value="volumetric"]').evaluate((input: HTMLInputElement) => input.click())
  await waitForPrimaryCount(page, '90')
  await expect(page.locator('.material-line strong')).toHaveText(['90', '34', '1'])
  await expect(page.locator('.unit-definition')).toContainText('X / Y / Z')
  await expect(page.locator('.arco-input-number')).toHaveCount(0)
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
