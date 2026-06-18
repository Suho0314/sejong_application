import { NavLink, Outlet } from 'react-router-dom';

const menuItems = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: '기수관리', to: '/admin/cohorts' },
  { label: '학생관리', to: '/admin/students' },
  { label: '문제관리', to: '/admin/questions' },
  { label: '문제집관리', to: '/admin/workbooks' },
  { label: '성적분석', to: '/admin/scores' },
  { label: '설정', to: '/admin/settings' },
];

export function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside>
        <strong>Sejong Admin</strong>
        <nav>
          {menuItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
