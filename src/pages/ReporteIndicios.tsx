import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

interface Indicio {
    codigo: string;
    descripcion: string;
    expediente: string;
    fecha: string;
    estado: string;
}

const ReporteIndicios = () => {
    const [ fecha, setFecha ] = useState('');
    const [ estado, setEstado ] = useState('');
    const [ indicios, setIndicios ] = useState<Indicio[]>([]);

    const estados = [ 'Pendiente', 'Analizado', 'Archivado' ];

    useEffect(() => {
        const data: Indicio[] = [
            { codigo: 'IND001', descripcion: 'Huella dactilar', expediente: 'EXP001', fecha: '2025-08-01', estado: 'Pendiente' },
            { codigo: 'IND002', descripcion: 'Muestra de ADN', expediente: 'EXP002', fecha: '2025-08-02', estado: 'Analizado' },
            { codigo: 'IND003', descripcion: 'Fotografía', expediente: 'EXP003', fecha: '2025-08-03', estado: 'Archivado' },
        ];
        setIndicios(data);
    }, []);

    const filteredIndicios = indicios.filter((ind) => {
        return (
            (!fecha || ind.fecha === fecha) &&
            (!estado || ind.estado === estado)
        );
    });

    const handleGenerateReport = () => {
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('DICRI - Reporte de Indicios', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 10, 30);
        doc.text(`Filtros: Fecha = ${fecha || 'Todos'}, Estado = ${estado || 'Todos'}`, 10, 40);

        doc.text('Listado de Indicios:', 10, 50);

        // Encabezados de la tabla
        let y = 60;
        const startX = 10;
        const colWidths = [ 10, 35, 50, 35, 35, 35 ]; // Ajusta según el contenido
        const headers = [ '#', 'Código', 'Descripción', 'Expediente', 'Fecha', 'Estado' ];

        // Dibujar encabezados
        let x = startX;
        headers.forEach((header, i) => {
            doc.text(header, x + 2, y);
            x += colWidths[ i ];
        });

        // Línea debajo de encabezados
        doc.line(startX, y + 2, x, y + 2);

        // Filas de datos
        y += 8;
        filteredIndicios.forEach((ind, index) => {
            x = startX;
            doc.text(String(index + 1), x + 2, y);
            x += colWidths[ 0 ];
            doc.text(ind.codigo, x + 2, y);
            x += colWidths[ 1 ];
            doc.text(ind.descripcion, x + 2, y);
            x += colWidths[ 2 ];
            doc.text(ind.expediente, x + 2, y);
            x += colWidths[ 3 ];
            doc.text(ind.fecha, x + 2, y);
            x += colWidths[ 4 ];
            doc.text(ind.estado, x + 2, y);
            y += 8;
        });

        if (filteredIndicios.length === 0) {
            doc.text('No se encontraron resultados.', 10, y);
        }

        doc.save('reporte-indicios.pdf');
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center text-blue-800">Generar Reporte de Indicios</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium mb-2" htmlFor="fecha">Fecha</label>
                    <input
                        id="fecha"
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2" htmlFor="estado">Estado</label>
                    <select
                        id="estado"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="">Todos</option>
                        {estados.map((estado) => (
                            <option key={estado} value={estado}>
                                {estado}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse border border-gray-300 text-sm text-left">
                    <thead className="bg-gray-200 text-gray-700">
                        <tr>
                            <th className="border border-gray-300 px-4 py-2">#</th>
                            <th className="border border-gray-300 px-4 py-2">Código</th>
                            <th className="border border-gray-300 px-4 py-2">Descripción</th>
                            <th className="border border-gray-300 px-4 py-2">Expediente</th>
                            <th className="border border-gray-300 px-4 py-2">Fecha</th>
                            <th className="border border-gray-300 px-4 py-2">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredIndicios.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-4 text-gray-600">No se encontraron resultados</td>
                            </tr>
                        ) : (
                            filteredIndicios.map((ind, index) => (
                                <tr
                                    key={ind.codigo}
                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}
                                >
                                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                                    <td className="border border-gray-300 px-4 py-2">{ind.codigo}</td>
                                    <td className="border border-gray-300 px-4 py-2">{ind.descripcion}</td>
                                    <td className="border border-gray-300 px-4 py-2">{ind.expediente}</td>
                                    <td className="border border-gray-300 px-4 py-2">{ind.fecha}</td>
                                    <td className="border border-gray-300 px-4 py-2">{ind.estado}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <button
                onClick={handleGenerateReport}
                className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition-all"
            >
                Generar Reporte PDF
            </button>
        </div>
    );
};

export default ReporteIndicios;
