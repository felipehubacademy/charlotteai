// Rótulo do horário do lembrete (Perfil > Horário do lembrete). null = automático.
export function reminderHourLabel(h: number | null | undefined, isPt: boolean): string {
  if (h == null) return isPt ? 'Automático' : 'Automatic';
  return isPt ? `${h}h` : `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
}
