import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logoutAdmin } from '../../lib/auth';
import { AdminFooter } from './AdminFooter';

const menuItems = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: '기수관리', to: '/admin/cohorts' },
  { label: '학생관리', to: '/admin/students' },
  { label: '문제관리', to: '/admin/questions' },
  { label: '문제집관리', to: '/admin/workbooks' },
  { label: '문제집배포', to: '/admin/workbook-assignments' },
  { label: '성적분석', to: '/admin/scores' },
  { label: '설정', to: '/admin/settings' },
];

export function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside>
        <div className="sidebar-brand">
          <img src="/sgne-logo.png" alt="세종고운간호전문학원 로고" />
          <div>
            <strong>세종고운간호전문학원</strong>
            <span>Sejong Admin</span>
          </div>
        </div>
        <nav>
          {menuItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="secondary-button" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </aside>
      <main>
        <div className="admin-layout-content">
          <Outlet />
        </div>
        <AdminFooter />
      </main>
    </div>
  );
}
