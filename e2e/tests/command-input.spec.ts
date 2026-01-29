import { test, expect, waitForWebSocketConnection } from '../fixtures/base'

test.describe('Command Input', () => {
  test('should have a command input field', async ({ pageReady: page }) => {
    const input = page.getByRole('textbox')
    await expect(input).toBeVisible()
  })

  test('should allow typing and sending a command', async ({ pageReady: page }) => {
    await waitForWebSocketConnection(page)

    const input = page.getByRole('textbox')
    await input.fill('echo hello')

    const sendButton = page.getByRole('button', { name: '送信' })
    await expect(sendButton).toBeEnabled()
    await sendButton.click()
  })

  test('should have a working Enter key send button', async ({ pageReady: page }) => {
    await waitForWebSocketConnection(page)

    const enterButton = page.getByRole('button', { name: 'Enter' })
    await expect(enterButton).toBeVisible()
    await enterButton.click()
  })
})
