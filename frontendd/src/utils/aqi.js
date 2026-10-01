export const AQI_CATEGORIES = [
  { max: 30.0, category: 'Good', color: '#22c55e', bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30' },
  { max: 60.0, category: 'Satisfactory', color: '#84cc16', bg: 'bg-lime-500/15', text: 'text-lime-700 dark:text-lime-400', border: 'border-lime-500/30' },
  { max: 90.0, category: 'Moderate', color: '#eab308', bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/30' },
  { max: 120.0, category: 'Poor', color: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/30' },
  { max: 250.0, category: 'Very Poor', color: '#ef4444', bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500/30' },
  { max: Infinity, category: 'Severe', color: '#7f1d1d', bg: 'bg-red-950/20', text: 'text-red-900 dark:text-red-300', border: 'border-red-900/40' },
];

export function getAqiCategory(pm25) {
  const val = Number(pm25) || 0;
  for (const cat of AQI_CATEGORIES) {
    if (val <= cat.max) return cat.category;
  }
  return 'Severe';
}

export function getAqiColor(pm25) {
  const val = Number(pm25) || 0;
  for (const cat of AQI_CATEGORIES) {
    if (val <= cat.max) return cat.color;
  }
  return '#7f1d1d';
}

export function getAqiMeta(pm25) {
  const val = Number(pm25) || 0;
  for (const cat of AQI_CATEGORIES) {
    if (val <= cat.max) return cat;
  }
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

export function getRiskBadgeClasses(level) {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-red-500 text-white font-bold ring-2 ring-red-300 animate-pulse';
    case 'WARNING':
      return 'bg-orange-500 text-white font-semibold ring-1 ring-orange-300';
    case 'WATCH':
      return 'bg-amber-400 text-slate-900 font-medium ring-1 ring-amber-200';
    default:
      return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
  }
}
