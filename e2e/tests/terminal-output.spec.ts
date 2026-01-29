import { test, expect, waitForWebSocketConnection } from '../fixtures/base'

test.describe('Terminal Output', () => {
  test('should display the terminal output area', async ({ pageReady: page }) => {
    await waitForWebSocketConnection(page)
    // Terminal area uses pre-formatted styling for output
    const terminalArea = page.locator('[style*="overflow"]').first()
    await expect(terminalArea).toBeVisible()
  })

  test('should display tmux output when session exists', async ({ pageReady: page }) => {
    await waitForWebSocketConnection(page)
    // Terminal shows either tmux prompt output or empty placeholder
    const promptText = page.locator('text=/\\$/')
    const placeholder = page.getByText('tmux出力がここに表示されます...')
    await expect(promptText.first().or(placeholder)).toBeVisible({ timeout: 10000 })
  })
})
