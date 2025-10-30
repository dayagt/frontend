// src/pages/RegistroExpedientes.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";
import {
  PlusIcon,
  PencilIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/solid";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { apiUrl } from '../config/env';

type Estado = "pendiente" | "aprobado" | "rechazado";

interface Expediente {
  id: string;
  codigo: string;
  descripcion: string;
  fecha_registro: string | null;

  tecnico_id: string;
  tecnico_nombre?: string | null;     // 👈 agregado

  justificacion?: string | null;
  estado: Estado;

  aprobador_id?: string | null;
  aprobador_nombre?: string | null;   // 👈 agregado

  fecha_estado?: string | null;
  activo: boolean;
}


const LIST_PATH = "/Expedientes";   // GET listar/buscar (E mayúscula)
const BY_CODE_PATH = "/expedientes"; // POST/PUT/PATCH (minúscula)
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

// ---- Badge Estado ----
const EstadoBadge = ({ estado }: { estado: Estado }) => {
  const cfg = {
    pendiente: { icon: ClockIcon, text: "Pendiente", classes: "bg-yellow-50 text-yellow-700 border-yellow-200", iconClasses: "text-yellow-500" },
    aprobado:  { icon: CheckCircleIcon, text: "Aprobado", classes: "bg-green-50 text-green-700 border-green-200", iconClasses: "text-green-500" },
    rechazado: { icon: XCircleIcon, text: "Rechazado", classes: "bg-red-50 text-red-700 border-red-200", iconClasses: "text-red-500" },
  } as const;
  const Icon = cfg[estado].icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg[estado].classes}`}>
      <Icon className={`h-3 w-3 ${cfg[estado].iconClasses}`} />
      {cfg[estado].text}
    </span>
  );
};

const RegistroExpediente = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  // server-side query params
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<Estado | "todos">("todos");
  const [activoFilter, setActivoFilter] = useState<"todos" | "activo" | "inactivo">("todos");

  // modal edición
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expediente | null>(null);
  const [codigoLookup, setCodigoLookup] = useState<string | null>(null);

  // toggling activo loading por código
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  // ====== Normalizador con fallbacks de llaves ======
  const normalizeExp = (r: any): Expediente => ({
    id: String(r.id),
    codigo: String(r.codigo ?? ""),
    descripcion: String(r.descripcion ?? ""),
    fecha_registro: r.fecha_registro ?? r.creado_en ?? null,

    tecnico_id: r.tecnico_id != null ? String(r.tecnico_id) : "",
    aprobador_id: r.aprobador_id != null ? String(r.aprobador_id) : null,

    tecnico_nombre:
      r.tecnico_nombre ??
      r.tecnico_username ??     // si el SP lo expuso así
      r.nombre_tecnico ??
      r.tecnico?.nombre ??
      r.tecnico?.username ??
      null,

    aprobador_nombre:
      r.aprobador_nombre ??
      r.aprobador_username ??   // si el SP lo expuso así
      r.nombre_aprobador ??
      r.aprobador?.nombre ??
      r.aprobador?.username ??
      null,

    justificacion: r.justificacion ?? null,
    estado: (r.estado ?? "pendiente") as Estado,
    fecha_estado: r.fecha_estado ?? null,
    activo: r.activo === true || r.activo === 1 || r.activo === "1",
  });

  const fetchExpedientes = useCallback(async () => {
  if (!token) return;
  setLoading(true);
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (estadoFilter !== "todos") params.set("estado", estadoFilter);
    if (activoFilter !== "todos") {
      params.set("activo", activoFilter === "activo" ? "true" : "false");
    }
    params.set("_", String(Date.now()));

    // Usa apiUrl como función, respeta la E mayúscula
    const requestUrl = apiUrl(`${LIST_PATH}?${params.toString()}`);
    console.log("[Expedientes] GET:", requestUrl);

    const resp = await fetch(requestUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const json: any = await safeJson(resp);
    console.log("[Expedientes] status:", resp.status, "payload:", json);

    if (!resp.ok) throw new Error(json?.message ?? "No se pudo listar");

    const serverRows: any[] = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
      ? json
      : [];

    setRows(serverRows.map(normalizeExp));
    setTotal(Number(json?.total ?? serverRows.length ?? 0));
  } catch (e) {
    console.error("Error al obtener expedientes:", e);
    setRows([]);
    setTotal(0);
  } finally {
    setLoading(false);
  }
}, [token, page, searchTerm, estadoFilter, activoFilter]);


  useEffect(() => {
    fetchExpedientes();
  }, [fetchExpedientes]);

  // Resetear a página 1 cuando cambian filtros/búsqueda
  useEffect(() => {
    setPage(1);
  }, [searchTerm, estadoFilter, activoFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  const openModal = (exp: Expediente) => {
    setEditing({ ...exp });
    setCodigoLookup(exp.codigo);
    setModalOpen(true);
  };
  const closeModal = () => {
    setEditing(null);
    setCodigoLookup(null);
    setModalOpen(false);
  };

  // PUT /expedientes/:codigo_lookup  body { codigo, descripcion }
const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!token || !editing || !codigoLookup) return;

  try {
    const url = apiUrl(`${BY_CODE_PATH}/${encodeURIComponent(codigoLookup)}`); //  usa apiUrl(path)
    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        codigo: editing.codigo.trim().toUpperCase(),  // opcional: normaliza
        descripcion: editing.descripcion.trim(),
      }),
    });

    const json = await safeJson(resp);
    if (!resp.ok) throw new Error(json?.message ?? `Error al guardar expediente (HTTP ${resp.status})`);

    // Si tu API devuelve el registro actualizado en json.data, puedes reflejarlo al instante:
    if (json?.data) {
      setRows((rows) =>
        rows.map((r) => (r.codigo === codigoLookup ? normalizeExp(json.data) : r))
      );
    }

    closeModal();
    await Swal.fire({
      title: "Cambios guardados",
      text: `El expediente ${editing.codigo} fue actualizado correctamente.`,
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });

    // Refresca por si cambió la paginación o filtros en servidor
    fetchExpedientes();
  } catch (error: any) {
    Swal.fire({
      title: "Error",
      text: error?.message ?? "Ocurrió un error al guardar el expediente.",
      icon: "error",
    });
  }
};


// PATCH /expedientes/:codigo/activo -> { activo: boolean }
const handleToggleActivo = async (exp: Expediente) => {
  if (!token) return;

  try {
    if (exp.activo) {
      const { isConfirmed } = await Swal.fire({
        title: "Desactivar expediente",
        text: `¿Desactivar el expediente ${exp.codigo}? Podrás activarlo nuevamente.`,
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

    setToggling((p) => ({ ...p, [exp.codigo]: true }));

    //  usa apiUrl(path)
    const url = apiUrl(`${BY_CODE_PATH}/${encodeURIComponent(exp.codigo)}/activo`);
    const resp = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ activo: !exp.activo }),
    });

    const json = await safeJson(resp);
    if (!resp.ok) throw new Error(json?.message ?? "No se pudo cambiar el estado");

    //  Update optimista inmediato (sin esperar al refetch)
    setRows((rows) =>
      rows.map((r) =>
        r.codigo === exp.codigo ? { ...r, activo: !r.activo } : r
      )
    );

    await Swal.fire({
      title: exp.activo ? "Expediente desactivado" : "Expediente activado",
      text: `El expediente ${exp.codigo} se ${exp.activo ? "desactivó" : "activó"} correctamente.`,
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });

    //  Asegura sincronización con servidor (por si cambian filtros/paginación)
    fetchExpedientes();
  } catch (error: any) {
    Swal.fire({
      title: "Error",
      text: error?.message ?? "Ocurrió un error al cambiar el estado del expediente.",
      icon: "error",
    });
  } finally {
    setToggling((p) => ({ ...p, [exp.codigo]: false }));
  }
};


  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <DocumentTextIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Gestión de Expedientes
                </h1>
                <p className="text-gray-600 mt-1">
                  Administra y controla todos los expedientes del sistema
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/expediente-form")}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Expediente
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
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Estado */}
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as Estado | "todos")}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
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
            <span className="font-semibold">{total}</span> expedientes
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando expedientes...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
            <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {total === 0 ? "No hay expedientes registrados" : "No se encontraron expedientes"}
            </h3>
            <p className="text-gray-500">
              {total === 0
                ? "Comienza creando tu primer expediente haciendo clic en 'Nuevo Expediente'"
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
                      Código
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Descripción
                    </th>
                    {/*  NUEVO: Técnico */}
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Técnico
                    </th>
                    {/*  NUEVO: Aprobador */}
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Aprobador
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Estado
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
                  {rows.map((exp) => (
                    <tr
                      key={exp.id}
                      className={`transition-colors duration-200 hover:bg-blue-50 ${!exp.activo ? "opacity-60" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${exp.activo ? "bg-green-400" : "bg-gray-400"}`}></div>
                          <span className="font-semibold text-gray-900">{exp.codigo}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-gray-900 truncate" title={exp.descripcion}>
                            {exp.descripcion}
                          </p>
                        </div>
                      </td>

                      {/* 👇 Técnico */}
                      <td className="px-6 py-4">
                        <span title={exp.tecnico_nombre ?? ""}>
                          {exp.tecnico_nombre || "—"}
                        </span>
                      </td>

                      {/* 👇 Aprobador */}
                      <td className="px-6 py-4">
                        <span title={exp.aprobador_nombre ?? ""}>
                          {exp.aprobador_nombre || "—"}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <EstadoBadge estado={exp.estado} />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Toggle
                            checked={exp.activo}
                            onChange={() => handleToggleActivo(exp)}
                            disabled={!!toggling[exp.codigo]}
                            label={`Alternar activo para ${exp.codigo}`}
                          />
                          {toggling[exp.codigo] && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => exp.activo && openModal(exp)}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              exp.activo
                                ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={!exp.activo}
                            title={exp.activo ? "Editar expediente" : "Debe estar activo para editar"}
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

                {/* Números de página (ventana) */}
                {Array.from({ length: totalPages })
                  .slice(Math.max(0, page - 3), Math.max(0, page - 3) + Math.min(5, totalPages))
                  .map((_, idx) => {
                    const start = Math.max(1, page - 2);
                    const pageNum = start + idx;
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

        {/* Modal edición (overlay transparente para ver el sistema) */}
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
                  <h3 className="text-xl font-bold text-gray-900">Editar Expediente</h3>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Código del expediente
                    </label>
                    <input
                      type="text"
                      value={editing.codigo}
                      onChange={(e) => setEditing({ ...editing, codigo: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 uppercase"
                      required
                    />
                    {codigoLookup && codigoLookup !== editing.codigo && (
                      <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                        ⚠️ Se actualizará el registro cuyo código actual es <strong>{codigoLookup}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={editing.descripcion}
                      onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                      rows={4}
                      required
                      placeholder="Describe detalladamente el expediente..."
                    />
                  </div>

                  {/*  Solo lectura: técnico y aprobador */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Técnico</label>
                      <input
                        type="text"
                        value={editing?.tecnico_nombre || ""}
                        disabled
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Aprobador</label>
                      <input
                        type="text"
                        value={editing?.aprobador_nombre || ""}
                        disabled
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                      />
                    </div>
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

export default RegistroExpediente;
