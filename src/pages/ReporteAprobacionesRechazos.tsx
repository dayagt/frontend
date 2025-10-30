// src/pages/ReporteAprobacionesRechazos.tsx
import { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";


type Estado = "Aprobado" | "Rechazado" | "Pendiente";

interface Expediente {
  codigo: string;
  solicitante: string;
  fecha: string;   // YYYY-MM-DD
  estado: Estado;
}

const ReporteAprobacionesRechazos = () => {
  // Filtros
  const [q, setQ] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estado, setEstado] = useState<"" | Estado>("");

  // Datos
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);

  // Simulación de datos (sustituye por fetch si quieres)
  useEffect(() => {
    const data: Expediente[] = [
      { codigo: "EXP001", solicitante: "Juan Pérez",  fecha: "2025-08-01", estado: "Aprobado" },
      { codigo: "EXP002", solicitante: "María López", fecha: "2025-08-02", estado: "Rechazado" },
      { codigo: "EXP003", solicitante: "Carlos Ruiz", fecha: "2025-08-03", estado: "Pendiente" },
      { codigo: "EXP004", solicitante: "Ana Torres",  fecha: "2025-08-03", estado: "Aprobado" },
      { codigo: "EXP005", solicitante: "Luis Díaz",   fecha: "2025-08-04", estado: "Rechazado" },
      { codigo: "EXP006", solicitante: "Diego Ríos",  fecha: "2025-08-05", estado: "Pendiente" },
    ];
    setExpedientes(data);
  }, []);

  // Helpers filtros
  const inRange = (date: string, from: string, to: string) => {
    if (!from && !to) return true;
    const d = date;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const filtered = useMemo(() => {
    return expedientes.filter((e) => {
      const matchQ =
        !q ||
        e.codigo.toLowerCase().includes(q.toLowerCase()) ||
        e.solicitante.toLowerCase().includes(q.toLowerCase());

      const matchEstado = !estado || e.estado === estado;
      const matchFecha = inRange(e.fecha, desde, hasta);

      return matchQ && matchEstado && matchFecha;
    });
  }, [expedientes, q, estado, desde, hasta]);

  // Resumen
  const totales = useMemo(() => {
    const base = { Aprobado: 0, Rechazado: 0, Pendiente: 0, Total: 0 };
    filtered.forEach((e) => {
      base[e.estado]++;
      base.Total++;
    });
    return base;
  }, [filtered]);

  // Chip de estado
  const EstadoChip = ({ value }: { value: Estado }) => {
    const map = {
      Aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Rechazado: "bg-rose-50 text-rose-700 border-rose-200",
      Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    } as const;
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full border ${map[value]}`}>
        {value}
      </span>
    );
  };

  // PDF (jsPDF)
  const handleGenerateReport = async () => {
    if (filtered.length === 0) {
      await Swal.fire({
        title: "Sin resultados",
        text: "Ajusta los filtros para generar el reporte.",
        icon: "info",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Generar PDF",
      text: "¿Deseas generar el reporte con los resultados filtrados?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, generar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2563eb",
    });

    if (!confirm.isConfirmed) return;

    const doc = new jsPDF({ unit: "pt" }); // pt para medidas más cómodas
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;
    let y = 50;

    // Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DICRI - Reporte de Aprobaciones y Rechazos", pageWidth / 2, y, { align: "center" });
    y += 24;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const filtrosL1 = `Fecha de generación: ${new Date().toLocaleDateString()}`;
    const filtrosL2 = `Filtros — Búsqueda: ${q || "Todos"} | Estado: ${estado || "Todos"} | Desde: ${desde || "—"} | Hasta: ${hasta || "—"}`;
    doc.text(filtrosL1, marginX, y);
    y += 16;
    doc.text(filtrosL2, marginX, y);
    y += 24;

    // Resumen
    doc.setFont("helvetica", "bold");
    doc.text("Resumen:", marginX, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.text(`Aprobados: ${totales.Aprobado}   |   Rechazados: ${totales.Rechazado}   |   Pendientes: ${totales.Pendiente}   |   Total: ${totales.Total}`, marginX, y);
    y += 24;

    // Tabla
    const headers = ["#", "Código", "Solicitante", "Fecha", "Estado"];
    const colWidths = [30, 100, 210, 90, 90]; // suma ≈ 520 → cabe en A4 horizontalmente con márgenes
    const tableStartX = marginX;

    // Encabezados
    doc.setFont("helvetica", "bold");
    let x = tableStartX;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += 8;
    doc.setLineWidth(0.5);
    doc.line(tableStartX, y, tableStartX + colWidths.reduce((a, b) => a + b, 0), y);
    y += 14;

    doc.setFont("helvetica", "normal");

    const lineHeight = 16;
    const maxY = doc.internal.pageSize.getHeight() - 50;

    filtered.forEach((row, idx) => {
      // salto de página
      if (y + lineHeight > maxY) {
        doc.addPage();
        y = 50;

        // reimprimir headers
        doc.setFont("helvetica", "bold");
        x = tableStartX;
        headers.forEach((h, i) => {
          doc.text(h, x, y);
          x += colWidths[i];
        });
        y += 8;
        doc.line(tableStartX, y, tableStartX + colWidths.reduce((a, b) => a + b, 0), y);
        y += 14;
        doc.setFont("helvetica", "normal");
      }

      x = tableStartX;
      doc.text(String(idx + 1), x, y);
      x += colWidths[0];

      doc.text(row.codigo, x, y);
      x += colWidths[1];

      // solicitante: recorte simple si es muy largo
      const solicitante = row.solicitante.length > 28 ? row.solicitante.slice(0, 27) + "…" : row.solicitante;
      doc.text(solicitante, x, y);
      x += colWidths[2];

      doc.text(row.fecha, x, y);
      x += colWidths[3];

      doc.text(row.estado, x, y);

      y += lineHeight;
    });

    doc.save("reporte-aprobaciones-rechazos.pdf");

    await Swal.fire({
      title: "PDF generado",
      text: "Tu reporte se descargó correctamente.",
      icon: "success",
      confirmButtonText: "Listo",
      confirmButtonColor: "#10b981",
      timer: 1800,
      timerProgressBar: true,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-white">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <AdjustmentsHorizontalIcon className="h-8 w-8" />
              Reporte de Aprobaciones y Rechazos
            </h1>
            <p className="text-blue-100 mt-2">Filtra, visualiza y exporta a PDF.</p>
          </div>

          {/* Filtros */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Búsqueda</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Código o solicitante…"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as Estado | "")}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Rechazado">Rechazado</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>

              <div className="md:col-span-3 flex items-end justify-end">
                <button
                  onClick={handleGenerateReport}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Generar Reporte PDF
                </button>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="px-6 pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm text-emerald-700">Aprobados</p>
              <p className="text-2xl font-bold text-emerald-900">{totales.Aprobado}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <p className="text-sm text-rose-700">Rechazados</p>
              <p className="text-2xl font-bold text-rose-900">{totales.Rechazado}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-700">Pendientes</p>
              <p className="text-2xl font-bold text-amber-900">{totales.Pendiente}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-700">Total</p>
              <p className="text-2xl font-bold text-slate-900">{totales.Total}</p>
            </div>
          </div>

          {/* Tabla */}
          <div className="p-6">
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Solicitante</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No se encontraron resultados
                      </td>
                    </tr>
                  ) : (
                    filtered.map((exp, i) => (
                      <tr
                        key={`${exp.codigo}-${i}`}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}
                      >
                        <td className="px-4 py-3">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{exp.codigo}</td>
                        <td className="px-4 py-3">{exp.solicitante}</td>
                        <td className="px-4 py-3">{exp.fecha}</td>
                        <td className="px-4 py-3">
                          <EstadoChip value={exp.estado} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie */}
            <div className="flex justify-end py-4 text-sm text-gray-500">
              Mostrando <span className="font-semibold mx-1">{filtered.length}</span> de{" "}
              <span className="font-semibold mx-1">{expedientes.length}</span> registros
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteAprobacionesRechazos;
