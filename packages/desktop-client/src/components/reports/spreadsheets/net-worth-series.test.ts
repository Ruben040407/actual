import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  NetWorthSeries,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { enUS } from 'date-fns/locale';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createNetWorthReport,
  getSeriesDifference,
  mergeNetWorthSeries,
} from './net-worth-series';
import type { NetWorthReportData } from './net-worth-series';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

type MonthAmount = { date: string; amount: number };

const broker = {
  id: 'broker',
  name: 'Broker',
  offbudget: 1,
  closed: 0,
  sort_order: 0,
  last_reconciled: null,
  tombstone: 0,
  account_group_id: null,
  account_id: null,
  bank: null,
  bankName: null,
  bankId: null,
  mask: null,
  official_name: null,
  balance_current: null,
  balance_available: null,
  balance_limit: null,
  account_sync_source: null,
  last_sync: null,
  bank_sync_status: null,
} satisfies AccountEntity;

function seriesCondition(tag: string): RuleConditionEntity {
  return { field: 'notes', op: 'is', value: tag, type: 'string' };
}

function createSeries(id: string, name: string): NetWorthSeries {
  return {
    id,
    name,
    conditions: [seriesCondition(id)],
    conditionsOp: 'and',
  };
}

function findSeriesTag(filterExpressions: ReadonlyArray<unknown>) {
  for (const expression of filterExpressions) {
    if (
      typeof expression === 'object' &&
      expression !== null &&
      '$and' in expression &&
      Array.isArray(expression.$and)
    ) {
      for (const filter of expression.$and) {
        if (
          typeof filter === 'object' &&
          filter !== null &&
          'series' in filter &&
          typeof filter.series === 'string'
        ) {
          return filter.series;
        }
      }
    }
  }
  return null;
}

// Each series gets its own starting balance and monthly sums, so the
// concurrent queries of different series can be answered independently.
async function runReport(
  series: NetWorthSeries[],
  bySeries: Record<string, { starting: number; months: MonthAmount[] }>,
) {
  initServer({
    // Tag each series' filter so the query handler can tell them apart.
    'make-filters-from-conditions': async ({ conditions }) => ({
      filters: Array.isArray(conditions)
        ? conditions.map(condition => ({ series: condition.value }))
        : [],
    }),
    'get-earliest-transaction': async () => ({ date: '2026-07-01' }),
    query: async query => {
      if (query.selectExpressions.includes('transfer_id')) {
        return { data: [], dependencies: [] };
      }
      const tag = findSeriesTag(query.filterExpressions);
      const fixture = tag ? bySeries[tag] : undefined;
      if (!fixture) {
        throw new Error(`Unexpected query for series ${tag}`);
      }
      return {
        data: query.calculation ? fixture.starting : fixture.months,
        dependencies: [],
      };
    },
  });

  let report: NetWorthReportData | undefined;
  await createNetWorthReport(
    series,
    '2026-07',
    '2026-08',
    [broker],
    enUS,
    'Monthly',
    '0',
    value => String(value),
  )(undefined as never, data => {
    report = data;
  });

  if (!report) {
    throw new Error('Report did not produce data');
  }
  return report;
}

afterEach(async () => {
  await clearServer();
});

describe('createNetWorthReport', () => {
  it('returns no overlay for a single series', async () => {
    const report = await runReport([createSeries('value', 'Value')], {
      value: { starting: 100_000, months: [{ date: '2026-08', amount: 500 }] },
    });

    expect(report.overlay).toBeNull();
    expect(report.primary.graphData.data.map(point => point.y)).toEqual([
      100_000, 100_500,
    ]);
  });

  it('overlays contributions and value with their difference', async () => {
    const series = [
      createSeries('value', 'Value'),
      createSeries('contributions', 'Contributions'),
    ];
    const report = await runReport(series, {
      // A market gain in July, then a deposit in August.
      value: {
        starting: 100_000,
        months: [
          { date: '2026-07', amount: 5_000 },
          { date: '2026-08', amount: 20_000 },
        ],
      },
      contributions: {
        starting: 90_000,
        months: [{ date: '2026-08', amount: 20_000 }],
      },
    });

    expect(report.primary.netWorth).toBe(125_000);
    expect(report.overlay?.map(point => point.values)).toEqual([
      { value: 105_000, contributions: 90_000 },
      { value: 125_000, contributions: 110_000 },
    ]);
    expect(
      report.overlay?.map(point => getSeriesDifference(point, series)),
    ).toEqual([15_000, 15_000]);
  });

  it('draws a series without matching transactions as zero', async () => {
    const report = await runReport(
      [createSeries('value', 'Value'), createSeries('empty', 'Empty')],
      {
        value: { starting: 1_000, months: [] },
        empty: { starting: 0, months: [] },
      },
    );

    expect(report.overlay?.map(point => point.values.empty)).toEqual([0, 0]);
  });
});

describe('mergeNetWorthSeries', () => {
  it('leaves a gap where a series has no point for an interval', () => {
    const merged = mergeNetWorthSeries(
      ['a', 'b'],
      [
        {
          graphData: {
            data: [
              { x: 'Jul', y: 1, date: 'July' },
              { x: 'Aug', y: 2, date: 'August' },
            ],
          },
        },
        { graphData: { data: [{ x: 'Aug', y: 5, date: 'August' }] } },
      ],
    );

    expect(merged).toEqual([
      { x: 'Jul', date: 'July', values: { a: 1, b: null } },
      { x: 'Aug', date: 'August', values: { a: 2, b: 5 } },
    ]);
  });
});

describe('getSeriesDifference', () => {
  const point = { x: 'Aug', date: 'August', values: { a: 10, b: 4, c: 1 } };

  it('subtracts the second series from the first', () => {
    expect(getSeriesDifference(point, [{ id: 'a' }, { id: 'b' }])).toBe(6);
  });

  it('is only shown for exactly two series', () => {
    expect(
      getSeriesDifference(point, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
    ).toBeNull();
  });

  it('is empty when one side has no value', () => {
    expect(
      getSeriesDifference({ ...point, values: { a: 10, b: null } }, [
        { id: 'a' },
        { id: 'b' },
      ]),
    ).toBeNull();
  });
});
