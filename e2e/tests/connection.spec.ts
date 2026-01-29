import { test, expect, waitForWebSocketConnection } from '../fixtures/base'

test.describe('WebSocket Connection', () => {
  test('should show connection status after page load', async ({ pageReady: page }) => {
    const statusChip = page.locator('.MuiChip-root')
    await expect(statusChip).toBeVisible({ timeout: 15000 })
  })

  test('should show connected status indicator in green', async ({ pageReady: page }) => {
    await waitForWebSocketConnection(page)
    const connectedChip = page.locator('.MuiChip-colorSuccess')
    await expect(connectedChip).toBeVisible()
    await expect(connectedChip).toContainText('接続中')
  })
})
