import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getAdminSession, logoutAdmin } from '../../lib/auth';

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
  const session = getAdminSession();

  const handleLogout = () => {
    logoutAdmin();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside>
        <strong>Sejong Admin</strong>
        {session ? <span className="today-label">{session.name}</span> : null}
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
        <Outlet />
      </main>
    </div>
  );
}
