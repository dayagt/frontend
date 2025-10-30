// src/pages/RegistroIndicio.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";
import {
  PlusIcon,
  PencilIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/solid";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { apiUrl } from "../config/env";

interface Indicio {
  id?: string;
  codigo: string;
  expediente_codigo: string;
  descripcion: string;
  color?: string | null;
  tamano?: string | null;
  peso?: number | null;
  tecnico_id?: string;
  fecha_registro?: string | null;
  activo: boolean;
  estado?: "pendiente" | "aprobado" | "rechazado";
}

const EXP_PATH = "/Expedientes"; // respeta la E mayúscula según tu API
const IND_PATH = "/Indicios";    // respeta la I mayúscula según tu API
const PAGE_SIZE = 10;

// ========= util =========
async function safeJson(resp: Response) {
  const ct = resp.headers.get("content-type") || "";
  if (resp.status === 204) return {};
  if (!ct.includes("application/json")) {
    const text = await resp.text().catch(() => "");
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  }
  return resp.json().catch(() => ({}));
}

// ---- Toggle ----
const Toggle = ({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label ?? "Cambiar activo"}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
      ${checked ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-gray-200 to-gray-300"}
    `}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-300
        ${checked ? "translate-x-6" : "translate-x-1"}
      `}
    />
  </button>
);

// ---- Badge Activo ----
const ActivoBadge = ({ activo }: { activo: boolean }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
      activo
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-600 border-gray-200"
    }`}
  >
    <span className={`h-2 w-2 rounded-full ${activo ? "bg-green-500" : "bg-gray-400"}`} />
    {activo ? "Activo" : "Inactivo"}
  </span>
);

// ---- Modal edición ----
function EditModal({
  open,
  onClose,
  indicio,
  onChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  indicio: Indicio | null;
  onChange: (next: Partial<Indicio>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open || !indicio) return null;
  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
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
            <h3 className="text-xl font-bold text-gray-900">Editar Indicio</h3>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código *
              </label>
              <input
                type="text"
                value={indicio.codigo}
                onChange={(e) => onChange({ codigo: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción *
              </label>
              <textarea
                value={indicio.descripcion}
                onChange={(e) => onChange({ descripcion: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                rows={4}
                required
                placeholder="Describe el indicio..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="any"
                  value={indicio.peso ?? ""}
                  onChange={(e) =>
                    onChange({
                      peso: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="0.3"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  value={indicio.color ?? ""}
                  onChange={(e) => onChange({ color: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Negro"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tamaño
                </label>
                <input
                  type="text"
                  value={indicio.tamano ?? ""}
                  onChange={(e) => onChange({ tamano: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="20 cm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
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
  );
}

const RegistroIndicio = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [codigoExpediente, setCodigoExpediente] = useState<string>("");
  const [indicios, setIndicios] = useState<Indicio[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [activoFilter, setActivoFilter] = useState<"todos" | "activo" | "inactivo">("todos");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndicio, setEditingIndicio] = useState<Indicio | null>(null);
  const [codigoLookup, setCodigoLookup] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  // Buscar indicios por expediente
  const fetchIndicios = useCallback(async () => {
    if (!token || !codigoExpediente.trim()) {
      setIndicios([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      if (activoFilter !== "todos") {
        params.set("activo", activoFilter === "activo" ? "true" : "false");
      }
      params.set("_", String(Date.now()));

      const requestUrl = apiUrl(
        `${EXP_PATH}/${encodeURIComponent(codigoExpediente)}${IND_PATH}?${params.toString()}`
      );
      // console.log("[Indicios][GET]", requestUrl);

      const response = await fetch(requestUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const json: any = await safeJson(response);
      if (!response.ok) throw new Error(json?.message ?? "No se pudo listar indicios");

      const rows: any[] =
        Array.isArray(json?.data) ? json.data :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json) ? json : [];

      const mapped: Indicio[] = rows.map((r) => ({
        id: r.id,
        codigo: String(r.codigo ?? ""),
        expediente_codigo: String(r.expediente_codigo ?? codigoExpediente),
        descripcion: String(r.descripcion ?? ""),
        color: r.color ?? null,
        tamano: r.tamano ?? null,
        peso: r.peso === undefined || r.peso === null ? null : Number(r.peso),
        tecnico_id: r.tecnico_id ?? undefined,
        fecha_registro: r.fecha_registro ?? null,
        activo: r.activo === true || r.activo === 1 || r.activo === "1",
        estado: r.estado ?? "pendiente",
      }));

      setIndicios(mapped);
      setTotal(Number(json?.total ?? json?.totalCount ?? mapped.length ?? 0));
    } catch (error) {
      console.error("Error al obtener indicios:", error);
      setIndicios([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, codigoExpediente, page, searchTerm, activoFilter]);

  // Reinicia a página 1 si cambian filtros o búsqueda o el expediente
  useEffect(() => {
    setPage(1);
  }, [searchTerm, activoFilter, codigoExpediente]);

  useEffect(() => {
    fetchIndicios();
  }, [fetchIndicios]);

  const openModal = (indicio: Indicio) => {
    setEditingIndicio({ ...indicio });
    setCodigoLookup(indicio.codigo);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingIndicio(null);
    setCodigoLookup(null);
    setModalOpen(false);
  };

  // PUT /Expedientes/:codigo/Indicios/:codigoIndicio
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingIndicio || !codigoLookup || !codigoExpediente) return;

    // Validaciones mínimas
    if (!editingIndicio.codigo.trim() || !editingIndicio.descripcion.trim()) {
      await Swal.fire({
        title: "Validación",
        text: "Código y descripción son obligatorios.",
        icon: "info",
      });
      return;
    }
    // TS-safe: solo valida si es number y además NaN
    if (typeof editingIndicio.peso === "number" && Number.isNaN(editingIndicio.peso)) {
      await Swal.fire({
        title: "Validación",
        text: "El peso debe ser un número válido.",
        icon: "info",
      });
      return;
    }

    try {
      const url = apiUrl(
        `${EXP_PATH}/${encodeURIComponent(codigoExpediente)}${IND_PATH}/${encodeURIComponent(codigoLookup)}`
      );

      const payload = {
        codigo: editingIndicio.codigo.trim().toUpperCase(),
        descripcion: editingIndicio.descripcion.trim(),
        // si es number válido lo mandamos; si es null/undefined/NaN, mandamos null
        peso:
          typeof editingIndicio.peso === "number" && !Number.isNaN(editingIndicio.peso)
            ? editingIndicio.peso
            : null,
        color: editingIndicio.color?.trim() || null,
        tamano: editingIndicio.tamano?.trim() || null,
      };

      const resp = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(resp);
      if (!resp.ok) throw new Error(json?.message ?? "Error al guardar indicio");

      closeModal();
      await Swal.fire({
        title: "Cambios guardados",
        text: `El indicio ${payload.codigo} fue actualizado correctamente.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      fetchIndicios();
    } catch (error: any) {
      console.error("Error al guardar indicio:", error);
      await Swal.fire({
        title: "Error",
        text: error?.message || "Ocurrió un error al guardar el indicio.",
        icon: "error",
      });
    }
  };

  // PATCH /Expedientes/:codigo/Indicios/:codigoIndicio/activo
  const handleToggleActivo = async (ind: Indicio) => {
    if (!token || !codigoExpediente) return;

    try {
      if (ind.activo) {
        const { isConfirmed } = await Swal.fire({
          title: "Desactivar indicio",
          text: `¿Desactivar el indicio ${ind.codigo}? Podrás activarlo nuevamente.`,
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

      setToggling((p) => ({ ...p, [ind.codigo]: true }));

      const url = apiUrl(
        `${EXP_PATH}/${encodeURIComponent(codigoExpediente)}${IND_PATH}/${encodeURIComponent(ind.codigo)}/activo`
      );

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activo: !ind.activo }),
      });

      const json = await safeJson(response);
      if (!response.ok) throw new Error(json?.message || "Error al cambiar estado de indicio");

      // Update optimista inmediato
      setIndicios((prev) =>
        prev.map((r) => (r.codigo === ind.codigo ? { ...r, activo: !r.activo } : r))
      );

      await Swal.fire({
        title: ind.activo ? "Indicio desactivado" : "Indicio activado",
        text: `El indicio ${ind.codigo} se ${ind.activo ? "desactivó" : "activó"} correctamente.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      fetchIndicios();
    } catch (error: any) {
      console.error("Error al cambiar estado de indicio:", error);
      await Swal.fire({
        title: "Error",
        text: error?.message || "Ocurrió un error al cambiar el estado del indicio.",
        icon: "error",
      });
    } finally {
      setToggling((p) => ({ ...p, [ind.codigo]: false }));
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
                <DocumentTextIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Gestión de Indicios
                </h1>
                <p className="text-gray-600 mt-1">Consulta y administra indicios por expediente</p>
              </div>
            </div>

            <button
              onClick={() => navigate("/indicio-form")}
              className="px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl transform hover:scale-105"
              title="Crear nuevo indicio"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Indicio
            </button>
          </div>

          {/* Buscador de expediente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                </div>
                <input
                  type="text"
                  placeholder="Código de expediente (ej: EXP-004)"
                  value={codigoExpediente}
                  onChange={(e) => setCodigoExpediente(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 uppercase"
                />
              </div>
            </div>
            <div>
              <button
                onClick={() => fetchIndicios()}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                Buscar
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">Filtros de búsqueda</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda por texto */}
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

            {/* Filtro activo */}
            <select
              value={activoFilter}
              onChange={(e) => setActivoFilter(e.target.value as "todos" | "activo" | "inactivo")}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="todos">Activos e inactivos</option>
              <option value="activo">Solo activos</option>
              <option value="inactivo">Solo inactivos</option>
            </select>

            {/* Placeholder */}
            <div />
          </div>

          {/* Contador */}
          <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            Mostrando <span className="font-semibold">{from}</span> –{" "}
            <span className="font-semibold">{to}</span> de{" "}
            <span className="font-semibold">{total}</span> indicios
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando indicios...</p>
          </div>
        ) : !codigoExpediente ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center text-gray-600">
            Ingresa un código de expediente para ver sus indicios.
          </div>
        ) : indicios.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center text-gray-600">
            No se encontraron indicios para el expediente <b>{codigoExpediente}</b>.
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Peso
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tamaño
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {indicios.map((ind) => (
                    <tr
                      key={ind.codigo}
                      className={`transition-colors duration-200 hover:bg-blue-50 ${!ind.activo ? "opacity-60" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">{ind.codigo}</td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-gray-900 truncate" title={ind.descripcion}>
                            {ind.descripcion}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{ind.peso ?? "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{ind.color ?? "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{ind.tamano ?? "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <ActivoBadge activo={ind.activo} />
                          <Toggle
                            checked={ind.activo}
                            onChange={() => handleToggleActivo(ind)}
                            disabled={!!toggling[ind.codigo]}
                            label={`Alternar activo para ${ind.codigo}`}
                          />
                          {toggling[ind.codigo] && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => ind.activo && openModal(ind)}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              ind.activo
                                ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={!ind.activo}
                            title={ind.activo ? "Editar indicio" : "Debe estar activo para editar"}
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

        {/* Modal edición */}
        <EditModal
          open={modalOpen}
          onClose={closeModal}
          indicio={editingIndicio}
          onChange={(next) => setEditingIndicio((prev) => (prev ? { ...prev, ...next } : prev))}
          onSubmit={handleSave}
        />
      </div>
    </div>
  );
};

export default RegistroIndicio;
