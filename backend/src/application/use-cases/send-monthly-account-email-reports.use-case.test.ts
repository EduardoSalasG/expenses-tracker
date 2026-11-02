import { describe, expect, it, vi } from 'vitest';
import type { EmailProvider, FinancialAccountRepository } from '../ports.js';
import { InMemoryReportDispatchRepository } from '../../infrastructure/repositories/in-memory.js';
import type { FinanceUseCases } from './finance.use-cases.js';
import { SendMonthlyAccountEmailReportsUseCase } from './send-monthly-account-email-reports.use-case.js';

describe('SendMonthlyAccountEmailReportsUseCase', () => {
  it('emails the PDF to every active member with an email and reserves the account delivery', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const useCase = new SendMonthlyAccountEmailReportsUseCase(
      {
        listAll: async () => [{
          id: 'account-casa', tenantId: 'tenant-1', type: 'shared', name: 'Casa', currency: 'CLP',
          createdByUserId: 'user-owner', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
        }],
        listMembers: async () => [
          { memberId: 'member-1', financialAccountId: 'account-casa', userId: 'user-owner', role: 'owner', status: 'active', firstName: 'Ana', lastName: 'Dueña', preferredName: 'Ana', email: 'ana@example.test', phoneNumber: '+56911111111', createdAt: '', updatedAt: '' },
          { memberId: 'member-2', financialAccountId: 'account-casa', userId: 'user-member', role: 'member', status: 'active', firstName: 'Beto', lastName: 'Miembro', preferredName: 'Beto', email: 'beto@example.test', phoneNumber: '+56922222222', createdAt: '', updatedAt: '' },
          { memberId: 'member-3', financialAccountId: 'account-casa', userId: 'user-invited', role: 'member', status: 'invited', firstName: 'Cata', lastName: 'Invitada', preferredName: 'Cata', email: 'cata@example.test', phoneNumber: '+56933333333', createdAt: '', updatedAt: '' }
        ]
      } as Pick<FinancialAccountRepository, 'listAll' | 'listMembers'>,
      {
        report: vi.fn().mockResolvedValue({
          expenseTotalsByCurrency: { CLP: 5000 }, incomeTotalsByCurrency: { CLP: 12000 },
          expenseVariationByCategory: [{ categoryName: 'Frutas y verduras', currency: 'CLP', currentTotal: 5000 }]
        })
      } as unknown as FinanceUseCases,
      new InMemoryReportDispatchRepository(),
      { send } as unknown as EmailProvider
    );

    await expect(useCase.execute('2026-10')).resolves.toEqual({ month: '2026-10', sent: 2, skipped: 0, failed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map(([message]) => message.to)).toEqual(['ana@example.test', 'beto@example.test']);
    for (const [message] of send.mock.calls) {
      expect(message.attachments?.[0].content.subarray(0, 5).toString()).toBe('%PDF-');
    }

    await expect(useCase.execute('2026-10')).resolves.toEqual({ month: '2026-10', sent: 0, skipped: 2, failed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('builds a personal account report with category comparison and its largest expenses', async () => {
    const render = vi.fn().mockResolvedValue(Buffer.from('%PDF-test'));
    const useCase = new SendMonthlyAccountEmailReportsUseCase(
      {
        listAll: async () => [{ id: 'account-personal', tenantId: 'tenant-1', type: 'personal', name: 'Ana', currency: 'CLP', createdByUserId: 'user-ana', createdAt: '', updatedAt: '' }],
        listMembers: async () => [{ memberId: 'member-1', financialAccountId: 'account-personal', userId: 'user-ana', role: 'owner', status: 'active', firstName: 'Ana', lastName: '', preferredName: 'Ana', email: 'ana@example.test', phoneNumber: '', createdAt: '', updatedAt: '' }]
      } as Pick<FinancialAccountRepository, 'listAll' | 'listMembers'>,
      { report: vi.fn().mockResolvedValue({
        expenseTotalsByCurrency: { CLP: 7500 }, incomeTotalsByCurrency: { CLP: 12000 },
        expenseVariationByCategory: [{ categoryName: 'Alimentos', currency: 'CLP', currentTotal: 5000, previousTotal: 3000 }],
        expenses: [
          { concept: 'Supermercado', amount: 5000, currency: 'CLP', date: '2026-10-25' },
          { concept: 'Transporte', amount: 2500, currency: 'CLP', date: '2026-10-20' }
        ]
      }) } as unknown as FinanceUseCases,
      new InMemoryReportDispatchRepository(),
      { send: vi.fn().mockResolvedValue(undefined) } as unknown as EmailProvider,
      { render } as never
    );

    await expect(useCase.execute('2026-10')).resolves.toMatchObject({ sent: 1, failed: 0 });
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      categories: [{ name: 'Alimentos', currency: 'CLP', total: 5000, previousTotal: 3000 }],
      topExpenses: [
        { concept: 'Supermercado', currency: 'CLP', total: 5000, date: '2026-10-25' },
        { concept: 'Transporte', currency: 'CLP', total: 2500, date: '2026-10-20' }
      ]
    }));
  });

  it('omits members without email and retries a failed recipient without duplicating sent reports', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('temporary provider error'))
      .mockResolvedValueOnce(undefined);
    const useCase = new SendMonthlyAccountEmailReportsUseCase(
      {
        listAll: async () => [{ id: 'account-casa', tenantId: 'tenant-1', type: 'shared', name: 'Casa', currency: 'CLP', createdByUserId: 'user-owner', createdAt: '', updatedAt: '' }],
        listMembers: async () => [
          { memberId: 'member-1', financialAccountId: 'account-casa', userId: 'user-owner', role: 'owner', status: 'active', firstName: 'Ana', lastName: '', preferredName: 'Ana', email: 'ana@example.test', phoneNumber: '', createdAt: '', updatedAt: '' },
          { memberId: 'member-2', financialAccountId: 'account-casa', userId: 'user-member', role: 'member', status: 'active', firstName: 'Beto', lastName: '', preferredName: 'Beto', email: 'beto@example.test', phoneNumber: '', createdAt: '', updatedAt: '' },
          { memberId: 'member-3', financialAccountId: 'account-casa', userId: 'user-no-email', role: 'member', status: 'active', firstName: 'Cata', lastName: '', preferredName: 'Cata', email: undefined, phoneNumber: '', createdAt: '', updatedAt: '' }
        ]
      } as Pick<FinancialAccountRepository, 'listAll' | 'listMembers'>,
      { report: vi.fn().mockResolvedValue({ expenseTotalsByCurrency: {}, incomeTotalsByCurrency: {}, expenseVariationByCategory: [], expenses: [] }) } as unknown as FinanceUseCases,
      new InMemoryReportDispatchRepository(),
      { send } as unknown as EmailProvider,
      { render: vi.fn().mockResolvedValue(Buffer.from('%PDF-test')) } as never
    );

    await expect(useCase.execute('2026-10')).resolves.toEqual({ month: '2026-10', sent: 1, skipped: 1, failed: 1 });
    await expect(useCase.execute('2026-10')).resolves.toEqual({ month: '2026-10', sent: 1, skipped: 2, failed: 0 });
    expect(send.mock.calls.map(([message]) => message.to)).toEqual(['ana@example.test', 'beto@example.test', 'beto@example.test']);
  });

  it('escapes the account name in the email HTML', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const accountName = '<Casa & hogar>';
    const useCase = new SendMonthlyAccountEmailReportsUseCase(
      {
        listAll: async () => [{ id: 'account-safe-html', tenantId: 'tenant-1', type: 'personal', name: accountName, currency: 'CLP', createdByUserId: 'user-ana', createdAt: '', updatedAt: '' }],
        listMembers: async () => [{ memberId: 'member-1', financialAccountId: 'account-safe-html', userId: 'user-ana', role: 'owner', status: 'active', firstName: 'Ana', lastName: '', preferredName: 'Ana', email: 'ana@example.test', phoneNumber: '', createdAt: '', updatedAt: '' }]
      } as Pick<FinancialAccountRepository, 'listAll' | 'listMembers'>,
      { report: vi.fn().mockResolvedValue({ expenseTotalsByCurrency: {}, incomeTotalsByCurrency: {}, expenseVariationByCategory: [], expenses: [] }) } as unknown as FinanceUseCases,
      new InMemoryReportDispatchRepository(),
      { send } as unknown as EmailProvider,
      { render: vi.fn().mockResolvedValue(Buffer.from('%PDF-test')) } as never
    );

    await useCase.execute('2026-10');

    expect(send.mock.calls[0][0].html).toContain('&lt;Casa &amp; hogar&gt;');
    expect(send.mock.calls[0][0].html).not.toContain('<Casa & hogar>');
  });
});
