import { parseIncomeFilterParams, serializeIncomeFilters } from './incomes.component';

describe('income filter parameters', () => {
  it('restores and serializes a canonical concept search', () => {
    expect(parseIncomeFilterParams({ month: '2026-09', concept: '  Sueldo  ', currency: 'clp' })).toEqual({
      month: '2026-09', concept: 'Sueldo', currency: 'CLP'
    });
    expect(serializeIncomeFilters({ month: '2026-09', concept: 'Sueldo', currency: 'CLP' })).toEqual({
      month: '2026-09', concept: 'Sueldo', currency: 'CLP'
    });
  });
});
