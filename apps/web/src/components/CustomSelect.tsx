'use client';

import { useState, useRef, useEffect } from 'react';

type Option = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function CustomSelect({ value, options, onChange, placeholder = 'Выбрать', className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left outline-none focus:ring-2 focus:ring-yellow-300 flex items-center justify-between text-[14px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'} style={{ whiteSpace: 'nowrap' }}>{displayText}</span>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 20 20"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m6 8 4 4 4-4" />
        </svg>
      </button>

      {isOpen && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto text-[14px]">
          {options.map((option) => (
            <li
              key={option.value}
              className={`px-3 py-2 cursor-pointer hover:bg-yellow-50 transition-colors whitespace-nowrap ${
                option.value === value ? 'bg-yellow-100 text-gray-900 font-medium' : 'text-gray-700'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

