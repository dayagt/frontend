// src/pages/IndicioForm.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";
import { apiUrl } from "../config/env"; // ruta desde /src/components

import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ScaleIcon,
  SwatchIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  TagIcon,
} from "@heroicons/react/24/solid";
import Swal from "sweetalert2";

interface Indicio {
  expedienteCodigo: string;
  codigo: string;       // <— NUEVO input para código del indicio
  descripcion: string;
  color: string;
  tamaño: string;
  peso: string;
  tecnico: string;
}

type Feedback = { type: "success" | "error"; message: string } | null;

type ExpedienteResumen = {
  codigo: string;
  descripcion?: string;
  estado?: "pendiente" | "aprobado" | "rechazado";
  activo?: boolean;
  fecha_registro?: string | null;
};



const IndicioForm = () => {
  const { token, username } = useAuth();
  const navigate = useNavigate();

  const [indicio, setIndicio] = useState<Indicio>({
    expedienteCodigo: "",
    codigo: "",
    descripcion: "",
    color: "",
    tamaño: "",
    peso: "",
    tecnico: username ?? "",
  });

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expedienteValido, setExpedienteValido] = useState(false);
  const [expedienteInfo, setExpedienteInfo] = useState<ExpedienteResumen | null>(null);
  const isDirtyRef = useRef(false);

  // Utilidad para parseo seguro
  const safeParse = async (resp: Response) => {
    const text = await resp.text();
    try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
  };

  // Mantener técnico mostrado
  useEffect(() => {
    setIndicio((p) => ({ ...p, tecnico: username ?? "" }));
  }, [username]);

  // Confirmar cierre si hay cambios
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Limpiar feedback a los 5s
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setIndicio((prev) => {
      let v = value;
      // Forzar MAYÚSCULAS en códigos
      if (name === "expedienteCodigo" || name === "codigo") v = v.toUpperCase().trimStart();
      return { ...prev, [name]: v };
    });

    // Si cambia el código de expediente, invalidar validación previa
    if (name === "expedienteCodigo") {
      setExpedienteValido(false);
      setExpedienteInfo(null);
    }

    isDirtyRef.current = true;
    if (feedback) setFeedback(null);
  };

  // Validar existencia de expediente
  const validarExpediente = async () => {
    const codigo = indicio.expedienteCodigo.trim();
    if (!codigo) {
      setFeedback({ type: "error", message: "Ingresa un código de expediente." });
      await Swal.fire({
        title: "Código requerido",
        text: "Debes ingresar un código de expediente para validar.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    try {
      const resp = await fetch(apiUrl(`/expedientes/${encodeURIComponent(codigo)}`), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await safeParse(resp);
      if (!resp.ok) throw new Error(data?.message || "Expediente no encontrado");

      setExpedienteValido(true);
      setExpedienteInfo({
        codigo: data.codigo ?? codigo,
        descripcion: data.descripcion ?? "",
        estado: data.estado ?? "pendiente",
        activo: data.activo ?? true,
        fecha_registro: data.fecha_registro ?? null,
      });
      setFeedback({ type: "success", message: "Expediente válido. Puedes registrar el indicio." });

      await Swal.fire({
        title: "Expediente válido",
        html: `<b>${data.codigo ?? codigo}</b> encontrado y activo para registrar indicios.`,
        icon: "success",
        confirmButtonText: "Continuar",
        confirmButtonColor: "#10b981",
        timer: 1800,
        timerProgressBar: true,
      });
    } catch (err: any) {
      setExpedienteValido(false);
      setExpedienteInfo(null);
      setFeedback({ type: "error", message: err?.message || "No se encontró el expediente." });

      await Swal.fire({
        title: "No encontrado",
        text: err?.message || "No se encontró el expediente.",
        icon: "error",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const handleGoBack = async () => {
    if (
      isDirtyRef.current &&
      (indicio.expedienteCodigo || indicio.codigo || indicio.descripcion || indicio.color || indicio.tamaño || indicio.peso)
    ) {
      const result = await Swal.fire({
        title: "¿Salir sin guardar?",
        text: "Tienes cambios sin guardar. ¿Estás seguro?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, salir",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;
    }
    isDirtyRef.current = false;
    navigate("/indicio");
  };

  // Enviar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validaciones
    if (!expedienteValido) {
      await Swal.fire({
        title: "Validación requerida",
        text: "Debes validar el código del expediente antes de guardar.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    const codigoInd = indicio.codigo.trim();
    const desc = indicio.descripcion.trim();

    if (!codigoInd) {
      await Swal.fire({
        title: "Falta código",
        text: "Ingresa el código del indicio (ej: IND-001).",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    const codigoOk = /^[A-Z0-9\-_.]{3,30}$/.test(codigoInd);
    if (!codigoOk) {
      await Swal.fire({
        title: "Código inválido",
        text: "Usa MAYÚSCULAS, números y - _ . (3 a 30 caracteres).",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    if (!desc) {
      await Swal.fire({
        title: "Falta descripción",
        text: "La descripción del indicio es obligatoria.",
        icon: "warning",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    let pesoValue: number | null = null;
    if (indicio.peso.trim() !== "") {
      pesoValue = Number(indicio.peso);
      if (isNaN(pesoValue)) {
        await Swal.fire({
          title: "Peso inválido",
          text: "El peso debe ser un número (usa punto decimal).",
          icon: "warning",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#f59e0b",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      // NO enviamos tecnico_id; el backend lo toma del token (req.user!.id)
      const payload = {
        codigo: codigoInd,
        descripcion: desc,
        color: indicio.color.trim(),
        tamano: indicio.tamaño.trim(),
        peso: pesoValue,
      };

      const resp = await fetch(
        apiUrl(`/expedientes/${encodeURIComponent(indicio.expedienteCodigo.trim())}/indicios`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await safeParse(resp);
      if (!resp.ok) throw new Error(data?.message || "Error al crear indicio");

      await Swal.fire({
        title: "¡Indicio registrado!",
        text: `El indicio ${codigoInd} se creó exitosamente.`,
        icon: "success",
        confirmButtonText: "Continuar",
        confirmButtonColor: "#10b981",
        timer: 2200,
        timerProgressBar: true,
      });

      isDirtyRef.current = false;
      setIndicio({
        expedienteCodigo: "",
        codigo: "",
        descripcion: "",
        color: "",
        tamaño: "",
        peso: "",
        tecnico: username ?? "",
      });
      setExpedienteValido(false);
      setExpedienteInfo(null);
      navigate("/indicio");
    } catch (err: any) {
      await Swal.fire({
        title: "Error",
        text: err?.message || "Error desconocido",
        icon: "error",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header navegación */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
            className="group inline-flex items-center gap-3 px-6 py-3 bg-orange-600 hover:bg-orange-300 text-white hover:text-white rounded-xl shadow-lg border border-gray-200 transition-all duration-200 transform hover:scale-105"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="font-semibold">Volver a Indicios</span>
          </button>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Registrar Indicio</h1>
                <p className="text-blue-100 mt-1 flex items-center gap-2">
                  
                  Anexa un indicio a un expediente existente
                </p>
              </div>
            </div>
          </div>

          {/* Feedback accesible */}
          {feedback && (
            <div
              role="alert"
              aria-live="assertive"
              className={`mx-8 mt-6 p-4 rounded-xl border-l-4 ${
                feedback.type === "success"
                  ? "bg-green-50 border-green-500 text-green-800"
                  : "bg-red-50 border-red-500 text-red-800"
              }`}
            >
              <div className="flex items-center gap-3">
                {feedback.type === "success" ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                )}
                <p className="font-medium">{feedback.message}</p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-8" aria-busy={isLoading}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Columna izquierda */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                    Información del Indicio
                  </h3>

                  {/* Buscar/validar expediente */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                     Ingrese Código del Expediente *
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        name="expedienteCodigo"
                        value={indicio.expedienteCodigo}
                        onChange={handleChange}
                        placeholder="Ej: EXP-004"
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl shadow-sm uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={validarExpediente}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 flex items-center gap-2"
                      >
                        <MagnifyingGlassIcon className="h-5 w-5" />
                        Validar
                      </button>
                    </div>

                    {/* Ficha expediente */}
                    {expedienteValido && expedienteInfo && (
                      <div className="mt-4 bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Expediente válido</p>
                            <p className="text-base font-semibold text-gray-800">
                              {expedienteInfo.codigo}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full border ${
                              expedienteInfo.activo
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                            }`}
                          >
                            {expedienteInfo.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        {expedienteInfo.descripcion && (
                          <p className="mt-2 text-sm text-gray-600">{expedienteInfo.descripcion}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Código del Indicio */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Código del Indicio *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <TagIcon className="h-5 w-5 text-blue-500" />
                      </div>
                      <input
                        type="text"
                        name="codigo"
                        value={indicio.codigo}
                        onChange={handleChange}
                        placeholder="Ej: IND-001"
                        maxLength={30}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Usa MAYÚSCULAS, números y - _ . (3 a 30 caracteres)
                    </p>
                  </div>

                  {/* Descripción */}
                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Descripción *
                    </label>
                    <input
                      type="text"
                      name="descripcion"
                      value={indicio.descripcion}
                      onChange={handleChange}
                      required
                      placeholder="Ej: Cuchillo con mango negro"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Describe brevemente el indicio</p>
                  </div>
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  
                    Detalles y Registro
                  </h3>

                  {/* Color / Tamaño */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SwatchIcon className="h-5 w-5 text-rose-500" />
                        </div>
                        <input
                          type="text"
                          name="color"
                          value={indicio.color}
                          onChange={handleChange}
                          placeholder="Ej: Negro"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tamaño</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <BeakerIcon className="h-5 w-5 text-indigo-500" />
                        </div>
                        <input
                          type="text"
                          name="tamaño"
                          value={indicio.tamaño}
                          onChange={handleChange}
                          placeholder="Ej: 20 cm"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Peso */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Peso (kg)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ScaleIcon className="h-5 w-5 text-emerald-500" />
                      </div>
                      <input
                        type="text"
                        name="peso"
                        value={indicio.peso}
                        onChange={handleChange}
                        placeholder="Ej: 0.3"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">En kilogramos (usa punto decimal)</p>
                  </div>

                  {/* Técnico / Fecha */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Técnico</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-purple-500" />
                        </div>
                        <input
                          type="text"
                          value={indicio.tecnico}
                          readOnly
                          className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-600 shadow-sm"
                        />
                      </div>
                      
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Registro</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CalendarIcon className="h-5 w-5 text-blue-500" />
                        </div>
                        <input
                          type="text"
                          value={currentDate}
                          readOnly
                          className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-600 shadow-sm"
                        />
                      </div>
         
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de formulario */}
            <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <InformationCircleIcon className="h-4 w-4" />
                Los campos marcados con * son obligatorios
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleGoBack}
                  disabled={isLoading}
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-300 hover:text-white transition-all duration-200 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !expedienteValido}
                  className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentListIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                      Guardar Indicio
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default IndicioForm;
