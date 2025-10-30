import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";
import { apiUrl } from "../config/env"; // ruta desde /src/components

import {
  ArrowLeftIcon,
  DocumentPlusIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import Swal from "sweetalert2";

type Feedback = { type: "success" | "error"; message: string } | null;



const ExpedienteForm = () => {
  const { token, username } = useAuth();
  const navigate = useNavigate();

  const [expediente, setExpediente] = useState({ codigo: "", descripcion: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isDirtyRef = useRef(false);

  const parseResponse = async (resp: Response) => {
    const text = await resp.text();
    try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setExpediente((prev) => {
      let v = value;
      if (name === "codigo") v = v.toUpperCase().trimStart();
      if (name === "descripcion") v = v.replace(/\s{2,}/g, " ");
      return { ...prev, [name]: v };
    });
    isDirtyRef.current = true;
    if (feedback) setFeedback(null);
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setFeedback(null);

    const codigo = expediente.codigo.trim().toUpperCase();
    const descripcion = expediente.descripcion.trim();

    if (!codigo || !descripcion) {
      setFeedback({ type: "error", message: "Por favor, completa todos los campos obligatorios" });
      return;
    }
    if (!/^[A-Z0-9\-_.]{4,30}$/.test(codigo)) {
      setFeedback({ type: "error", message: "Código inválido. Usa letras mayúsculas, números y - _ . (4 a 30 caracteres)." });
      return;
    }
    if (!token) {
      setFeedback({ type: "error", message: "Sesión expirada. Inicia sesión nuevamente." });
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const payload = { codigo, descripcion }; // tecnico_id lo toma el backend del token

const resp = await fetch(apiUrl("/expedientes"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(resp);

      if (!resp.ok) {
        if (resp.status === 409) throw new Error("El código ya existe");
        if (resp.status === 400) throw new Error(data?.message || "Datos inválidos");
        if (resp.status === 401) throw new Error("Sesión expirada. Inicia sesión.");
        throw new Error(data?.message || "Error al crear el expediente");
      }

      await Swal.fire({
        title: "¡Expediente Registrado!",
        text: `El expediente ${codigo} se ha creado exitosamente.`,
        icon: "success",
        confirmButtonText: "Continuar",
        confirmButtonColor: "#10b981",
        timer: 2200,
        timerProgressBar: true,
      });

      isDirtyRef.current = false;
      setExpediente({ codigo: "", descripcion: "" });
      navigate("/expediente"); // ⇦ vuelve a la lista
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Error desconocido" });
      await Swal.fire({
        title: "Error al Registrar",
        text: err?.message || "Error desconocido",
        icon: "error",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = async () => {
    if (isDirtyRef.current && (expediente.codigo || expediente.descripcion)) {
      const result = await Swal.fire({
        title: "¿Salir sin guardar?",
        text: "Tienes cambios sin guardar. ¿Estás seguro? ",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, salir",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        reverseButtons: true,
      });
      if (result.isConfirmed) {
        isDirtyRef.current = false;
        navigate("/expediente");
      }
    } else {
      navigate("/expediente");
    }
  };

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const currentDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const descripcionMax = 500;
  const descLen = expediente.descripcion.length;
  const warnDesc = descLen > 0.9 * descripcionMax;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header navegación */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
className="group inline-flex items-center gap-3 px-6 py-3 bg-orange-500 hover:bg-orange-300 text-white hover:text-white rounded-xl shadow-lg hover:shadow-xl border border-gray-200 transition-all duration-200 transform hover:scale-105"
          >
            <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-semibold">Volver a Expedientes</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <DocumentPlusIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Nuevo Expediente</h1>
                <p className="text-blue-100 mt-1 flex items-center gap-2">
               
                  Crea un nuevo registro en el sistema
                </p>
              </div>
            </div>
          </div>

          {/* Feedback */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8" aria-busy={isLoading}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Izquierda */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                    Información del Expediente
                  </h3>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Código del Expediente *
                    </label>
                    <input
                      type="text"
                      name="codigo"
                      value={expediente.codigo}
                      onChange={handleChange}
                      required
                      placeholder="Ej: EXP-2025-001"
                      maxLength={30}
                      pattern="[A-Z0-9\-_.]{4,30}"
                      title="Usa letras mayúsculas, números y - _ . (4 a 30 caracteres)"
                      autoFocus
                      aria-invalid={feedback?.type === "error" && !expediente.codigo.trim() ? true : undefined}
                      aria-describedby="codigo-help"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md uppercase"
                    />
                    <p id="codigo-help" className="text-xs text-gray-500 mt-1">
                      Ingresa un código único (se transformará a MAYÚSCULAS)
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Descripción *
                    </label>
                    <textarea
                      name="descripcion"
                      value={expediente.descripcion}
                      onChange={handleChange}
                      required
                      rows={4}
                      placeholder="Describe detalladamente el contenido y propósito del expediente..."
                      maxLength={descripcionMax}
                      aria-invalid={feedback?.type === "error" && !expediente.descripcion.trim() ? true : undefined}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md resize-none"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500">Proporciona información clara y precisa</p>
                      <span className={`text-xs ${warnDesc ? "text-amber-600" : "text-gray-400"}`}>
                        {descLen}/{descripcionMax}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Derecha */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-blue-600" />
                    Información Automática
                  </h3>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha de Registro
                    </label>
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
                    <p className="text-xs text-gray-500 mt-1">Se asigna automáticamente la fecha actual</p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estado Inicial
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ClockIcon className="h-5 w-5 text-yellow-500" />
                      </div>
                      <input
                        type="text"
                        value="Pendiente"
                        readOnly
                        className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-600 shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Todos los expedientes inician como pendientes</p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estado de Actividad
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      </div>
                      <input
                        type="text"
                        value="Activo"
                        readOnly
                        className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-600 shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">El expediente estará disponible para su gestión</p>
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Técnico Responsable
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-purple-500" />
                      </div>
                      <input
                        type="text"
                        value={username || "Usuario Actual"}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-600 shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Tu usuario será asignado automáticamente</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
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
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-300 hover:text-gray-900 transition-all duration-200 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !expediente.codigo.trim() || !expediente.descripcion.trim()}
                  className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <DocumentPlusIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                      Guardar Expediente
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

export default ExpedienteForm;
