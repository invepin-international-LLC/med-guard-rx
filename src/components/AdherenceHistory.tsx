import { useState, useMemo } from 'react';
import { useAdherenceHistory, TimeGranularity, AdherenceDataPoint, DayHeatmapEntry } from '@/hooks/useAdherenceHistory';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { format, subMonths, addMonths, subWeeks, addWeeks, subDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, getDay } from 'date-fns';

const GRANULARITIES: { id: TimeGranularity; label: string; icon: typeof BarChart3 }[] = [
  { id: 'year', label: 'Year', icon: CalendarDays },
  { id: 'month', label: 'Month', icon: BarChart3 },
  { id: 'week', label: 'Week', icon: TrendingUp },
  { id: 'day', label: 'Day', icon: Clock },
];

function getAdherenceColor(rate: number): string {
  if (rate >= 90) return 'hsl(var(--success))';
  if (rate >= 70) return 'hsl(var(--accent))';
  if (rate >= 50) return 'hsl(var(--warning))';
  if (rate > 0) return 'hsl(var(--destructive))';
  return 'hsl(var(--muted))';
}

function getHeatmapBg(rate: number): string {
  if (rate >= 90) return 'bg-success';
  if (rate >= 70) return 'bg-accent';
  if (rate >= 50) return 'bg-warning';
  if (rate > 0) return 'bg-destructive/70';
  return 'bg-muted';
}

function CalendarHeatmap({ data, focusDate, onSelectDay }: {
  data: DayHeatmapEntry[];
  focusDate: Date;
  onSelectDay: (date: Date) => void;
}) {
  const monthStart = startOfMonth(focusDate);
  const monthEnd = endOfMonth(focusDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart); // 0=Sun

  const dataMap = useMemo(() => {
    const m = new Map<string, DayHeatmapEntry>();
    data.forEach(d => m.set(d.date, d));
    return m;
  }, [data]);

  return (
    <div className="bg-card rounded-2xl p-4 border-2 border-border">
      <h3 className="text-lg font-bold text-foreground mb-3">{format(focusDate, 'MMMM yyyy')}</h3>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="text-xs text-muted-foreground font-medium">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const entry = dataMap.get(key);
          const rate = entry?.adherenceRate ?? -1;
          const isToday = key === format(new Date(), 'yyyy-MM-dd');
          const isFuture = day > new Date();

          return (
            <button
              key={key}
              onClick={() => !isFuture && rate >= 0 && onSelectDay(day)}
              disabled={isFuture || rate < 0}
              className={cn(
                "aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all",
                isFuture && "opacity-30",
                rate >= 0 && !isFuture && "cursor-pointer hover:ring-2 hover:ring-accent",
                rate >= 0 ? getHeatmapBg(rate) : "bg-muted/50",
                rate >= 0 && "text-white",
                rate < 0 && "text-muted-foreground",
                isToday && "ring-2 ring-primary"
              )}
              title={entry ? `${entry.taken}/${entry.total} doses (${rate}%)` : 'No data'}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 justify-center text-xs text-muted-foreground">
        <span>Less</span>
        <div className="w-4 h-4 rounded bg-destructive/70" />
        <div className="w-4 h-4 rounded bg-warning" />
        <div className="w-4 h-4 rounded bg-accent" />
        <div className="w-4 h-4 rounded bg-success" />
        <span>More</span>
      </div>
    </div>
  );
}

export function AdherenceHistory() {
  const { loading, getDataByGranularity, getHeatmapData } = useAdherenceHistory();
  const [granularity, setGranularity] = useState<TimeGranularity>('year');
  const [focusDate, setFocusDate] = useState(new Date());

  const chartData = useMemo(
    () => getDataByGranularity(granularity, focusDate),
    [getDataByGranularity, granularity, focusDate]
  );

  const heatmapData = useMemo(() => getHeatmapData(), [getHeatmapData]);

  const navigate = (dir: -1 | 1) => {
    setFocusDate(prev => {
      switch (granularity) {
        case 'month': return dir === -1 ? subMonths(prev, 1) : addMonths(prev, 1);
        case 'week': return dir === -1 ? subWeeks(prev, 1) : addWeeks(prev, 1);
        case 'day': return dir === -1 ? subDays(prev, 1) : addDays(prev, 1);
        default: return prev;
      }
    });
  };

  const getPeriodLabel = (): string => {
    switch (granularity) {
      case 'year': return 'Past 12 Months';
      case 'month': return format(focusDate, 'MMMM yyyy');
      case 'week': {
        const start = new Date(focusDate);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
      }
      case 'day': return format(focusDate, 'EEEE, MMMM d, yyyy');
      default: return '';
    }
  };

  const overallRate = chartData.length > 0
    ? Math.round(chartData.reduce((sum, d) => sum + d.taken, 0) / Math.max(chartData.reduce((sum, d) => sum + d.total, 0), 1) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Granularity Toggle */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {GRANULARITIES.map(g => (
          <button
            key={g.id}
            onClick={() => { setGranularity(g.id); setFocusDate(new Date()); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all",
              granularity === g.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <g.icon className="w-4 h-4" />
            {g.label}
          </button>
        ))}
      </div>

      {/* Period Navigation */}
      {granularity !== 'year' && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-semibold text-foreground">{getPeriodLabel()}</span>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}
            disabled={focusDate >= new Date()}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
      {granularity === 'year' && (
        <p className="text-center text-sm font-semibold text-foreground">{getPeriodLabel()}</p>
      )}

      {/* Summary Card */}
      <div className="bg-card rounded-2xl p-5 border-2 border-border flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">Overall Adherence</p>
          <p className="text-4xl font-extrabold" style={{ color: getAdherenceColor(overallRate) }}>
            {overallRate}%
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{chartData.reduce((s, d) => s + d.taken, 0)} taken</p>
          <p>{chartData.reduce((s, d) => s + d.missed, 0)} missed</p>
          <p>{chartData.reduce((s, d) => s + d.total, 0)} total</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="bg-card rounded-2xl p-4 border-2 border-border">
          <h3 className="text-lg font-bold text-foreground mb-3">
            {granularity === 'day' || granularity === 'hour' ? 'Hourly Breakdown' : 'Adherence Rate'}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            {granularity === 'year' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value}%`, 'Adherence']}
                />
                <Line type="monotone" dataKey="adherenceRate" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--accent))', r: 4 }} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="taken" name="Taken" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="missed" name="Missed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="skipped" name="Skipped" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-8 border-2 border-border text-center">
          <p className="text-muted-foreground text-lg">No data for this period</p>
          <p className="text-sm text-muted-foreground mt-1">Start logging doses to see your history here</p>
        </div>
      )}

      {/* Calendar Heatmap (shown for year/month views) */}
      {(granularity === 'year' || granularity === 'month') && (
        <CalendarHeatmap
          data={heatmapData}
          focusDate={focusDate}
          onSelectDay={(d) => { setFocusDate(d); setGranularity('day'); }}
        />
      )}
    </div>
  );
}
