interface UnderConstructionNoticeProps {
  pageName?: string;
}

export default function UnderConstructionNotice({
  pageName = "This page",
}: UnderConstructionNoticeProps) {
  return (
    <div className="mx-6 mt-5 mb-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.8L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.8a2 2 0 00-3.4 0z" />
          </svg>
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-amber-900">
            {pageName} Under Construction
          </p>

          <p className="mt-0.5 text-[11px] leading-5 text-amber-800">
            This page is currently under development. The data displayed
            below is mock/sample data for demonstration purposes only and
            may not represent actual store records.
          </p>
        </div>
      </div>
    </div>
  );
}