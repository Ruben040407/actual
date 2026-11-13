import type {
  AccountEntity,
  NetWorthSeries,
} from '@actual-app/core/types/models';
import type { Locale } from 'date-fns';

import { getColorScale } from '#components/reports/chart-theme';
import type { FormatType } from '#hooks/useFormat';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';

import { createSpreadsheet } from './net-worth-spreadsheet';
import type { NetWorthSpreadsheetResult } from './net-worth-spreadsheet';

export const MAX_NET_WORTH_SERIES = 4;

// The main series uses the report's own filters; it has no stored id.
export const PRIMARY_SERIES_ID = 'primary';

// Only the filters affect the data, so renaming a series doesn't reload it.
export type NetWorthSeriesFilter = Pick<
  NetWorthSeries,
  'id' | 'conditions' | 'conditionsOp'
>;

export type NetWorthSeriesLabel = Pick<NetWorthSeries, 'id' | 'name'>;

export type NetWorthOverlayPoint = {
  x: string;
  date: string;
  // Balance per series id; null when a series has no point for this interval.
  values: Record<string, number | null>;
};

export type NetWorthReportData = {
  primary: NetWorthSpreadsheetResult;
  // Only set when there is more than one series to compare.
  overlay: NetWorthOverlayPoint[] | null;
};

export function createNetWorthReport(
  series: NetWorthSeriesFilter[],
  start: string,
  end: string,
  accounts: AccountEntity[],
  locale: Locale,
  interval: string,
  firstDayOfWeekIdx: string,
  format: (value: unknown, type?: FormatType) => string,
  dateFormat?: string,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: NetWorthReportData) => void,
  ) => {
    const results = await Promise.all(
      series.map(
        ({ conditions, conditionsOp }) =>
          new Promise<NetWorthSpreadsheetResult>((resolve, reject) => {
            createSpreadsheet(
              start,
              end,
              accounts,
              conditions,
              conditionsOp,
              locale,
              interval,
              firstDayOfWeekIdx,
              format,
              dateFormat,
            )(spreadsheet, resolve).catch(reject);
          }),
      ),
    );

    setData({
      primary: results[0],
      overlay:
        series.length > 1
          ? mergeNetWorthSeries(
              series.map(({ id }) => id),
              results,
            )
          : null,
    });
  };
}

export function mergeNetWorthSeries(
  seriesIds: string[],
  results: Array<{
    graphData: { data: Array<{ x: string; y: number; date: string }> };
  }>,
): NetWorthOverlayPoint[] {
  // Every series shares the same date range and interval, so the intervals
  // line up. Join on the interval label anyway so a mismatch shows as a gap
  // instead of shifting a line.
  const valuesByX = results.map(
    result => new Map(result.graphData.data.map(point => [point.x, point.y])),
  );

  return (results[0]?.graphData.data ?? []).map(point => ({
    x: point.x,
    date: point.date,
    values: Object.fromEntries(
      seriesIds.map((id, i) => [id, valuesByX[i]?.get(point.x) ?? null]),
    ),
  }));
}

export function getSeriesColor(index: number) {
  const scale = getColorScale('qualitative');
  return scale[index % scale.length];
}

// Difference between the first two series (e.g. value minus contributions).
export function getSeriesDifference(
  point: NetWorthOverlayPoint,
  series: Array<Pick<NetWorthSeries, 'id'>>,
): number | null {
  if (series.length !== 2) {
    return null;
  }
  const first = point.values[series[0].id];
  const second = point.values[series[1].id];
  if (first == null || second == null) {
    return null;
  }
  return first - second;
}
