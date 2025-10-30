// src/pages/Home.tsx
const Home = () => (
  <div className="py-10">
    <div className="max-w-3xl mx-auto text-center px-4">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        Bienvenido al Sistema Gestiones
      </h2>
      <p className="text-gray-600">
        Tarea de Desarrollo web Utilizando React, TypeScript y Tailwind CSS
      </p>
<img
  src={`${import.meta.env.BASE_URL}Imagen/LogotipoUMG.png`}
  alt="Panel principal del Sistema Gestiones"
  className="mx-auto mt-8 w-full max-w-[150px] rounded-xl shadow-lg object-cover"
  loading="lazy"
/>



    </div>
  </div>
);

export default Home;
