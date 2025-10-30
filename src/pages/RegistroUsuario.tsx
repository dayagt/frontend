// src/pages/RegistroUsuario.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";
import {
  PlusIcon,
  PencilIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/solid";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { apiUrl } from "../config/env";

type Rol = "coordinador" | "tecnico" | "usuario";
interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol | string;
  activo: boolean;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

const LIST_PATH = "/usuarios"; // GET (listar/buscar)
const BY_ID_PATH = "/usuarios"; // PUT/PATCH by :id
const PAGE_SIZE = 10;

// ====== Helper seguro para parsear respuestas ======
async function safeJson(resp: Response) {
  const ct = resp.headers.get("content-type") || "";
  if (resp.status === 204) return {};
  if (!ct.includes("application/json")) {
    const text = await resp.text().catch(() => "");
    try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
  }
  return resp.json().catch(() => ({}));
}

// ---- Toggle ----
type ToggleProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
};
const Toggle = ({ checked, onChange, disabled, label }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label ?? "Cambiar activo"}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
      ${checked ? "bg-gradient-to-r from-green-400 to-green-600 shadow-lg shadow-green-200" : "bg-gradient-to-r from-gray-200 to-gray-300 shadow-inner"}
    `}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out
        ${checked ? "translate-x-6 shadow-green-300" : "translate-x-1 shadow-gray-400"}
      `}
    />
  </button>
);

// ---- Badge Rol ----
const RolBadge = ({ rol }: { rol: Rol | string }) => {
  const r = (rol as Rol) ?? "usuario";
  const cfg: Record<Rol, { text: string; classes: string }> = {
    coordinador: { text: "Coordinador", classes: "bg-purple-50 text-purple-700 border-purple-200" },
    tecnico: { text: "Técnico", classes: "bg-blue-50 text-blue-700 border-blue-200" },
    usuario: { text: "Usuario", classes: "bg-gray-50 text-gray-700 border-gray-200" },
  };
  const style = cfg[r as Rol] ?? cfg.usuario;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${style.classes}`}>
      <ShieldCheckIcon className="h-3 w-3" />
      {style.text}
    </span>
  );
};

const RegistroUsuario = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // server-side query params
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [rolFilter, setRolFilter] = useState<Rol | "todos">("todos");
  const [activoFilter, setActivoFilter] = useState<"todos" | "activo" | "inactivo">("todos");

  // modal edición
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);

  // toggling activo loading por id
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const normalizeUser = (r: any): Usuario => ({
    id: String(r.id),
    nombre: String(r.nombre ?? ""),
    email: String(r.email ?? ""),
    rol: String(r.rol ?? "usuario"),
    activo: r.activo === true || r.activo === 1 || r.activo === "1",
    creado_en: r.creado_en ?? null,
    actualizado_en: r.actualizado_en ?? null,
  });

  const fetchUsuarios = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      if (activoFilter !== "todos") params.set("activo", activoFilter === "activo" ? "true" : "false");
      // si tu SP soporta rol, aquí podrías: if (rolFilter !== "todos") params.set("rol", rolFilter);
      params.set("_", String(Date.now())); // anti-cache

      const requestUrl = apiUrl(`${LIST_PATH}?${params.toString()}`);
      const resp = await fetch(requestUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const json: any = await safeJson(resp);
      if (!resp.ok) throw new Error(json?.message ?? "No se pudo listar");

      let serverRows: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

      // Filtrado por rol en cliente (si el SP aún no filtra por rol)
      if (rolFilter !== "todos") {
        serverRows = serverRows.filter((u) => String(u.rol) === rolFilter);
      }

      setRows(serverRows.map(normalizeUser));
      setTotal(Number(json?.total ?? serverRows.length ?? 0));
    } catch (e) {
      console.error("Error al obtener usuarios:", e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, searchTerm, activoFilter, rolFilter]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Resetear a página 1 cuando cambian filtros/búsqueda
  useEffect(() => {
    setPage(1);
  }, [searchTerm, rolFilter, activoFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  const openModal = (u: Usuario) => {
    setEditing({ ...u });
    setModalOpen(true);
  };
  const closeModal = () => {
    setEditing(null);
    setModalOpen(false);
  };

  // PUT /usuarios/:id  body { nombre, email, rol }
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;

    const nombre = editing.nombre.trim();
    const email = editing.email.trim().toLowerCase();

    if (!nombre || !email) {
      await Swal.fire({ title: "Datos incompletos", text: "Nombre y email son obligatorios.", icon: "warning" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      await Swal.fire({ title: "Email inválido", text: "Ingresa un correo electrónico válido.", icon: "warning" });
      return;
    }

    try {
      const url = apiUrl(`${BY_ID_PATH}/${encodeURIComponent(editing.id)}`);
      const resp = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          nombre,
          email,
          rol: editing.rol,
        }),
      });
      const json = await safeJson(resp);
      if (!resp.ok) {
        if (resp.status === 409) throw new Error("El email ya existe");
        throw new Error(json?.message ?? "Error al guardar usuario");
      }

      closeModal();
      await Swal.fire({
        title: "Cambios guardados",
        text: `El usuario ${nombre} fue actualizado correctamente.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      // Refresca por si cambió algún filtro/paginación en servidor
      fetchUsuarios();
    } catch (error: any) {
      Swal.fire({
        title: "Error",
        text: error?.message ?? "Ocurrió un error al guardar el usuario.",
        icon: "error",
      });
    }
  };

  // PATCH /usuarios/:id/activo -> { activo: boolean }
  const handleToggleActivo = async (u: Usuario) => {
    if (!token) return;

    try {
      if (u.activo) {
        const { isConfirmed } = await Swal.fire({
          title: "Desactivar usuario",
          text: `¿Desactivar a ${u.nombre}? Podrás activarlo nuevamente.`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sí, desactivar",
          cancelButtonText: "Cancelar",
          reverseButtons: true,
          focusCancel: true,
          confirmButtonColor: "#ea580c",
          cancelButtonColor: "#6b7280",
        });
        if (!isConfirmed) return;
      }

      setToggling((p) => ({ ...p, [u.id]: true }));

      const url = apiUrl(`${BY_ID_PATH}/${encodeURIComponent(u.id)}/activo`);
      const resp = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ activo: !u.activo }),
      });
      const json = await safeJson(resp);
      if (!resp.ok) throw new Error(json?.message ?? "No se pudo cambiar el estado");

      await Swal.fire({
        title: u.activo ? "Usuario desactivado" : "Usuario activado",
        text: `El usuario ${u.nombre} se ${u.activo ? "desactivó" : "activó"} correctamente.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      fetchUsuarios();
    } catch (error: any) {
      Swal.fire({
        title: "Error",
        text: error?.message ?? "Ocurrió un error al cambiar el estado del usuario.",
        icon: "error",
      });
    } finally {
      setToggling((p) => ({ ...p, [u.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Gestión de Usuarios
                </h1>
                <p className="text-gray-600 mt-1">
                  Administra y controla los usuarios del sistema
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/usuarios/crear")}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">Filtros de búsqueda</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Rol (cliente) */}
            <select
              value={rolFilter}
              onChange={(e) => setRolFilter(e.target.value as Rol | "todos")}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="todos">Todos los roles</option>
              <option value="usuario">Usuario</option>
              <option value="tecnico">Técnico</option>
              <option value="coordinador">Coordinador</option>
            </select>

            {/* Activo */}
            <select
              value={activoFilter}
              onChange={(e) => setActivoFilter(e.target.value as "todos" | "activo" | "inactivo")}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="todos">Activos e inactivos</option>
              <option value="activo">Solo activos</option>
              <option value="inactivo">Solo inactivos</option>
            </select>
          </div>

          {/* Contador + Paginación resumida */}
          <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            Mostrando <span className="font-semibold">{from}</span> –{" "}
            <span className="font-semibold">{to}</span> de{" "}
            <span className="font-semibold">{total}</span> usuarios
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando usuarios...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
            <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {total === 0 ? "No hay usuarios registrados" : "No se encontraron usuarios"}
            </h3>
            <p className="text-gray-500">
              {total === 0
                ? "Comienza creando tu primer usuario haciendo clic en 'Nuevo Usuario'"
                : "Intenta ajustar los filtros de búsqueda"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Activo
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((u) => (
                    <tr
                      key={u.id}
                      className={`transition-colors duration-200 hover:bg-blue-50 ${!u.activo ? "opacity-60" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${u.activo ? "bg-green-400" : "bg-gray-400"}`}></div>
                          <span className="font-semibold text-gray-900">{u.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-gray-900 truncate" title={u.email}>
                            {u.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RolBadge rol={u.rol} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Toggle
                            checked={u.activo}
                            onChange={() => handleToggleActivo(u)}
                            disabled={!!toggling[u.id]}
                            label={`Alternar activo para ${u.nombre}`}
                          />

                          {toggling[u.id] && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => u.activo && openModal(u)}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              u.activo
                                ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={!u.activo}
                            title={u.activo ? "Editar usuario" : "Debe estar activo para editar"}
                          >
                            <PencilIcon className="h-4 w-4" />
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                Página <span className="font-semibold">{page}</span> de{" "}
                <span className="font-semibold">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>

                {/* Números de página (simple, con ventana) */}
                {Array.from({ length: totalPages })
                  .slice(Math.max(0, page - 3), Math.max(0, page - 3) + Math.min(5, totalPages))
                  .map((_, idx) => {
                    const pageNum = Math.max(1, page - 2) + idx;
                    if (pageNum > totalPages) return null;
                    const active = pageNum === page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-2 rounded-lg border ${
                          active
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal edición */}
        {modalOpen && editing && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                    <PencilIcon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Editar Usuario</h3>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={editing.nombre}
                      onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                      </div>
                      <input
                        type="email"
                        value={editing.email}
                        onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                        maxLength={160}
                        placeholder="correo@dominio.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rol
                    </label>
                    <select
                      value={editing.rol as string}
                      onChange={(e) => setEditing({ ...editing, rol: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="usuario">Usuario</option>
                      <option value="tecnico">Técnico</option>
                      <option value="coordinador">Coordinador</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 hover:text-gray-900 transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RegistroUsuario;
