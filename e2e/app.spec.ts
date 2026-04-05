import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.describe('Gaussian Blur Tool', () => {
  test('shows the landing page with drop zone', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Gaussian Blur Tool')).toBeVisible()
    await expect(page.getByTestId('drop-zone')).toBeVisible()
    await expect(page).toHaveScreenshot('landing-page.png')
  })

  test('uploads an image and shows canvas', async ({ page }) => {
    await page.goto('/')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.png'))

    await expect(page.getByTestId('blur-canvas')).toBeVisible()
    await expect(page.getByText('test-image.png')).toBeVisible()
    await expect(page.getByRole('slider')).toBeVisible()
    await expect(page).toHaveScreenshot('image-loaded.png')
  })

  test('applies blur to a selected region', async ({ page }) => {
    await page.goto('/')

    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.png'))

    await expect(page.getByTestId('blur-canvas')).toBeVisible()

    // Draw a selection region on the canvas
    const canvas = page.getByTestId('blur-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    // Select a region in the top-left quadrant
    await canvas.dispatchEvent('mousedown', {
      clientX: box.x + box.width * 0.1,
      clientY: box.y + box.height * 0.1,
    })
    await canvas.dispatchEvent('mousemove', {
      clientX: box.x + box.width * 0.4,
      clientY: box.y + box.height * 0.4,
    })
    await canvas.dispatchEvent('mouseup')

    // Apply the blur
    await page.getByText('Apply Blur').click()
    await expect(page).toHaveScreenshot('blur-applied.png')
  })

  test('adjusts blur radius with slider', async ({ page }) => {
    await page.goto('/')

    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.png'))

    await expect(page.getByTestId('blur-canvas')).toBeVisible()

    // Change the blur radius
    const slider = page.getByRole('slider')
    await slider.fill('40')

    await expect(page.getByText('40')).toBeVisible()
    await expect(page).toHaveScreenshot('radius-adjusted.png')
  })

  test('removes image and returns to drop zone', async ({ page }) => {
    await page.goto('/')

    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.png'))

    await expect(page.getByTestId('blur-canvas')).toBeVisible()

    // Remove image
    await page.getByText('Remove image').click()
    await expect(page.getByTestId('drop-zone')).toBeVisible()
    await expect(page).toHaveScreenshot('image-removed.png')
  })
})
