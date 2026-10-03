/* Public Safety Suite: unified workspaces, accessible interaction, and durable record storage.
   Domain modules above remain the source of business workflows. */
function suiteWeekStart(): any { const d: any = new Date() as any; d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return fmt(d); }
