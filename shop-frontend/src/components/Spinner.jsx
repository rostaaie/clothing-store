export default function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-500" />
    </div>
  );
}
