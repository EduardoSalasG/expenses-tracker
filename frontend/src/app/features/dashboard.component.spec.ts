import { memberPeriodBalanceState } from './dashboard.component';

describe('memberPeriodBalanceState', () => {
  it('classifies positive, negative, and settled member balances', () => {
    expect(memberPeriodBalanceState(9000)).toBe('credit');
    expect(memberPeriodBalanceState(-9000)).toBe('debt');
    expect(memberPeriodBalanceState(0)).toBe('settled');
  });
});
