import type { FinancialAccountRepository, PushDeliveryRepository, PushSubscriptionRepository } from '../ports.js';

export class QueueSharedExpensePushUseCase {
  constructor(
    private readonly accounts: Pick<FinancialAccountRepository, 'findById' | 'listMembers'>,
    private readonly subscriptions: Pick<PushSubscriptionRepository, 'listActiveByUserIds'>,
    private readonly deliveries: Pick<PushDeliveryRepository, 'enqueue'>
  ) {}

  async execute(expense: { id: string; financialAccountId?: string; createdByUserId: string; concept: string; amount: number; currency: string }) {
    if (!expense.financialAccountId) return;
    const account = await this.accounts.findById(expense.financialAccountId);
    if (!account || account.type !== 'shared') return;

    const members = await this.accounts.listMembers(account.id);
    const subscriptions = await this.subscriptions.listActiveByUserIds(
      members
        .filter((member) => member.status === 'active' && member.userId !== expense.createdByUserId)
        .map((member) => member.userId)
    );
    const payload = {
      title: `Gasto creado - cuenta ${account.name}`,
      body: `${expense.concept} ${formatAmount(expense.amount)} ${expense.currency}`,
      url: `/expenses?expenseId=${encodeURIComponent(expense.id)}`
    };
    await Promise.all(subscriptions.map((subscription) => this.deliveries.enqueue({
      expenseId: expense.id,
      subscriptionId: subscription.id,
      payload
    })));
  }
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(amount);
}
