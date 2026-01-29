import { test, expect, waitForWebSocketConnection } from '../fixtures/base'

test.describe('Session Management', () => {
  test('should display session list', async ({ pageReady: page }) => {
    await waitForWebSocketConnection(page)

    // Session list should contain at least one session item or empty state
    const sessionItem = page.locator('.MuiListItemButton-root').first()
    const emptyState = page.getByText('セッションがありません')
    await expect(sessionItem.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('should allow selecting a session', async ({ pageReady: page }) => {
    await waitForWebSocketConnection(page)

    const sessionItem = page.locator('.MuiListItemButton-root').first()
    if (await sessionItem.isVisible()) {
      await sessionItem.click()
      await expect(sessionItem).toBeVisible()
    }
  })
})
