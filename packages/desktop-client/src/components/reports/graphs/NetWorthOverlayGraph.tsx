import React from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { getSeriesColor } from '#components/reports/spreadsheets/net-worth-series';
import type {
  NetWorthOverlayPoint,
  NetWorthSeriesLabel,
} from '#components/reports/spreadsheets/net-worth-series';
import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

import { NetWorthOverlayTooltip } from './NetWorthOverlayTooltip';
import { NetWorthSeriesLegend } from './NetWorthSeriesLegend';
import { computePadding } from './util/computePadding';

type NetWorthOverlayGraphProps = {
  style?: CSSProperties;
  data: NetWorthOverlayPoint[];
  series: NetWorthSeriesLabel[];
  compact?: boolean;
  showTooltip?: boolean;
  interval?: string;
};

export function NetWorthOverlayGraph({
  style,
  data,
  series,
  compact = false,
  showTooltip = true,
  interval = 'Monthly',
}: NetWorthOverlayGraphProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const animationProps = useRechartsAnimation({ animationDuration: 1000 });
  const { isNarrowWidth } = useResponsive();

  const interpolationType =
    interval === 'Daily' || interval === 'Weekly' ? 'basis' : 'monotone';

  const allValues = data.flatMap(point =>
    Object.values(point.values).filter(value => value != null),
  );

  return (
    <View style={style}>
      <Container
        style={{
          ...(compact && { height: 'auto', flex: 1 }),
          position: 'relative',
        }}
      >
        {(width, height) => (
          <div style={{ ...(!compact && { marginTop: '15px' }) }}>
            <LineChart
              responsive
              width={width}
              height={height}
              data={data}
              margin={{
                top: 5,
                right: 0,
                left: compact
                  ? 0
                  : computePadding(allValues, value =>
                      format(value, 'financial-no-decimals'),
                    ),
                bottom: 0,
              }}
            >
              {compact ? null : (
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
              )}
              <XAxis
                dataKey="x"
                hide={compact}
                minTickGap={20}
                tick={{ fill: theme.pageText }}
                tickLine={{ stroke: theme.pageText }}
              />
              <YAxis
                domain={['auto', 'auto']}
                hide={compact}
                tickFormatter={(tick: number) =>
                  privacyMode
                    ? '...'
                    : format(Math.round(tick), 'financial-no-decimals')
                }
                tick={{ fill: theme.pageText }}
                tickLine={{ stroke: theme.pageText }}
              />
              {showTooltip && !isNarrowWidth && (
                <Tooltip
                  content={props => (
                    <NetWorthOverlayTooltip {...props} series={series} />
                  )}
                  isAnimationActive={false}
                />
              )}
              {series.map(({ id, name }, index) => (
                <Line
                  key={id}
                  name={name}
                  type={interpolationType}
                  dataKey={(point: NetWorthOverlayPoint) => point.values[id]}
                  stroke={getSeriesColor(index)}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  {...animationProps}
                />
              ))}
            </LineChart>
          </div>
        )}
      </Container>
      <NetWorthSeriesLegend series={series} compact={compact} />
    </View>
  );
}
