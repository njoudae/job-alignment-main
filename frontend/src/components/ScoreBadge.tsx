interface Props {
  score: number;
}

export default function ScoreBadge({ score }: Props) {
  const tone = score >= 75 ? 'bg-emerald-100 text-emerald-700' : score >= 55 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  return (
    <div className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${tone}`}>
      Alignment Score: {score}%
    </div>
  );
}
