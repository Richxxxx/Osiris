import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaUserTie, FaUserShield, FaTimes } from 'react-icons/fa';
import { obtenerDepartamentos, obtenerCargosPorDepartamento } from '../../services/departamentoService';
import EliminarUsuarioModal from '../../components/users/EliminarUsuarioModal';

const EditUserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    departamentoId: '',
    cargoId: '',
    rol: 'empleado',
    estado: 'Activo'
  });
  const [errors, setErrors] = useState({});
  const [departamentos, setDepartamentos] = useState([]);
  const [cargosDisponibles, setCargosDisponibles] = useState([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [loadingCargos, setLoadingCargos] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Inicializar el formulario con los datos del usuario
  useEffect(() => {
    const cargarDepartamentos = async () => {
      setLoadingDepartamentos(true);
      try {
        const data = await obtenerDepartamentos();
        setDepartamentos(data);
      } catch (error) {
        console.error('Error al cargar departamentos:', error);
        setDepartamentos([]);
      } finally {
        setLoadingDepartamentos(false);
      }
    };

    cargarDepartamentos();
  }, []);

  useEffect(() => {
    if (!user) return;

    const [nombre, ...apellidos] = (user.nombre || '').split(' ');

    setFormData(prev => ({
      ...prev,
      nombre: nombre || '',
      apellido: apellidos.join(' ') || '',
      email: user.email || '',
      telefono: user.telefono || '',
      rol: user.rol ? user.rol.toLowerCase() : 'empleado',
      estado: user.estado || 'Activo'
    }));
  }, [user]);

  const sincronizarDepartamentoYCargos = async (departamentoId, cargoInicialId) => {
    const idString = departamentoId ? String(departamentoId) : '';
    setFormData(prev => ({
      ...prev,
      departamentoId: idString,
      cargoId: cargoInicialId ? String(cargoInicialId) : ''
    }));

    if (departamentoId) {
      await cargarCargos(departamentoId, cargoInicialId);
    } else {
      setCargosDisponibles([]);
    }
  };

  useEffect(() => {
    if (!user || departamentos.length === 0) return;

    const departamentoId = user.departamento_id || departamentos.find(dep => dep.nombre === user.departamento)?.id;
    const cargoId = user.cargo_id;

    sincronizarDepartamentoYCargos(departamentoId, cargoId);
  }, [user, departamentos]);

  const cargarCargos = async (departamentoId, cargoInicialId) => {
    if (!departamentoId) {
      setCargosDisponibles([]);
      return;
    }

    setLoadingCargos(true);
    try {
      const cargos = await obtenerCargosPorDepartamento(departamentoId);
      setCargosDisponibles(cargos);
      if (cargoInicialId) {
        setFormData(prev => ({
          ...prev,
          cargoId: cargos.some(c => c.id === cargoInicialId) ? String(cargoInicialId) : ''
        }));
      }
    } catch (error) {
      console.error('Error al cargar cargos:', error);
      setCargosDisponibles([]);
    } finally {
      setLoadingCargos(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'departamentoId') {
      sincronizarDepartamentoYCargos(value, null);
      return;
    }

    if (name === 'cargoId') {
      setFormData(prev => ({
        ...prev,
        cargoId: value
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validación básica
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.email.trim()) newErrors.email = 'El correo es requerido';
    if (!formData.telefono.trim()) newErrors.telefono = 'El teléfono es requerido';
    if (!formData.departamentoId) newErrors.departamentoId = 'El departamento es requerido';
    if (!formData.cargoId) newErrors.cargoId = 'El cargo es requerido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Preparar los datos del usuario para guardar
    const departamentoSeleccionado = departamentos.find(dep => String(dep.id) === formData.departamentoId);
    const cargoSeleccionado = cargosDisponibles.find(cargo => String(cargo.id) === formData.cargoId);

    const userData = {
      nombre: `${formData.nombre} ${formData.apellido}`.trim(),
      email: formData.email,
      telefono: formData.telefono,
      departamento_id: departamentoSeleccionado?.id || null,
      departamento: departamentoSeleccionado?.nombre || '',
      cargo_id: cargoSeleccionado?.id || null,
      cargo: cargoSeleccionado?.nombre || '',
      rol: formData.rol.charAt(0).toUpperCase() + formData.rol.slice(1),
      estado: formData.estado
    };

    onSave(userData);
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            Editar Usuario: {user.nombre}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Nombre */}
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                <FaUser className="inline-block mr-1 text-blue-600" />
                Nombre(s)
              </label>
              <input
                type="text"
                name="nombre"
                id="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={`mt-1 block w-full border ${errors.nombre ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              />
              {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
            </div>

            {/* Apellido */}
            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">
                <FaUser className="inline-block mr-1 text-blue-600" />
                Apellido(s)
              </label>
              <input
                type="text"
                name="apellido"
                id="apellido"
                value={formData.apellido || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                <FaEnvelope className="inline-block mr-1 text-blue-600" />
                Correo Electrónico
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 block w-full border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
                <FaPhone className="inline-block mr-1 text-blue-600" />
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                id="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className={`mt-1 block w-full border ${errors.telefono ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              />
              {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>}
            </div>

            {/* Departamento */}
            <div>
              <label htmlFor="departamento" className="block text-sm font-medium text-gray-700">
                <FaBuilding className="inline-block mr-1 text-blue-600" />
                Departamento
              </label>
              <select
                name="departamentoId"
                id="departamento"
                value={formData.departamentoId}
                onChange={handleChange}
                className={`mt-1 block w-full border ${errors.departamentoId ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                disabled={loadingDepartamentos}
              >
                <option value="">{loadingDepartamentos ? 'Cargando departamentos...' : 'Seleccione un departamento'}</option>
                {departamentos.map(departamento => (
                  <option key={departamento.id} value={departamento.id}>
                    {departamento.nombre}
                  </option>
                ))}
              </select>
              {errors.departamentoId && <p className="mt-1 text-sm text-red-600">{errors.departamentoId}</p>}
            </div>

            {/* Cargo */}
            <div>
              <label htmlFor="cargo" className="block text-sm font-medium text-gray-700">
                <FaUserTie className="inline-block mr-1 text-blue-600" />
                Cargo
              </label>
              <select
                name="cargoId"
                id="cargo"
                value={formData.cargoId}
                onChange={handleChange}
                className={`mt-1 block w-full border ${errors.cargoId ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                disabled={!formData.departamentoId || loadingCargos}
              >
                <option value="">
                  {!formData.departamentoId
                    ? 'Seleccione un departamento primero'
                    : loadingCargos
                      ? 'Cargando cargos...'
                      : 'Seleccione un cargo'}
                </option>
                {cargosDisponibles.map(cargo => (
                  <option key={cargo.id} value={cargo.id}>
                    {cargo.nombre}
                  </option>
                ))}
              </select>
              {errors.cargoId && <p className="mt-1 text-sm text-red-600">{errors.cargoId}</p>}
            </div>

            {/* Rol */}
            <div>
              <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
                <FaUserShield className="inline-block mr-1 text-blue-600" />
                Rol
              </label>
              <select
                name="rol"
                id="rol"
                value={formData.rol}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="empleado">Empleado</option>
                <option value="evaluador">Evaluador</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>

            {/* Estado */}
            {/* <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                name="estado"
                id="estado"
                value={formData.estado}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div> */}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex justify-center py-2 px-4 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Eliminar Usuario
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
        
        <EliminarUsuarioModal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          user={user}
          onUserUpdated={onSave}
        />
      </div>
    </div>
  );
};

export default EditUserModal;
