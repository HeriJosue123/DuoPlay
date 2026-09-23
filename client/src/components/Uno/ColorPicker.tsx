import React from 'react';
import type { UnoColor } from '../../types';
import { X } from 'lucide-react';

interface ColorPickerProps {
  onSelect: (color: UnoColor) => void;
  onCancel: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ onSelect, onCancel }) => {
  return (
    <div className="p-6 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-4 bg-zinc-950/90 backdrop-blur-xl">
      <div className="flex justify-between w-full items-center px-2 mb-2">
        <span className="text-white text-sm font-black tracking-widest uppercase drop-shadow-md">Choose Color</span>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors bg-white/5 p-1 rounded-full">
          <X size={18} strokeWidth={3} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onSelect('red')}
          className="w-16 h-16 sm:w-24 sm:h-24 bg-[#ff1744] hover:bg-red-400 rounded-full shadow-[0_0_20px_#ff1744] border-4 border-white/20 transition-all hover:scale-110 active:scale-95"
        />
        <button 
          onClick={() => onSelect('blue')}
          className="w-16 h-16 sm:w-24 sm:h-24 bg-[#2979ff] hover:bg-blue-400 rounded-full shadow-[0_0_20px_#2979ff] border-4 border-white/20 transition-all hover:scale-110 active:scale-95"
        />
        <button 
          onClick={() => onSelect('green')}
          className="w-16 h-16 sm:w-24 sm:h-24 bg-[#00e676] hover:bg-green-400 rounded-full shadow-[0_0_20px_#00e676] border-4 border-white/20 transition-all hover:scale-110 active:scale-95"
        />
        <button 
          onClick={() => onSelect('yellow')}
          className="w-16 h-16 sm:w-24 sm:h-24 bg-[#ffea00] hover:bg-yellow-300 rounded-full shadow-[0_0_20px_#ffea00] border-4 border-white/20 transition-all hover:scale-110 active:scale-95"
        />
      </div>
    </div>
  );
};
