import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import type { AxisScore } from '../types';

interface Props {
  data: AxisScore[];
}

export default function AxisRadarChart({ data }: Props) {
  return (
    <div className="h-72 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
          <Radar dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
