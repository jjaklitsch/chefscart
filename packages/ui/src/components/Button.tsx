import React from 'react';
import { colors, borderRadius } from '../tokens';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  onClick, 
  disabled = false,
  type = 'button',
  className = ''
}: ButtonProps): JSX.Element {
  const baseStyles = `
    inline-flex items-center justify-center font-semibold 
    transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:pointer-events-none
  `;
  
  const variants = {
    primary: `bg-[${colors.primary.orange[600]}] text-white hover:bg-opacity-90 focus:ring-[${colors.primary.orange[600]}]`,
    secondary: `bg-[${colors.neutral[100]}] text-[${colors.neutral[900]}] hover:bg-opacity-80`,
    outline: `border-2 border-[${colors.primary.orange[600]}] text-[${colors.primary.orange[600]}] hover:bg-[${colors.primary.orange[50]}]`
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base', 
    lg: 'px-6 py-3 text-lg'
  };
  
  const styles = `
    ${baseStyles}
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `.replace(/\s+/g, ' ').trim();
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={styles}
      style={{ borderRadius: borderRadius.button }}
    >
      {children}
    </button>
  );
}