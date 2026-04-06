import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testImage = path.join(__dirname, 'fixtures', 'test-image.jpg')

async function uploadImage(page: import('@playwright/test').Page) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(testImage)
  await expect(page.getByTestId('blur-canvas')).toBeVisible()
}

test.describe('Gaussian Blur Tool', () => {
  test('shows the landing page with drop zone', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Gaussian Blur Tool')).toBeVisible()
    await expect(page.getByTestId('drop-zone')).toBeVisible()
    await expect(page).toHaveScreenshot('landing-page.png')
  })

  test('uploads an image and shows controls', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    await expect(page.getByText('test-image.jpg')).toBeVisible()
    await expect(page.getByRole('slider')).toBeVisible()
    await expect(page.getByTestId('detect-query')).toBeVisible()
    await expect(page.getByTestId('undo-button')).toBeVisible()
    await expect(page.getByTestId('redo-button')).toBeVisible()
    await expect(page).toHaveScreenshot('image-loaded.png')
  })

  test('applies blur to a selected region', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    const canvas = page.getByTestId('blur-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    await canvas.dispatchEvent('mousedown', {
      clientX: box.x + box.width * 0.1,
      clientY: box.y + box.height * 0.1,
    })
    await canvas.dispatchEvent('mousemove', {
      clientX: box.x + box.width * 0.4,
      clientY: box.y + box.height * 0.4,
    })
    await canvas.dispatchEvent('mouseup')

    await page.getByText('Apply Blur').click()
    await expect(page).toHaveScreenshot('blur-applied.png')
  })

  test('undo reverts applied blur', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    const canvas = page.getByTestId('blur-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    await canvas.dispatchEvent('mousedown', {
      clientX: box.x + box.width * 0.1,
      clientY: box.y + box.height * 0.1,
    })
    await canvas.dispatchEvent('mousemove', {
      clientX: box.x + box.width * 0.4,
      clientY: box.y + box.height * 0.4,
    })
    await canvas.dispatchEvent('mouseup')
    await page.getByText('Apply Blur').click()

    const undoButton = page.getByTestId('undo-button')
    await expect(undoButton).toBeEnabled()
    await undoButton.click()
    await expect(page).toHaveScreenshot('after-undo.png')
  })

  test('redo re-applies blur after undo', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    const canvas = page.getByTestId('blur-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    await canvas.dispatchEvent('mousedown', {
      clientX: box.x + box.width * 0.1,
      clientY: box.y + box.height * 0.1,
    })
    await canvas.dispatchEvent('mousemove', {
      clientX: box.x + box.width * 0.4,
      clientY: box.y + box.height * 0.4,
    })
    await canvas.dispatchEvent('mouseup')
    await page.getByText('Apply Blur').click()

    await page.getByTestId('undo-button').click()
    const redoButton = page.getByTestId('redo-button')
    await expect(redoButton).toBeEnabled()
    await redoButton.click()
    await expect(page).toHaveScreenshot('after-redo.png')
  })

  test('applies multiple blur regions', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    const canvas = page.getByTestId('blur-canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    await canvas.dispatchEvent('mousedown', {
      clientX: box.x + box.width * 0.05,
      clientY: box.y + box.height * 0.05,
    })
    await canvas.dispatchEvent('mousemove', {
      clientX: box.x + box.width * 0.3,
      clientY: box.y + box.height * 0.3,
    })
    await canvas.dispatchEvent('mouseup')
    await page.getByText('Apply Blur').click()

    await canvas.dispatchEvent('mousedown', {
      clientX: box.x + box.width * 0.6,
      clientY: box.y + box.height * 0.6,
    })
    await canvas.dispatchEvent('mousemove', {
      clientX: box.x + box.width * 0.9,
      clientY: box.y + box.height * 0.9,
    })
    await canvas.dispatchEvent('mouseup')
    await page.getByText('Apply Blur').click()

    await expect(page).toHaveScreenshot('multiple-regions-blurred.png')
  })

  test('adjusts blur radius with slider', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    const slider = page.getByRole('slider')
    await slider.fill('40')

    await expect(page.getByText('40')).toBeVisible()
    await expect(page).toHaveScreenshot('radius-adjusted.png')
  })

  test('removes image and returns to drop zone', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    await page.getByText('Remove image').click()
    await expect(page.getByTestId('drop-zone')).toBeVisible()
    await expect(page).toHaveScreenshot('image-removed.png')
  })
})

test.describe('Auto-Detect Smoke Tests', () => {
  test('shows detect query input with placeholder', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    const queryInput = page.getByTestId('detect-query')
    await expect(queryInput).toBeVisible()
    await expect(queryInput).toHaveAttribute(
      'placeholder',
      'What to blur, e.g. license plate, face, screen'
    )
  })

  test('shows searching status when query is entered', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    const queryInput = page.getByTestId('detect-query')
    await queryInput.fill('person')

    await expect(page.getByTestId('detecting-status')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('detecting-status')).toContainText('person')
  })

  test('completes detection round-trip on a real image', async ({ page }) => {
    test.setTimeout(180000)

    await page.goto('/')
    await uploadImage(page)

    const queryInput = page.getByTestId('detect-query')
    await queryInput.fill('laptop')

    // Wait for model download and detection to complete
    await expect(page.getByTestId('detecting-status')).toBeHidden({ timeout: 180000 })

    // Either we get a detection result or a no-match message — both are
    // valid outcomes. This smoke test verifies the round-trip works,
    // not the model's accuracy.
    const noMatch = page.getByText(/no matching objects/i)
    const blurAll = page.getByTestId('blur-all-detected')
    await expect(noMatch.or(blurAll)).toBeVisible()
  })

  test('does not trigger detection with empty query', async ({ page }) => {
    await page.goto('/')
    await uploadImage(page)

    const queryInput = page.getByTestId('detect-query')
    await expect(queryInput).toBeVisible()

    await expect(page.getByTestId('detecting-status')).toBeHidden()
  })
})
