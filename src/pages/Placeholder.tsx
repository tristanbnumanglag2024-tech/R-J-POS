interface PlaceholderProps {
  title: string;
  description: string;
  icon?: string;
}

export default function Placeholder({ title, description, icon = "🏗️" }: PlaceholderProps) {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4 text-3xl">
          {icon}
        </div>
        <h2 className="text-[18px] font-bold text-[#0F172A] mb-2">{title}</h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">{description}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EEF2FF] text-[#4F46E5] text-[12px] font-medium">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Coming in Part 2
        </div>
      </div>
    </div>
  );
}
