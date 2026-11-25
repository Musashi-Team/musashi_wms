import mapin from '/img/og-removebg-preview.png';

export default function Logo({ className = '' }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img src={mapin} alt="" />
      
      <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-ink-muted"></span>
    </div>
  );
}
