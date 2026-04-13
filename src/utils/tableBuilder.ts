import {
  eachDayOfInterval,
  isValid,
  isSameDay,
  differenceInCalendarDays,
  format,
} from 'date-fns';
import { ProjectData, ActualDataItem } from '../types/production';
import type { DataTable, TableColumnDef } from '../types/table';

export interface ScheduleItem {
  date: Date;
  dateIso: string;
  name: string;
  weekString: string;
  dayName: string;
  actual: number | null;
  target: number;
  variance: number;
  [key: string]: unknown;
}

/** Build schedule items with targets (LPB weight distribution) - single source for all tables */
export function buildScheduleWithTargets(
  projectData: ProjectData
): ScheduleItem[] {
  const start = new Date(projectData.startDate);
  const end = new Date(projectData.endDate);
  if (!isValid(start) || !isValid(end)) {
    throw new Error('Invalid dates provided');
  }

  const days = eachDayOfInterval({ start, end });
  const scheduleItems: Omit<ScheduleItem, 'target' | 'variance'>[] = [];

  days.forEach((day) => {
    const daysElapsed = Math.max(0, differenceInCalendarDays(day, start));
    const weekNum = Math.floor(daysElapsed / 7) + 1;
    const weekString = `Week ${weekNum}`;
    const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });

    projectData.resources.forEach((resource) => {
      let actualMatch: ActualDataItem | null = null;
      if (projectData.actualData) {
        actualMatch =
          projectData.actualData.find((item) => {
            const itemDate = new Date(item.date);
            return (
              isValid(itemDate) &&
              isSameDay(itemDate, day) &&
              item.name.toLowerCase() === resource.toLowerCase()
            );
          }) || null;
      }

      const actual = actualMatch ? actualMatch.actual : null;
      const item: Omit<ScheduleItem, 'target' | 'variance'> = {
        date: day,
        dateIso: day.toISOString(),
        name: resource,
        weekString,
        dayName,
        actual,
      };
      if (projectData.dailyColumns && actualMatch) {
        projectData.dailyColumns.forEach((col) => {
          (item as Record<string, unknown>)[col.key] =
            (actualMatch as Record<string, unknown>)[col.key] ?? null;
        });
      }
      scheduleItems.push(item);
    });
  });

  const uniqueDates = Array.from(
    new Set(scheduleItems.map((s: any) => (s.date as Date).toISOString()))
  ).sort();
  const totalDays = uniqueDates.length;
  const itemsByDay: Record<string, number> = {};
  scheduleItems.forEach((item: any) => {
    const d = (item.date as Date).toISOString();
    itemsByDay[d] = (itemsByDay[d] || 0) + 1;
  });

  let cumulativeWeight = 0;
  const dailyWeights: Record<string, number> = {};

  uniqueDates.forEach((date, i) => {
    const progress = totalDays > 1 ? i / (totalDays - 1) : 1;
    let weight = 0;
    if (progress < 0.25) {
      const pAdjusted = progress / 0.25;
      weight = 0.4 + 0.3 * pAdjusted;
    } else if (progress < 0.75) {
      const pAdjusted = (progress - 0.25) / 0.5;
      weight = 0.7 + 0.4 * pAdjusted;
    } else {
      const pAdjusted = (progress - 0.75) / 0.25;
      weight = 1.1 + 0.2 * pAdjusted;
    }
    dailyWeights[date] = weight;
    cumulativeWeight += weight * (itemsByDay[date] || 0);
  });

  return scheduleItems.map((item: any) => {
    const weight = dailyWeights[(item.date as Date).toISOString()] || 1;
    const target = (weight / (cumulativeWeight || 1)) * projectData.goal;
    const actualVal = typeof item.actual === 'number' ? item.actual : 0;
    const variance = target - actualVal;
    return {
      ...item,
      target,
      variance,
    } as ScheduleItem;
  });
}

/** Aggregate by date: sum target, actual, variance per date */
function aggregateByDate(items: ScheduleItem[]) {
  const byDate: Record<
    string,
    { date: Date; dateIso: string; target: number; actual: number; variance: number }
  > = {};
  items.forEach((item) => {
    const d = item.dateIso;
    if (!byDate[d]) {
      byDate[d] = {
        date: item.date,
        dateIso: d,
        target: 0,
        actual: 0,
        variance: 0,
      };
    }
    byDate[d].target += item.target;
    byDate[d].actual += item.actual ?? 0;
    byDate[d].variance += item.variance;
  });
  return Object.values(byDate).sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );
}

/** Aggregate by week */
function aggregateByWeek(items: ScheduleItem[]) {
  const byWeek: Record<
    string,
    { weekString: string; target: number; actual: number; variance: number }
  > = {};
  items.forEach((item) => {
    const w = item.weekString;
    if (!byWeek[w]) {
      byWeek[w] = { weekString: w, target: 0, actual: 0, variance: 0 };
    }
    byWeek[w].target += item.target;
    byWeek[w].actual += item.actual ?? 0;
    byWeek[w].variance += item.variance;
  });
  return Object.values(byWeek).sort((a, b) => {
    const numA = parseInt(a.weekString.replace('Week ', ''), 10);
    const numB = parseInt(b.weekString.replace('Week ', ''), 10);
    return numA - numB;
  });
}

/** Build all tables from project data - single source of truth for UI and Excel */
export function buildTablesFromProjectData(
  projectData: ProjectData
): DataTable[] {
  const items = buildScheduleWithTargets(projectData);
  const byDate = aggregateByDate(items);
  const byWeek = aggregateByWeek(items);

  const unitLabel =
    (projectData.unit || 'Units').trim().charAt(0).toUpperCase() +
    (projectData.unit || 'Units').trim().slice(1);

  const totalTarget = items.reduce((s, i) => s + i.target, 0);
  const totalActual = items.reduce((s, i) => s + (i.actual ?? 0), 0);
  const balance = totalTarget - totalActual;
  const completionRate =
    totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  const remarks =
    totalActual >= totalTarget
      ? 'Completed'
      : new Date() > new Date(projectData.endDate)
        ? 'Delayed'
        : 'In progress';

  const dailyColumns: TableColumnDef[] = [
    { key: 'date', header: 'Date', type: 'date', align: 'left', width: 12 },
    { key: 'name', header: 'Operator', type: 'text', align: 'left', width: 18 },
    { key: 'target', header: 'Target', type: 'number', align: 'right', width: 12 },
    { key: 'actual', header: 'Actual', type: 'number', align: 'right', width: 12 },
    {
      key: 'variance',
      header: 'Variance',
      type: 'number',
      align: 'right',
      width: 12,
      negativeRed: true,
    },
  ];

  const dailyRows: Record<string, unknown>[] = items.map((item) => ({
    date: format(item.date, 'yyyy-MM-dd'),
    name: item.name,
    target: item.target,
    actual: item.actual ?? '-',
    variance: item.variance,
  }));

  const dailyTable: DataTable = {
    id: 'daily',
    sheetName: `Daily Production of ${projectData.name}`,
    title: `Daily Output of ${projectData.name}`,
    columns: dailyColumns,
    rows: dailyRows,
  };

  const planColumns: TableColumnDef[] = [
    { key: 'date', header: 'Date', type: 'date', align: 'left', width: 12 },
    { key: 'target', header: 'Total Target', type: 'number', align: 'right', width: 14 },
    { key: 'actual', header: 'Total Actual', type: 'number', align: 'right', bold: true, width: 14 },
    {
      key: 'variance',
      header: 'Variance',
      type: 'number',
      align: 'right',
      width: 12,
      negativeRed: true,
      bold: true,
    },
  ];

  const planRows: Record<string, unknown>[] = byDate.map((d) => ({
    date: format(d.date, 'yyyy-MM-dd'),
    target: d.target,
    actual: d.actual,
    variance: d.variance,
  }));

  const planTable: DataTable = {
    id: 'plan',
    sheetName: `${projectData.name} Production Plan`,
    title: `${projectData.name}: Production Plan & Daily Output Tracking`,
    columns: planColumns,
    rows: planRows,
  };

  const weeklyColumns: TableColumnDef[] = [
    { key: 'weekString', header: 'Week', type: 'text', align: 'left', width: 12 },
    { key: 'target', header: 'Total Target', type: 'number', align: 'right', width: 14 },
    { key: 'actual', header: 'Total Actual', type: 'number', align: 'right', bold: true, width: 14 },
    {
      key: 'variance',
      header: 'Total Variance',
      type: 'number',
      align: 'right',
      width: 14,
      negativeRed: true,
      bold: true,
    },
  ];

  const weeklyTable: DataTable = {
    id: 'weekly',
    sheetName: 'Pivot Tables',
    title: 'Weekly Summary',
    columns: weeklyColumns,
    rows: byWeek.map((w) => ({
      weekString: w.weekString,
      target: w.target,
      actual: w.actual,
      variance: w.variance,
    })),
  };

  const summaryColumns: TableColumnDef[] = [
    { key: 'no', header: 'No.', type: 'integer', align: 'right', width: 6 },
    { key: 'task', header: 'Task', type: 'text', align: 'left', width: 24 },
    { key: 'planTime', header: 'Plan (Time)', type: 'number', align: 'right', width: 12 },
    { key: 'planTask', header: 'Plan (Task)', type: 'number', align: 'right', width: 12 },
    { key: 'actualTime', header: 'Actual (Time)', type: 'number', align: 'right', width: 12 },
    { key: 'actualTask', header: 'Actual (Task)', type: 'number', align: 'right', bold: true, width: 12 },
    {
      key: 'balance',
      header: 'Balance',
      type: 'number',
      align: 'right',
      bold: true,
      negativeRed: true,
      width: 12,
    },
    {
      key: 'completionRate',
      header: 'Completion Rate',
      type: 'percent',
      align: 'right',
      bold: true,
      negativeRed: true,
      highlightRed: true,
      completionGreen: true,
      width: 14,
    },
    { key: 'remarks', header: 'Remarks', type: 'text', align: 'left', width: 18 },
  ];

  const summaryTable: DataTable = {
    id: 'summary',
    sheetName: 'Summary',
    title: `${projectData.name}: Summary as of ${format(new Date(), 'yyyy-MM-dd')}`,
    columns: summaryColumns,
    rows: [
      {
        no: 1,
        task: projectData.name,
        planTime: totalTarget,
        planTask: totalTarget,
        actualTime: totalActual,
        actualTask: totalActual,
        balance,
        completionRate: totalTarget > 0 ? totalActual / totalTarget : 0,
        remarks,
      },
    ],
  };

  return [dailyTable, planTable, weeklyTable, summaryTable];
}
