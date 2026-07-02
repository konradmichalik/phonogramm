import { test, expect } from '@playwright/test'

async function mockSpotify(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/v1/albums/**/tracks**', (r) =>
    r.fulfill({ json: { items: [{ uri: 'spotify:track:1', duration_ms: 120000 }] } }))
  await page.route('**/v1/me/player/devices', (r) =>
    r.fulfill({ json: { devices: [{ id: 'dev1', is_active: true }] } }))
  await page.route('**/v1/me/player/play**', (r) => r.fulfill({ status: 204, body: '' }))
  await page.route('**/v1/me/player/pause**', (r) => r.fulfill({ status: 204, body: '' }))
}

async function seedTokenAndGoToQuiz(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('./')
  await page.evaluate(() => {
    sessionStorage.setItem('phonogramm.token', 'TOK')
    sessionStorage.setItem('phonogramm.expires', String(Date.now() + 3_600_000))
  })
  await page.goto('./#/quiz')
}

test('Quiz-Flow mit gemocktem Spotify: abspielen, scrubben, prüfen', async ({ page }) => {
  await mockSpotify(page)

  // Deterministically pick the first Folge instead of a random one.
  await page.addInitScript(() => {
    Math.random = () => 0
  })

  await seedTokenAndGoToQuiz(page)

  await expect(page.locator('#play')).toBeVisible()

  const playRequest = page.waitForRequest('**/v1/me/player/play**')
  await page.click('#play')
  await playRequest

  const fwdPlayRequest = page.waitForRequest('**/v1/me/player/play**')
  await page.click('#fwd10')
  await fwdPlayRequest

  await page.fill('#guess', '125')
  await page.click('#check')
  // Data-independent: the result screen shows the sought "Folge <Nr> – <Titel>",
  // regardless of which episodes are configured in folgen.json.
  await expect(page.locator('.result')).toContainText(/Folge \d+ – /)
})

test('ungültige Eingabe zeigt Fehler', async ({ page }) => {
  await mockSpotify(page)

  await seedTokenAndGoToQuiz(page)

  await expect(page.locator('#play')).toBeVisible()
  await page.fill('#guess', 'abc')
  await page.click('#check')
  await expect(page.locator('#status.error')).toContainText('ganze Zahl')
})

test('Andere Folge lädt eine neue Runde', async ({ page }) => {
  await mockSpotify(page)

  await seedTokenAndGoToQuiz(page)
  await expect(page.locator('#play')).toBeVisible()

  const tracksRequest = page.waitForRequest('**/v1/albums/**/tracks**')
  await page.click('#skip')
  await tracksRequest

  await expect(page.locator('#play')).toBeVisible()
})

test('Beenden zeigt eine Zusammenfassung mit Richtig/Falsch-Zählung', async ({ page }) => {
  await mockSpotify(page)
  await page.addInitScript(() => {
    Math.random = () => 0
  })

  await seedTokenAndGoToQuiz(page)
  await expect(page.locator('#play')).toBeVisible()

  // Runde 1: rng()===0 wählt deterministisch Folge 1 → richtig beantworten.
  await page.fill('#guess', '1')
  await page.click('#check')
  await expect(page.locator('.result-headline')).toHaveText('Richtig')

  const tracksRequest = page.waitForRequest('**/v1/albums/**/tracks**')
  await page.click('#next')
  await tracksRequest

  // Runde 2: Folge 1 ist jetzt ausgeschlossen → rng()===0 wählt Folge 2 → falsch beantworten.
  await page.fill('#guess', '999')
  await page.click('#check')
  await expect(page.locator('.result-headline')).toHaveText('Leider nicht')

  await page.click('#finish')

  await expect(page.getByText('1 von 2 richtig · 50%')).toBeVisible()
})

test('Beenden auf dem Quiz-Screen zeigt eine leere Zusammenfassung', async ({ page }) => {
  await mockSpotify(page)

  await seedTokenAndGoToQuiz(page)
  await expect(page.locator('#play')).toBeVisible()

  await page.click('#finish')

  await expect(page.getByText('Keine Runde gespielt.')).toBeVisible()
})
