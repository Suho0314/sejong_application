import { AdminAccountSettings } from '../../../components/admin/AdminAccountSettings';

export function SettingsPage() {
  return (
    <div className="dashboard-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>설정</h1>
        </div>
      </section>

      <AdminAccountSettings />
    </div>
  );
}
