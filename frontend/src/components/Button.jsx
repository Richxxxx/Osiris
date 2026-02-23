import React from 'react';

const Button = ({
  children,
  type = 'button',
  className = '',
  variant = 'primary',
  isLoading = false,
  ...rest
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500';
      case 'primary':
      default:
        return 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  return (
    <button
      type={type}
      className={`inline-flex justify-center items-center py-1 px-3 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${getVariantClasses()} ${className} ${
        isLoading ? 'opacity-70 cursor-not-allowed' : ''
      }`}
      disabled={isLoading}
      {...rest}
    >
      {isLoading ? 'Cargando...' : children}
    </button>
  );
};

export default Button;
