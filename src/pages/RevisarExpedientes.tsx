// src/pages/RevisarExpedientes.tsx
import { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import useAuth from "../auth/useAuth";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { apiUrl } from "../config/env";

interface Indicio {
  id: string;
  descripcion: string | null;
  color: string | null;
  tamano: string | null;
  peso: number | null; // kg
  ubicacion: string | null;
  tecnico_id?: string;
}

type Estado = "pendiente" | "aprobado" | "rechazado";

interface Expediente {
  id?: string;
  codigo: string;
  fecha_registro: string | null;
  tecnico_nombre: string;
  tecnico_id: string;
  estado: Estado;
  descripcion?: string | null;
  justificacion?: string;
  aprobador_id?: string | null;
  aprobador_nombre?: string | null;
  fecha_estado?: string | null;
  activo?: boolean;
  indicios: Indicio[];
}

// Endpoints: GET con E mayúscula; mutaciones en minúscula
const EXP_LIST_PATH = "/Expedientes";   // GET listar y GET por código
const EXP_MUT_PATH  = "/expedientes";   // PATCH estado
const IND_PATH      = "/Indicios";      // GET indicios por expediente

const PAGE_SIZE = 10;

/** ====== Helpers ====== */
async function safeJson(resp: Response) {
  const ct = resp.headers.get("content-type") || "";
  if (resp.status === 204) return {};
  if (!ct.includes("application/json")) {
    const text = await resp.text().catch(() => "");
    try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
  }
  return resp.json().catch(() => ({}));
}

/** Mapea posibles variaciones del backend a nuestro shape fijo */
function toExpediente(exp: any, indicios: Indicio[]): Expediente {
  return {
    id: String(exp?.id ?? ""),
    codigo: String(exp?.codigo ?? ""),
    // fecha_registro puede venir como fecha_registro o creado_en
    fecha_registro: exp?.fecha_registro ?? exp?.creado_en ?? null,

    // nombre del técnico puede venir con distintas llaves
    tecnico_nombre:
      exp?.tecnico_nombre ??
      exp?.tecnico_username ?? // alias en SP
      exp?.tecnico?.nombre ??
      exp?.tecnico?.username ??
      "",
    tecnico_id: String(exp?.tecnico_id ?? ""),

    estado: (exp?.estado ?? "pendiente") as Estado,
    descripcion: exp?.descripcion ?? null,
    justificacion: exp?.justificacion ?? null,

    // aprobador puede venir con varias llaves
    aprobador_id: exp?.aprobador_id != null ? String(exp.aprobador_id) : null,
    aprobador_nombre:
      exp?.aprobador_nombre ??
      exp?.aprobador_username ??
      exp?.aprobador?.nombre ??
      null,

    fecha_estado: exp?.fecha_estado ?? null,
    activo: exp?.activo === true || exp?.activo === 1 || exp?.activo === "1",
    indicios,
  };
}

/** Normaliza filas de indicios para evitar tipos inesperados */
function normalizeIndicio(r: any): Indicio {
  return {
    id: String(r?.id),
    descripcion: r?.descripcion ?? null,
    color: r?.color ?? null,
    tamano: r?.tamano ?? null,
    // fuerza a number si viene string; si no hay valor -> null
    peso: r?.peso === undefined || r?.peso === null ? null : Number(r?.peso),
    ubicacion: r?.ubicacion ?? null,
    tecnico_id: r?.tecnico_id != null ? String(r?.tecnico_id) : undefined,
  };
}

const RevisarExpedientes = () => {
  const { token, id: userId, username: userUsername } = useAuth();

  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechazoJustificacion, setRechazoJustificacion] = useState("");
  const [expedienteRechazando, setExpedienteRechazando] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 🔎 búsqueda por código
  const [codigoQuery, setCodigoQuery] = useState("");

  // 🔢 paginación servidor
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    [token]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  // Cargar indicios por código (paginado 50) — ruta con "E" mayúscula
  const fetchIndiciosDe = async (codigo: string) => {
    const params = new URLSearchParams();
    params.set("q", "");
    params.set("page", "1");
    params.set("pageSize", "50");
    params.set("_", String(Date.now()));

    const url = apiUrl(`${EXP_LIST_PATH}/${encodeURIComponent(codigo)}${IND_PATH}?${params.toString()}`);

    try {
      const indRes = await fetch(url, { headers: authHeaders });
      const j: any = await safeJson(indRes);
      const rows: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      return rows.map(normalizeIndicio);
    } catch {
      return [];
    }
  };

  // Listar todos (paginado) o buscar por código (1 resultado)
  const fetchExpedientes = async (codigo?: string) => {
    setLoading(true);
    try {
      if (codigo && codigo.trim()) {
        // GET por código usando /Expedientes/:codigo (mayúscula)
        const url = apiUrl(`${EXP_LIST_PATH}/${encodeURIComponent(codigo.trim())}?_=${Date.now()}`);
        const res = await fetch(url, { headers: authHeaders });

        if (res.status === 404) {
          setExpedientes([]);
          setTotal(0);
          await Swal.fire({
            title: "Sin resultados",
            text: `No se encontró el expediente con código ${codigo.trim()}.`,
            icon: "info",
            confirmButtonText: "Ok",
            confirmButtonColor: "#3b82f6",
          });
          return;
        }
        if (!res.ok) {
          const j = await safeJson(res);
          throw new Error((j as any)?.message || "No se pudo obtener el expediente.");
        }

        const data = await safeJson(res);
        const expBase: any =
          (Array.isArray(data) ? data[0] : (data as any)?.data ?? data) ?? null;

        if (!expBase) {
          setExpedientes([]);
          setTotal(0);
          await Swal.fire({
            title: "Sin resultados",
            text: `No se encontró el expediente con código ${codigo.trim()}.`,
            icon: "info",
            confirmButtonText: "Ok",
            confirmButtonColor: "#3b82f6",
          });
          return;
        }

        const indicios = await fetchIndiciosDe(expBase.codigo);
        const base = toExpediente(expBase, indicios);
        setExpedientes([base]);
        setTotal(1);
        setPage(1);
      } else {
        // GET paginado /Expedientes
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        params.set("_", String(Date.now()));

        const url = apiUrl(`${EXP_LIST_PATH}?${params.toString()}`);
        const expRes = await fetch(url, { headers: authHeaders });
        if (!expRes.ok) throw new Error("No se pudo obtener expedientes");

        const raw: any = await safeJson(expRes);
        const rows: any[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        const totalServer = Number(raw?.total ?? rows.length ?? 0);

        // Cargar indicios por cada expediente (N+1 requests)
        const withIndicios: Expediente[] = await Promise.all(
          rows.map(async (exp: any) => {
            const indicios = await fetchIndiciosDe(exp.codigo);
            return toExpediente(exp, indicios);
          })
        );

        setExpedientes(withIndicios);
        setTotal(totalServer);
      }
    } catch (e: any) {
      console.error(e);
      setExpedientes([]);
      setTotal(0);
      await Swal.fire({
        title: "Error",
        text: e?.message || "No se pudieron cargar los expedientes.",
        icon: "error",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchExpedientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (!codigoQuery.trim()) {
      fetchExpedientes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const EstadoChip = ({ value }: { value: Estado }) => {
    const map = {
      aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rechazado: "bg-rose-50 text-rose-700 border-rose-200",
      pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    } as const;
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full border ${map[value]}`}>
        {value.toUpperCase()}
      </span>
    );
  };

  /** ====== Acciones ====== */
  const aprobarExpediente = async (codigo: string, activo?: boolean) => {
    if (activo === false) {
      await Swal.fire({
        title: "Expediente inactivo",
        text: "No puedes aprobar un expediente inactivo.",
        icon: "info",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    if (!userId) {
      await Swal.fire({
        title: "Sesión requerida",
        text: "No se detectó el usuario aprobador. Vuelve a iniciar sesión.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Aprobar expediente",
      text: `¿Confirmas aprobar el expediente ${codigo}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, aprobar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
    });
    if (!confirm.isConfirmed) return;

    try {
      // PATCH en minúscula
      const url = apiUrl(`${EXP_MUT_PATH}/${encodeURIComponent(codigo)}/estado`);
      const resp = await fetch(url, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ estado: "aprobado", justificacion: "" }),
      });

      if (!resp.ok) {
        const j = await safeJson(resp);
        throw new Error((j as any)?.message || "No se pudo aprobar.");
      }

      setExpedientes((prev) =>
        prev.map((e) =>
          e.codigo === codigo
            ? {
                ...e,
                estado: "aprobado" as const,
                justificacion: "",
                aprobador_id: String(userId),
                aprobador_nombre: userUsername ?? null,
                fecha_estado: new Date().toISOString(),
              }
            : e
        )
      );

      await Swal.fire({
        title: "Aprobado",
        text: `El expediente ${codigo} fue aprobado.`,
        icon: "success",
        confirmButtonText: "Listo",
        confirmButtonColor: "#10b981",
        timer: 1600,
        timerProgressBar: true,
      });
    } catch (error: any) {
      await Swal.fire({
        title: "No se pudo aprobar",
        text: error?.message || "Ocurrió un error al aprobar.",
        icon: "error",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const prepararRechazo = (codigo: string, activo?: boolean) => {
    if (activo === false) {
      Swal.fire({
        title: "Expediente inactivo",
        text: "No puedes rechazar un expediente inactivo.",
        icon: "info",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }
    setExpedienteRechazando(codigo);
    setRechazoJustificacion("");
  };

  const confirmarRechazo = async () => {
    const codigo = expedienteRechazando;
    if (!codigo) return;

    if (!rechazoJustificacion.trim()) {
      await Swal.fire({
        title: "Falta justificación",
        text: "Debes ingresar una justificación para rechazar.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }
    if (!userId) {
      await Swal.fire({
        title: "Sesión requerida",
        text: "No se detectó el usuario aprobador. Vuelve a iniciar sesión.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    try {
      const url = apiUrl(`${EXP_MUT_PATH}/${encodeURIComponent(codigo)}/estado`);
      const resp = await fetch(url, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ estado: "rechazado", justificacion: rechazoJustificacion }),
      });

      if (!resp.ok) {
        const j = await safeJson(resp);
        throw new Error((j as any)?.message || "No se pudo rechazar.");
      }

      setExpedientes((prev) =>
        prev.map((e) =>
          e.codigo === codigo
            ? {
                ...e,
                estado: "rechazado" as const,
                justificacion: rechazoJustificacion,
                aprobador_id: String(userId),
                aprobador_nombre: userUsername ?? null,
                fecha_estado: new Date().toISOString(),
              }
            : e
        )
      );

      await Swal.fire({
        title: "Rechazado",
        text: `El expediente ${codigo} fue rechazado.`,
        icon: "success",
        confirmButtonText: "Listo",
        confirmButtonColor: "#10b981",
        timer: 1600,
        timerProgressBar: true,
      });
    } catch (error: any) {
      await Swal.fire({
        title: "No se pudo rechazar",
        text: error?.message || "Ocurrió un error al rechazar.",
        icon: "error",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setExpedienteRechazando(null);
      setRechazoJustificacion("");
    }
  };

  /** ====== Render ====== */
  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="flex items-center gap-3 text-blue-700">
          <ArrowPathIcon className="h-6 w-6 animate-spin" />
          Cargando expedientes…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-white">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <ClipboardDocumentListIcon className="h-8 w-8" />
                  Revisión de Expedientes
                </h2>
                <button
                  onClick={() => {
                    setRefreshing(true);
                    fetchExpedientes(codigoQuery.trim() || undefined);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition flex items-center gap-2"
                  title="Actualizar"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                  Actualizar
                </button>
              </div>

              {/* 🔎 Buscador por código */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-white/80" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por CÓDIGO de expediente… (Ej: EXP-2025-001)"
                    value={codigoQuery}
                    onChange={(e) => setCodigoQuery(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  {codigoQuery && (
                    <button
                      onClick={() => setCodigoQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/80 hover:text-white"
                      aria-label="Limpiar búsqueda"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPage(1);
                      fetchExpedientes(codigoQuery.trim() || undefined);
                    }}
                    className="px-5 py-3 rounded-xl bg-white text-blue-700 font-semibold shadow hover:shadow-md transition"
                  >
                    Buscar
                  </button>
                  <button
                    onClick={() => {
                      setCodigoQuery("");
                      setPage(1);
                      fetchExpedientes();
                    }}
                    className="px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition"
                  >
                    Mostrar todos
                  </button>
                </div>
              </div>

              {!codigoQuery.trim() && (
                <div className="text-sm text-white/90">
                  Mostrando <span className="font-semibold">{from}</span> –{" "}
                  <span className="font-semibold">{to}</span> de{" "}
                  <span className="font-semibold">{total}</span> expedientes
                </div>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="p-6 space-y-6">
            {expedientes.length === 0 ? (
              <div className="text-center text-gray-600 py-12">
                <ExclamationTriangleIcon className="h-10 w-10 mx-auto text-amber-500 mb-2" />
                No hay expedientes para revisar.
              </div>
            ) : (
              expedientes.map((expediente) => (
                <div
                  key={expediente.codigo}
                  className={`relative p-5 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition ${
                    expediente.activo === false ? "opacity-80" : ""
                  }`}
                >
                  {/* Estado a la derecha */}
                  <div className="absolute top-5 right-5 flex items-center gap-3">
                    <EstadoChip value={expediente.estado} />
                    {expediente.activo === false && (
                      <span className="text-xs px-2.5 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200">
                        INACTIVO
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold text-gray-800">
                    Expediente: <span className="text-blue-700">{expediente.codigo}</span>
                  </h3>
                  <div className="mt-1 text-sm text-gray-600">
                    <p>Fecha de registro: {formatDate(expediente.fecha_registro)}</p>
                    <p>Técnico: {expediente.tecnico_nombre}</p>
                    {expediente.descripcion && <p>Descripción: {expediente.descripcion}</p>}
                    {expediente.aprobador_nombre && <p>Aprobador: {expediente.aprobador_nombre}</p>}
                    {expediente.fecha_estado && (
                      <p>Fecha cambio estado: {formatDate(expediente.fecha_estado)}</p>
                    )}
                  </div>

                  {expediente.estado === "rechazado" && expediente.justificacion && (
                    <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <span className="font-semibold">Justificación:</span>{" "}
                      {expediente.justificacion}
                    </div>
                  )}

                  {/* Indicios */}
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Indicios</h4>
                    <ul className="pl-5 list-disc text-sm text-gray-700">
                      {expediente.indicios?.length ? (
                        expediente.indicios.map((indicio) => (
                          <li key={indicio.id}>
                            <strong>{indicio.descripcion || "Sin descripción"}</strong>
                            {indicio.color && <> – Color: {indicio.color}</>}
                            {indicio.tamano && <> | Tamaño: {indicio.tamano}</>}
                            {indicio.peso !== null && <> | Peso: {indicio.peso} kg</>}
                            {indicio.ubicacion && <> | Ubicación: {indicio.ubicacion}</>}
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-400">Sin indicios registrados.</li>
                      )}
                    </ul>
                  </div>

                  {/* Acciones */}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => aprobarExpediente(expediente.codigo, expediente.activo)}
                      disabled={expediente.estado === "aprobado" || expediente.activo === false}
                      className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold transition ${
                        expediente.estado === "aprobado" || expediente.activo === false
                          ? "bg-emerald-100 text-emerald-500 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                      }`}
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      Aprobar
                    </button>

                    <button
                      onClick={() => prepararRechazo(expediente.codigo, expediente.activo)}
                      disabled={expediente.estado === "rechazado" || expediente.activo === false}
                      className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold transition ${
                        expediente.estado === "rechazado" || expediente.activo === false
                          ? "bg-rose-100 text-rose-500 cursor-not-allowed"
                          : "bg-rose-600 hover:bg-rose-700 text-white shadow"
                      }`}
                    >
                      <XCircleIcon className="h-5 w-5" />
                      Rechazar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paginación (solo cuando NO hay búsqueda por código) */}
          {!codigoQuery.trim() && total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 pb-6">
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
          )}
        </div>
      </div>

      {/* Modal de rechazo */}
      {expedienteRechazando && (
        <div className="fixed inset-0 z-[9999]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setExpedienteRechazando(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Justificación del Rechazo</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Expediente: <span className="font-semibold">{expedienteRechazando}</span>
                </p>
              </div>
              <div className="p-6">
                <textarea
                  value={rechazoJustificacion}
                  onChange={(e) => setRechazoJustificacion(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe el motivo del rechazo…"
                />
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={() => setExpedienteRechazando(null)}
                    className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarRechazo}
                    disabled={!rechazoJustificacion.trim()}
                    className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-50"
                  >
                    Confirmar Rechazo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisarExpedientes;
