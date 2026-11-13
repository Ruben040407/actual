import React from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getSeriesColor } from '#components/reports/spreadsheets/net-worth-series';
import type { NetWorthSeriesLabel } from '#components/reports/spreadsheets/net-worth-series';

type NetWorthSeriesLegendProps = {
  series: NetWorthSeriesLabel[];
  compact: boolean;
};

export function NetWorthSeriesLegend({
  series,
  compact,
}: NetWorthSeriesLegendProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: compact ? 8 : 15,
        fontSize: compact ? 11 : 13,
        color: theme.pageTextSubdued,
        padding: compact ? '4px 10px 8px' : '10px 0 0',
      }}
    >
      {series.map(({ id, name }, index) => (
        <View
          key={id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <span
            style={{
              width: 10,
              height: 3,
              borderRadius: 2,
              backgroundColor: getSeriesColor(index),
            }}
          />
          {name}
        </View>
      ))}
    </View>
  );
}
