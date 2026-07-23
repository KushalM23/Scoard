import React from 'react';
import { twMerge } from 'tailwind-merge';

interface BballProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  background?: string;
  opacity?: number;
  rotation?: number;
  shadow?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  padding?: number;
  className?: string;
}

const SportsBasketballIcon: React.FC<BballProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 0,
  background = 'transparent',
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
  className
}) => {
  const transforms = [];
  if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
  if (flipHorizontal) transforms.push('scaleX(-1)');
  if (flipVertical) transforms.push('scaleY(-1)');

  const viewBoxSize = 24 + (padding * 2);
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke={color === 'text' ? 'currentColor' : color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('', className)}
      style={{
        opacity,
        transform: transforms.join(' ') || undefined,
        filter: shadow > 0 ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))` : undefined,
        backgroundColor: background !== 'transparent' ? background : undefined
      }}
    >
      <path fill="currentColor" d="M2.05 10.975q.125-1.275.525-2.412t1.1-2.138q.875.9 1.463 2.088t.762 2.462zm16.05 0q.175-1.275.75-2.45t1.475-2.075q.7.975 1.1 2.125t.525 2.4zM3.675 17.55q-.7-.975-1.1-2.113t-.525-2.412H5.9q-.175 1.275-.763 2.45T3.676 17.55m16.65 0q-.9-.9-1.475-2.075t-.75-2.45h3.85q-.125 1.25-.525 2.4t-1.1 2.125m-12.4-6.575q-.2-1.8-.975-3.325T4.925 4.9q1.2-1.2 2.738-1.925t3.312-.925v8.925zm5.1 0V2.05q1.775.2 3.313.925T19.075 4.9Q17.8 6.1 17.038 7.638t-.963 3.337zm-2.05 10.975q-1.8-.2-3.325-.937t-2.725-1.938q1.275-1.2 2.038-2.725t.962-3.325h3.05zm2.05 0v-8.925h3.05q.2 1.8.963 3.338t2.037 2.737q-1.2 1.2-2.738 1.925t-3.312.925"/>
    </svg>
  );
};

export default SportsBasketballIcon;