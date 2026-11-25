import WorkOrdersPanel from '../components/WorkOrdersPanel';

export default function WorkOrders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-ink-soft">Buat, tugaskan, dan pantau pekerjaan maintenance di warehouse ini.</p>
      </div>
      <WorkOrdersPanel />
    </div>
  );
}
