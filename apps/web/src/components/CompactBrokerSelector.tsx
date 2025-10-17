'use client';

import { useState, useEffect, useRef } from 'react';

interface BrokerTemplate {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface CompactBrokerSelectorProps {
  onSelect: (brokerCode: string) => void;
  onCancel: () => void;
}

export function CompactBrokerSelector({ onSelect, onCancel }: CompactBrokerSelectorProps) {
  const [templates, setTemplates] = useState<BrokerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroker, setSelectedBroker] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.filter((t: BrokerTemplate) => t.isActive));
      }
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrokerSelect = (brokerCode: string) => {
    setSelectedBroker(brokerCode);
    setIsOpen(false);
    onSelect(brokerCode);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4">
          <div className="text-center">Загрузка брокеров...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-3">Выберите брокера</h3>
        
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {selectedBroker ? (
              templates.find(t => t.code === selectedBroker)?.name || selectedBroker
            ) : (
              'Выберите брокера...'
            )}
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {templates.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  Нет активных брокеров
                </div>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleBrokerSelect(template.code)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  >
                    <div className="font-medium">{template.name || template.code}</div>
                    <div className="text-sm text-gray-500">{template.code}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
