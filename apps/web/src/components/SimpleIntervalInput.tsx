'use client';

import { useState } from 'react';

interface SimpleIntervalInputProps {
  leadCount: number;
  onConfirm: (intervalMinutes: number) => void;
  onCancel: () => void;
}

export function SimpleIntervalInput({ leadCount, onConfirm, onCancel }: SimpleIntervalInputProps) {
  const [intervalMinutes, setIntervalMinutes] = useState<number>(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(intervalMinutes);
  };

  const totalTime = intervalMinutes * (leadCount - 1);
  const hours = Math.floor(totalTime / 60);
  const minutes = totalTime % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-3">Интервал отправки</h3>
        
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            Отправляется <span className="font-semibold">{leadCount}</span> лидов
          </div>
          {intervalMinutes > 0 && (
            <div className="text-sm text-gray-600">
              Общее время: {hours > 0 && `${hours}ч `}{minutes > 0 && `${minutes}м`}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Интервал между отправками (минуты)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            <div className="text-xs text-gray-500 mt-1">
              0 = отправить все сразу
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Начать отправку
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
