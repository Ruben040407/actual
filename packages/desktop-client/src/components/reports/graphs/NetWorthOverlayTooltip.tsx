import React from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import type { TooltipContentProps } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import {
  getSeriesColor,
  getSeriesDifference,
} from '#components/reports/spreadsheets/net-worth-series';
import type {
  NetWorthOverlayPoint,
  NetWorthSeriesLabel,
} from '#components/reports/spreadsheets/net-worth-series';
import { useFormat } from '#hooks/useFormat';

type NetWorthOverlayTooltipProps = TooltipContentProps & {
  series: NetWorthSeriesLabel[];
};

export function NetWorthOverlayTooltip({
  active,
  payload,
  series,
}: NetWorthOverlayTooltipProps) {
  const { t } = useTranslation();
  const format = useFormat();

  if (!active || !payload || !payload.length) {
    return null;
  }

  const point: NetWorthOverlayPoint = payload[0].payload;
  const difference = getSeriesDifference(point, series);

  return (
    <div
      className={css({
        zIndex: 1000,
        pointerEvents: 'none',
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      })}
    >
      <div style={{ marginBottom: 10 }}>
        <strong>{point.date}</strong>
      </div>
      <div style={{ lineHeight: 1.5 }}>
        {series.map(({ id, name }, index) => {
          const value = point.values[id];
          return (
            <AlignedText
              key={id}
              left={
                <span style={{ color: getSeriesColor(index) }}>{name}</span>
              }
              right={
                <FinancialText>
                  {value == null ? '–' : format(value, 'financial')}
                </FinancialText>
              }
            />
          );
        })}
        {difference != null && (
          <AlignedText
            left={t('Difference:')}
            right={
              <FinancialText as="strong">
                {format(difference, 'financial')}
              </FinancialText>
            }
          />
        )}
      </div>
    </div>
  );
}
