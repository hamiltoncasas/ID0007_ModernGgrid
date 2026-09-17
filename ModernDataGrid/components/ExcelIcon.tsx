import * as React from 'react';

export interface ExcelIconProps {
    className?: string;
}

/**
 * Icono SVG de Excel. Se dibuja en línea para no depender de la fuente de
 * PrimeIcons y garantizar que el botón de exportar siempre muestre su icono.
 */
export const ExcelIcon: React.FC<ExcelIconProps> = ({ className }) => (
    <svg
        className={className}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        role="img"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M14 2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5V8z" fill="#1D6F42" />
        <path d="M14 2v6h6z" fill="#0F4B2C" />
        <path
            d="M8.4 10.6h2.05l1.55 2.4 1.55-2.4h2.05l-2.55 3.85 2.65 3.95h-2.1l-1.6-2.5-1.6 2.5H8.3l2.65-3.95z"
            fill="#FFFFFF"
        />
    </svg>
);

export default ExcelIcon;
