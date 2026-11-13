import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { Input } from '@actual-app/components/input';
import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';
import type {
  NetWorthSeries,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import { AppliedFilters } from '#components/filters/AppliedFilters';
import { FilterButton } from '#components/filters/FiltersMenu';

// FilterButton passes a whole saved filter instead of a single condition when
// the user picks one from the "Saved filters" list.
type AppliedFilter =
  | RuleConditionEntity
  | { conditions: RuleConditionEntity[]; conditionsOp: 'and' | 'or' };

type NetWorthSeriesRowProps = {
  series: Pick<NetWorthSeries, 'name' | 'conditions' | 'conditionsOp'>;
  color: string;
  // Shown when the series has no name of its own.
  defaultName: string;
  onChange: (
    series: Pick<NetWorthSeries, 'name' | 'conditions' | 'conditionsOp'>,
  ) => void;
  // The main series' filters are edited in the report header.
  showFilters?: boolean;
  onRemove?: () => void;
};

export function NetWorthSeriesRow({
  series,
  color,
  defaultName,
  onChange,
  showFilters = true,
  onRemove,
}: NetWorthSeriesRowProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  function onApply(filter: AppliedFilter) {
    if ('conditions' in filter) {
      onChange({
        ...series,
        conditions: [...filter.conditions],
        conditionsOp: filter.conditionsOp,
      });
    } else {
      onChange({ ...series, conditions: [...series.conditions, filter] });
    }
  }

  return (
    <View style={{ marginTop: 8 }}>
      <SpaceBetween gap={8} style={{ alignItems: 'center' }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <Input
          value={series.name}
          placeholder={defaultName}
          aria-label={t('Series name')}
          onChangeValue={name => onChange({ ...series, name })}
          style={{ width: 200 }}
        />
        {showFilters && (
          <FilterButton<RuleConditionEntity>
            compact={isNarrowWidth}
            onApply={onApply}
            hover={false}
          />
        )}
        {onRemove && (
          <Button
            variant="bare"
            aria-label={t('Remove series')}
            onPress={onRemove}
            style={{ padding: 6 }}
          >
            <SvgDelete width={12} height={12} />
          </Button>
        )}
      </SpaceBetween>
      {showFilters && series.conditions.length > 0 && (
        <View style={{ marginTop: 5, marginLeft: 20 }}>
          <AppliedFilters
            conditions={series.conditions}
            onUpdate={(oldFilter, newFilter) =>
              onChange({
                ...series,
                conditions: series.conditions.map(filter =>
                  filter === oldFilter ? newFilter : filter,
                ),
              })
            }
            onDelete={deletedFilter =>
              onChange({
                ...series,
                conditions: series.conditions.filter(
                  filter => filter !== deletedFilter,
                ),
              })
            }
            conditionsOp={series.conditionsOp}
            onConditionsOpChange={conditionsOp =>
              onChange({ ...series, conditionsOp })
            }
          />
        </View>
      )}
    </View>
  );
}
