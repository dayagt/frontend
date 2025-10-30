// src/components/UsuarioForm.tsx
import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";
import { apiUrl } from "../config/env"; // ruta desde /src/components

import {
  ArrowLeftIcon,
  UserPlusIcon,
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import Swal from "sweetalert2";

type Feedback = { type: "success" | "error"; message: string } | null;



type Rol = "coordinador" | "tecnico" | "usuario";

const UsuarioForm = () => {
  const { token, username } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<{ nombre: string; email: string; rol: Rol; password: string }>({
    nombre: "",
    email: "",
    rol: "usuario",
    password: "",
  });

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isDirtyRef = useRef(false);

  const parseResponse = async (resp: Response) => {
    const text = await resp.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "nombre" ? value.replace(/\s{2,}/g, " ") : value.trimStart(),
    }));
    isDirtyRef.current = true;
    if (feedback) setFeedback(null);
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const validar = (): string | null => {
    const nombre = form.nombre.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!nombre || !email || !password) return "Por favor, completa todos los campos obligatorios";
    if (nombre.length < 2) return "El nombre debe tener al menos 2 caracteres";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Correo electrónico inválido";
    if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setFeedback(null);

    const error = validar();
    if (error) {
      setFeedback({ type: "error", message: error });
      return;
    }

    if (!token) {
      setFeedback({ type: "error", message: "Sesión expirada. Inicia sesión nuevamente." });
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        rol: form.rol,
        password: form.password,
      };

      const resp = await fetch(apiUrl(`/usuarios`), {
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
        if (resp.status === 409) throw new Error("El email ya existe");
        if (resp.status === 400) throw new Error((data as any)?.message || "Datos inválidos");
        if (resp.status === 401) throw new Error("Sesión expirada. Inicia sesión.");
        throw new Error((data as any)?.message || "Error al crear el usuario");
      }

      await Swal.fire({
        title: "¡Usuario creado!",
        text: `El usuario ${payload.nombre} fue registrado correctamente.`,
        icon: "success",
        confirmButtonText: "Continuar",
        confirmButtonColor: "#10b981",
        timer: 2200,
        timerProgressBar: true,
      });

      isDirtyRef.current = false;
      setForm({ nombre: "", email: "", rol: "usuario", password: "" });
      navigate("/usuarios"); // vuelve al listado
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
    if (isDirtyRef.current && (form.nombre || form.email || form.password)) {
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
      if (result.isConfirmed) {
        isDirtyRef.current = false;
        navigate("/usuarios");
      }
    } else {
      navigate("/usuarios");
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
            <span className="font-semibold">Volver a Usuarios</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <UserPlusIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Nuevo Usuario</h1>
                <p className="text-blue-100 mt-1 flex items-center gap-2">
                  Crea un nuevo usuario del sistema
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
                    Información del Usuario
                  </h3>

                  {/* Nombre */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-purple-500" />
                      </div>
                      <input
                        type="text"
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="Nombre completo"
                        autoFocus
                        aria-invalid={feedback?.type === "error" && !form.nombre.trim() ? true : undefined}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        maxLength={160}
                        placeholder="correo@dominio.com"
                        aria-invalid={feedback?.type === "error" && !form.email.trim() ? true : undefined}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyIcon className="h-5 w-5 text-amber-500" />
                      </div>
                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                        maxLength={200}
                        placeholder="Mínimo 6 caracteres"
                        aria-invalid={feedback?.type === "error" && !form.password ? true : undefined}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* Rol */}
                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rol *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ShieldCheckIcon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <select
                        name="rol"
                        value={form.rol}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      >
                        <option value="usuario">Usuario</option>
                        <option value="tecnico">Técnico</option>
                        <option value="coordinador">Coordinador</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">El rol define los permisos dentro del sistema</p>
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

                  {/* Fecha */}
                  <div className="mb-6">
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
                    <p className="text-xs text-gray-500 mt-1">Se asigna automáticamente la fecha actual</p>
                  </div>

                  {/* Estado */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Estado Inicial</label>
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
                    <p className="text-xs text-gray-500 mt-1">El usuario se crea activo por defecto</p>
                  </div>

                  {/* Creador */}
                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Creado por</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-purple-500" />
                      </div>
                      <input
                        type="text"
                        value={username || "Usuario actual"}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-600 shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Tu usuario quedará registrado como creador</p>
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
                  disabled={
                    isLoading ||
                    !form.nombre.trim() ||
                    !form.email.trim() ||
                    !form.password
                  }
                  className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                      Guardar Usuario
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

export default UsuarioForm;
