import { test as base, expect, Page } from '@playwright/test'

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

async function waitForWebSocketConnection(page: Page): Promise<void> {
  await expect(page.getByText('接続中')).toBeVisible({ timeout: 15000 })
}

export const test = base.extend<{ pageReady: Page }>({
  pageReady: async ({ page }, use) => {
    await page.goto('/')
    await waitForPageReady(page)
    await use(page)
  },
})

export { expect, waitForWebSocketConnection }
