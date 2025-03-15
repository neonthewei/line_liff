import { useState, useEffect } from 'react';

interface DebugConsoleProps {
  logs: string[];
  errors: string[];
  title?: string;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, errors, title = "Debug Console" }) => {
  return (
    <div className="mt-4 p-4 bg-gray-900 text-white rounded-xl overflow-auto max-h-[50vh]">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      
      {errors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-red-400 font-medium mb-1">Errors:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {errors.map((error, index) => (
              <li key={`error-${index}`} className="text-red-300 text-sm break-all">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {logs.length > 0 && (
        <div>
          <h4 className="text-blue-400 font-medium mb-1">Logs:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {logs.map((log, index) => (
              <li key={`log-${index}`} className="text-gray-300 text-sm break-all">
                {log}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {logs.length === 0 && errors.length === 0 && (
        <p className="text-gray-400 text-sm">No logs or errors to display.</p>
      )}
    </div>
  );
};

export default DebugConsole; 