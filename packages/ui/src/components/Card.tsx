import React from 'react';
import { borderRadius, shadows, colors } from '../tokens';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps): JSX.Element {
  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const styles = `
    bg-white
    ${paddingStyles[padding]}
    ${className}
  `.replace(/\s+/g, ' ').trim();
  
  return (
    <div
      className={styles}
      style={{ 
        borderRadius: borderRadius.card,
        boxShadow: shadows[1],
        backgroundColor: colors.neutral[100]
      }}
    >
      {children}
    </div>
  );
}