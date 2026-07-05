import React from 'react';
import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  colorClass?: string;
}

export function Loader({ className, colorClass = "border-primary" }: LoaderProps) {
  return (
    <div className={cn("relative w-[80px] h-[80px]", className)}>
      <div 
        className={cn("absolute w-[75px] h-[75px] rounded-full border-[6px]", colorClass)} 
        style={{ animation: 'custom-load-1 1s linear infinite', borderLeftColor: 'transparent' }} 
      />
      <div 
        className={cn("absolute w-[55px] h-[55px] rounded-full border-[6px] m-[10px]", colorClass)} 
        style={{ animation: 'custom-load-2 1.5s linear infinite', borderTopColor: 'transparent', borderRightColor: 'transparent' }} 
      />
    </div>
  );
}
