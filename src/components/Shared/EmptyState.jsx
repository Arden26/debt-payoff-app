export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="text-5xl">{icon}</div>
      <h3 className="font-semibold text-slate-700 text-lg">{title}</h3>
      {description && <p className="text-slate-400 text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
