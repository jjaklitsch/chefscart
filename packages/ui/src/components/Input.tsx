import React from 'react';
import { colors, borderRadius } from '../tokens';

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  error?: string;
}

export function Input({ 
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  label,
  error
}: InputProps): JSX.Element {
  const baseStyles = `
    w-full px-3 py-2 border border-gray-300 
    focus:outline-none focus:ring-2 focus:ring-[${colors.accent.sky[500]}] focus:border-transparent
    disabled:bg-gray-50 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : ''}
  `;
  
  const styles = `${baseStyles} ${className}`.replace(/\s+/g, ' ').trim();
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={styles}
        style={{ borderRadius: borderRadius.button }}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}