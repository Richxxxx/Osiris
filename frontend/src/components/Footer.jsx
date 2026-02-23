import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Logo y descripción centrados */}
            <div className="text-center md:col-span-1">
              <div className="flex justify-center mb-4">
                <img 
                  src="/LOGO.png" 
                  alt="Logo de la empresa" 
                  className="h-20 w-auto"
                />
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Sistema de evaluaciones de desempeño integral para la gestión del talento humano.
              </p>
            </div>
            
            {/* Contacto centrado */}
            <div className="text-center md:col-span-1">
              <h3 className="text-lg font-semibold mb-4 text-white">Contacto</h3>
              <div className="space-y-3 text-gray-300 text-sm">
                <p className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                  desarrollo@solucionescorp.com.co
                </p>
                <p className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  Funza, Cundinamarca
                </p>
              </div>
            </div>
          </div>
          
          {/* Línea divisora */}
          <div className="border-t border-gray-700 mt-12 mb-6"></div>
          
          {/* Copyright centrado */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} Sistema de Evaluaciones. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
