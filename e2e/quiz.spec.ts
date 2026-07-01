import { test, expect } from '@playwright/test'

test('Quiz-Flow mit gemocktem Spotify', async ({ page }) => {
  await page.route('**/v1/albums/**/tracks**', (r) =>
    r.fulfill({ json: { items: [{ uri: 'spotify:track:1', duration_ms: 120000 }] } }))
  await page.route('**/v1/me/player/devices', (r) =>
    r.fulfill({ json: { devices: [{ id: 'dev1', is_active: true }] } }))
  await page.route('**/v1/me/player/play**', (r) => r.fulfill({ status: 204, body: '' }))
  await page.route('**/v1/me/player/pause**', (r) => r.fulfill({ status: 204, body: '' }))

  // Deterministically pick the first Folge instead of a random one.
  await page.addInitScript(() => {
    Math.random = () => 0
  })

  await page.goto('./')
  await page.evaluate(() => {
    sessionStorage.setItem('hq.token', 'TOK')
    sessionStorage.setItem('hq.expires', String(Date.now() + 3_600_000))
  })
  await page.goto('./#/quiz')

  await expect(page.locator('#play')).toBeVisible()
  await page.fill('#guess', '125')
  await page.click('#check')
  // Data-independent: the result screen shows the sought "Folge <Nr> – <Titel>",
  // regardless of which episodes are configured in folgen.json.
  await expect(page.locator('.result')).toContainText(/Folge \d+ – /)
})

test('ungültige Eingabe zeigt Fehler', async ({ page }) => {
  await page.route('**/v1/albums/**/tracks**', (r) =>
    r.fulfill({ json: { items: [{ uri: 'spotify:track:1', duration_ms: 120000 }] } }))
  await page.route('**/v1/me/player/devices', (r) =>
    r.fulfill({ json: { devices: [{ id: 'dev1', is_active: true }] } }))

  await page.goto('./')
  await page.evaluate(() => {
    sessionStorage.setItem('hq.token', 'TOK')
    sessionStorage.setItem('hq.expires', String(Date.now() + 3_600_000))
  })
  await page.goto('./#/quiz')

  await expect(page.locator('#play')).toBeVisible()
  await page.fill('#guess', 'abc')
  await page.click('#check')
  await expect(page.locator('#status.error')).toContainText('ganze Zahl')
})
