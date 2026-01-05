
export const formatTime = (hours: number, minutes: number) => {
  const totalMinutes = hours * 60 + minutes;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
};

export const getMonthYearString = (date: Date = new Date()) => {
  return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
};

export const calculateTotalTime = (entries: { hours: number; minutes: number }[]) => {
  const totalMinutes = entries.reduce((acc, curr) => acc + (curr.hours * 60 + curr.minutes), 0);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60
  };
};

export const getCurrentMonthEntries = <T extends { date: string }>(items: T[]) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return items.filter(item => {
    const d = new Date(item.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
};
