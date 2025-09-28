import React from 'react';

const Birthdays: React.FC = () => {
  const handlePrint = () => window.print();

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold">Upcoming Birthdays</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs">0</span>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1 text-sm">
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">records per page</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">Search:</span>
            <input className="border rounded px-2 py-1 text-sm w-60" />
            <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print List</button>
          </div>
        </div>

        {/* Table */}
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">NAME</th>
                <th className="text-left p-2 border-b">GENDER</th>
                <th className="text-left p-2 border-b">RESIDENCE</th>
                <th className="text-left p-2 border-b">PLACE OF BIRTH</th>
                <th className="text-left p-2 border-b">BIRTHDAY</th>
                <th className="text-left p-2 border-b">MINISTRY</th>
                <th className="text-left p-2 border-b">MOBILE NO.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 text-gray-600" colSpan={7}>No data available in table</td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
            <div>Showing 0 to 0 of 0 entries</div>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 border rounded text-gray-500" disabled>Previous</button>
              <button className="px-2 py-1 border rounded text-gray-500" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Birthdays;






