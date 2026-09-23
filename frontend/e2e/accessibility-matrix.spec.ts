import { expect, test } from '@playwright/test';

const publicRoutes = [
  { path: '/', title: 'Expenses Tracker | Controla gastos, ingresos y presupuesto' },
  { path: '/en', title: 'Expenses Tracker | Track spending, income, and budget' },
  { path: '/login', title: 'Expenses Tracker' },
  { path: '/terms', title: 'Términos y condiciones | Expenses Tracker' },
  { path: '/privacy', title: 'Privacidad de datos | Expenses Tracker' }
] as const;

const demoUser = {
  id: 'demo-user',
  tenantId: 'demo-tenant',
  email: 'demo@example.com',
  phoneNumber: '+56912345678',
  firstName: 'Demo',
  lastName: 'User',
  preferredName: 'Demo',
  role: 'consumer',
  countryOfResidence: 'Chile',
  preferredCurrency: 'CLP',
  preferredLanguage: 'es',
  reportPreferences: []
};

const demoAccount = {
  id: 'demo-account',
  tenantId: 'demo-tenant',
  type: 'personal',
  name: 'Cuenta demo',
  currency: 'CLP',
  createdByUserId: 'demo-user',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
} as const;

const demoBank = {
  id: 'long-demo-bank',
  name: 'Banco Internacional de Pruebas y Operaciones Financieras',
  isDefault: false
} as const;

async function prepareDemoSession(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('expenses_tracker_access_token', 'local-demo-access-token');
    localStorage.setItem('expenses_tracker_refresh_token', 'local-demo-refresh-token');
    localStorage.setItem('expenses_tracker_language', 'es');
    for (const flow of ['dashboard', 'expenses', 'incomes', 'budgets', 'categories', 'settings']) {
      localStorage.setItem(`expenses-tracker:onboarding:${flow}`, 'done');
    }
  });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith('/me/account-context')
      ? { current: { account: demoAccount, role: 'owner' }, accounts: [{ account: demoAccount, role: 'owner' }] }
      : path.endsWith('/me')
        ? demoUser
        : path.endsWith('/banks')
          ? [demoBank]
        : path.includes('/reports/')
          ? []
          : path.endsWith('/reports')
            ? { expenses: [], incomes: [], expenseTotalsByCurrency: {}, incomeTotalsByCurrency: {}, expenseVariationByCategory: [] }
            : [];
    await route.fulfill({ contentType: 'application/json', json });
  });
}

for (const viewport of [
  { name: 'móvil estrecho', width: 320, height: 720 },
  { name: 'móvil', width: 390, height: 844 },
  { name: 'escritorio', width: 1440, height: 900 }
]) {
  test.describe(`rutas públicas a ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of publicRoutes) {
      test(`${route.path} conserva landmark, título y ancho`, async ({ page }) => {
        await page.goto(route.path);

        await expect(page).toHaveTitle(route.title);
        await expect(page.locator('main')).toHaveCount(1);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
          .toBe(true);
      });
    }
  });
}

test('el enlace para saltar contenido mueve el foco a main en las rutas públicas', async ({ page }) => {
  for (const { path, label } of [
    { path: '/en', label: 'Skip to main content' },
    { path: '/login', label: 'Saltar al contenido principal' },
    { path: '/terms', label: 'Saltar al contenido principal' },
    { path: '/privacy', label: 'Saltar al contenido principal' }
  ]) {
    await page.goto(path);
    await page.getByRole('link', { name: label }).press('Enter');
    await expect(page.locator('main')).toBeFocused();
  }
});

test('el acceso anuncia un error recuperable y conserva las credenciales para reintentar', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      json: { error: 'Invalid phone number or password.' }
    });
  });
  await page.goto('/login');
  await page.getByLabel('Teléfono').fill('+56912345678');
  await page.getByLabel('Contraseña').fill('password-segura');
  await page.locator('form').getByRole('button', { name: 'Iniciar sesión', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText('Teléfono o contraseña incorrectos.');
  await expect(page.getByLabel('Teléfono')).toHaveValue('+56912345678');
  await expect(page.getByLabel('Contraseña')).toHaveValue('password-segura');
});

for (const viewport of [
  { name: 'móvil estrecho', width: 320, height: 720 },
  { name: 'móvil', width: 390, height: 844 },
  { name: 'escritorio', width: 1440, height: 900 }
]) {
  test.describe(`rutas autenticadas con demo local a ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of ['/dashboard', '/expenses', '/incomes', '/budgets', '/categories', '/settings']) {
      test(`${path} conserva su ruta y ancho`, async ({ page }) => {
        await prepareDemoSession(page);
        await page.goto(path);

        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await expect(page.locator('main')).toHaveCount(1);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
          .toBe(true);
      });
    }
  });
}

test('gastos conserva filtros vacíos y ofrece limpiarlos', async ({ page }) => {
  await prepareDemoSession(page);
  await page.goto('/expenses?month=2026-09&concept=sin-resultados');

  const emptyState = page.locator('app-empty-state');
  await expect(emptyState.getByRole('button', { name: 'Limpiar' })).toBeVisible();
  await emptyState.getByRole('button', { name: 'Limpiar' }).click();
  await expect(page).toHaveURL(/\/expenses\?month=2026-09$/);
});

test('gastos conserva un banco de nombre largo sin overflow a 320 px', async ({ page }) => {
  await prepareDemoSession(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/expenses?month=2026-09&bankOptionId=long-demo-bank');

  await expect(page.getByTestId('expense-active-filter-summary').getByText('Banco Internacional de Pruebas y Operaciones Financieras')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('configuración permite recorrer catálogos con teclado y anuncia sus acciones', async ({ page }) => {
  await prepareDemoSession(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/settings');

  await page.getByRole('button', { name: /Bancos y medios de pago/ }).press('Enter');
  await expect(page.getByRole('button', { name: 'Volver a configuración' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Eliminar' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver a configuración' }).press('Enter');
  await expect(page.getByRole('button', { name: /Bancos y medios de pago/ })).toBeVisible();
});

test.describe('preferencia de movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('conserva feedback no vestibular en los controles públicos', async ({ page }) => {
    await page.goto('/login');
    const motion = await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        transitionProperty: style.transitionProperty,
        transitionDuration: style.transitionDuration
      };
    });

    expect(motion.scrollBehavior).toBe('auto');
    expect(motion.transitionProperty).not.toContain('transform');
    expect(motion.transitionDuration).not.toBe('0s');
  });
});

test.describe('tema oscuro', () => {
  test.use({ colorScheme: 'dark', viewport: { width: 390, height: 844 } });

  test('mantiene el contenido público legible y dentro del viewport', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('main')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    const colors = await page.locator('body').evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, foreground: style.color };
    });

    expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.foreground).not.toBe(colors.background);
  });
});
