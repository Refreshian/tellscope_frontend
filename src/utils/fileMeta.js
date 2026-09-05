export const fmtDay = ts => {
  if (!ts) return '';
  try { return new Date(Number(ts) * 1000).toLocaleDateString('ru-RU'); } catch (e) { return ''; }
};

export const fmtTime = ts => {
  if (!ts) return '';
  try {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
};

export const fileMeta = f => {
  if (!f) return '';
  const parts = [];
  if (f.min_data && f.max_data) parts.push('период: ' + fmtDay(f.min_data) + ' \u2013 ' + fmtDay(f.max_data));
  if (f.created) parts.push('получен: ' + fmtTime(f.created));
  return parts.join(' · ');
};

export const hasFileMeta = f => !!(f && ((f.min_data && f.max_data) || f.created));
