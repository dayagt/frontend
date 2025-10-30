import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth';
import {
  HomeIcon,
  FolderPlusIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ChevronDownIcon,
  ListBulletIcon,
  UserPlusIcon,
} from '@heroicons/react/24/solid';

type RoleKey = 'coordinador' | 'tecnico' | 'default';

const ROLE_UI: Record<RoleKey, { badge: string; grad: string }> = {
  coordinador: { badge: 'Coordinador', grad: 'from-purple-500 to-purple-600' },
  tecnico: { badge: 'Técnico', grad: 'from-blue-500 to-blue-600' },
  default: { badge: 'Usuario', grad: 'from-gray-500 to-gray-600' },
};

type NavItem = { to: string; label: string; icon: ReactNode; roles: RoleKey[] };

const BASE_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: <HomeIcon className="w-5 h-5" />, roles: ['coordinador', 'tecnico', 'default'] },
  { to: '/expediente', label: 'Registro de Expedientes', icon: <FolderPlusIcon className="w-5 h-5" />, roles: ['tecnico', 'default'] },
  { to: '/indicio', label: 'Registro de Indicios', icon: <BeakerIcon className="w-5 h-5" />, roles: ['tecnico', 'default'] },
  { to: '/revisar', label: 'Revisar Expedientes', icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />, roles: ['coordinador'] },
];

// Submenú de USUARIOS (solo coordinador)
const USERS_MENU: NavItem[] = [
  { to: '/usuarios', label: 'Listado de Usuarios', icon: <ListBulletIcon className="w-5 h-5" />, roles: ['coordinador'] },
  { to: '/usuarios/crear', label: 'Crear Usuario', icon: <UserPlusIcon className="w-5 h-5" />, roles: ['coordinador'] },
];

/** ============ INFORMES COMENTADO ============
import { DocumentChartBarIcon, ClipboardDocumentListIcon, ChartPieIcon } from '@heroicons/react/24/solid';
const REPORT_ITEMS: NavItem[] = [
  { to: '/reporte-expedientes', label: 'Reporte de Expedientes', icon: <DocumentChartBarIcon className="w-5 h-5" />, roles: ['coordinador', 'tecnico', 'default'] },
  { to: '/reporte-indicios', label: 'Reporte de Indicios', icon: <ClipboardDocumentListIcon className="w-5 h-5" />, roles: ['coordinador', 'tecnico', 'default'] },
  { to: '/reporte-aprobaciones', label: 'Aprobaciones y Rechazos', icon: <ChartPieIcon className="w-5 h-5" />, roles: ['coordinador', 'tecnico', 'default'] },
];
============================================== */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUsersOpenMobile, setIsUsersOpenMobile] = useState(false); // acordeón móvil para Usuarios
  const { isAuthenticated, logout, rol, username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleKey: RoleKey = (rol as RoleKey) ?? 'default';
  const roleUI = ROLE_UI[roleKey] ?? ROLE_UI.default;

  const mainItems = useMemo(() => BASE_ITEMS.filter(i => i.roles.includes(roleKey)), [roleKey]);
  const usersItems = useMemo(() => USERS_MENU.filter(i => i.roles.includes(roleKey)), [roleKey]);
  // const reportItems = useMemo(() => REPORT_ITEMS.filter(i => i.roles.includes(roleKey)), [roleKey]); // ← INFORMES COMENTADO

  const toggleMenu = () => setIsOpen(v => !v);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setIsOpen(false);
    setIsUsersOpenMobile(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }, [isOpen]);

  const ItemLink = ({ to, icon, label }: { to: string; icon: ReactNode; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          'group relative px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap',
          isActive ? 'bg-white/20 text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'
        )
      }
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </NavLink>
  );

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-2xl border-b border-blue-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        {/* Logo + Título */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-white/20 rounded-xl shadow-lg">
            <ChartBarIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-white">Sistema de Gestiones</h1>
            <p className="text-blue-100 text-xs md:text-sm">Tarea - Desarrollo Web</p>
          </div>
        </div>

        {/* Menú escritorio en una sola línea */}
        {isAuthenticated && (
          <ul className="hidden md:flex items-center gap-2 flex-1 justify-center">
            {mainItems.map(item => (
              <li key={item.to}>
                <ItemLink to={item.to} icon={item.icon} label={item.label} />
              </li>
            ))}

            {/* ======= Submenú USUARIOS (ESCRITORIO) ======= */}
            {roleKey === 'coordinador' && usersItems.length > 0 && (
              <li className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 transition">
                  <UserIcon className="w-5 h-5" />
                  <span className="font-semibold">Usuarios</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                <ul className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-2 space-y-1">
                  {usersItems.map(ui => (
                    <li key={ui.to}>
                      <NavLink
                        to={ui.to}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
                      >
                        {ui.icon}
                        <span>{ui.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            )}

            {/* ======= INFORMES (ESCRITORIO) COMENTADO =======
            <li className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 transition">
                <ChartBarIcon className="w-5 h-5" />
                <span className="font-semibold">Informes</span>
                <ChevronDownIcon className="w-4 h-4" />
              </button>
              <ul className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-2 space-y-1">
                {reportItems.map(ri => (
                  <li key={ri.to}>
                    <NavLink
                      to={ri.to}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
                    >
                      {ri.icon}
                      <span>{ri.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
            ================================================ */}
          </ul>
        )}

        {/* Usuario + Rol + Logout */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div className="text-right leading-tight">
                <p className="text-white font-semibold text-xs">{username ?? 'Usuario'}</p>
                <span className={cx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r', roleUI.grad)}>
                  {roleUI.badge}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow hover:from-red-600 hover:to-red-700"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="whitespace-nowrap">Cerrar Sesión</span>
            </button>
          </div>
        )}

        {/* Burger móvil */}
        <div className="md:hidden">
          <button onClick={toggleMenu} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition" aria-label="Menú">
            {isOpen ? <XMarkIcon className="w-6 h-6 text-white" /> : <Bars3Icon className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {isOpen && (
        <div className="md:hidden px-4 pb-6 bg-blue-800/90 backdrop-blur-sm">
          {isAuthenticated && (
            <div className="flex items-center gap-3 py-4 px-4 bg-white/10 rounded-xl mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-white font-semibold text-sm">{username ?? 'Usuario'}</p>
                <span className={cx('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white bg-gradient-to-r', roleUI.grad)}>
                  {roleUI.badge}
                </span>
              </div>
            </div>
          )}

          <ul className="space-y-3">
            {isAuthenticated &&
              mainItems.map(item => (
                <li key={item.to}>
                  <ItemLink to={item.to} icon={item.icon} label={item.label} />
                </li>
              ))}

            {/* ======= Submenú USUARIOS (MÓVIL) ======= */}
            {roleKey === 'coordinador' && usersItems.length > 0 && (
              <li>
                <button
                  onClick={() => setIsUsersOpenMobile(v => !v)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/90 hover:bg-white/10"
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="font-semibold">Usuarios</span>
                  <ChevronDownIcon className={cx('w-4 h-4 ml-auto', isUsersOpenMobile && 'rotate-180')} />
                </button>
                {isUsersOpenMobile && (
                  <ul className="pl-4 mt-2 space-y-2 bg-white/5 rounded-xl p-3">
                    {usersItems.map(ui => (
                      <li key={ui.to}>
                        <NavLink
                          to={ui.to}
                          className="flex items-center gap-3 py-2 px-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10"
                        >
                          {ui.icon}
                          <span className="font-medium">{ui.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}

            {/* ======= INFORMES (MÓVIL) COMENTADO =======
            <li>
              <button
                onClick={() => setIsReportsOpenMobile(v => !v)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/90 hover:bg-white/10"
              >
                <ChartBarIcon className="w-5 h-5" />
                <span className="font-semibold">Informes</span>
                <ChevronDownIcon className={cx('w-4 h-4 ml-auto', isReportsOpenMobile && 'rotate-180')} />
              </button>
              {isReportsOpenMobile && (
                <ul className="pl-4 mt-2 space-y-2 bg-white/5 rounded-xl p-3">
                  {reportItems.map(ri => (
                    <li key={ri.to}>
                      <NavLink
                        to={ri.to}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10"
                      >
                        {ri.icon}
                        <span className="font-medium">{ri.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            ============================================ */}

            {isAuthenticated && (
              <li className="pt-4 border-t border-white/20">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow hover:from-red-600 hover:to-red-700"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  Cerrar Sesión
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
