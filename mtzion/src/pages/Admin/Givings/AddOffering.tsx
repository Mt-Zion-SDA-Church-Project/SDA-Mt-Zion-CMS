import React, { useState } from 'react';

const AddOffering: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  const offeringCategories = {
    'Trust Fund': [
      'Tithe (10%)',
      'Camp Meeting Offering',
      '13th Sabbath',
      'Prime Radio',
      'Kireka Adventist Church'
    ],
    'Combined Offerings': [
      'Sabbath School',
      'Thanks Giving',
      'Devine'
    ],
    'Other Offerings': [
      'Local Church Building',
      'District Project Fund',
      'Lunch',
      'Social and welfare',
      'Evangelism',
      'NBF Development Fund'
    ]
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Add Offering</h1>
        <p className="text-gray-600">Record a giving and manage the list</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left card: Enter Giving */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-md">
          <div className="px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-semibold">Enter Giving</span>
          </div>
          <form className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Category</label>
              <select 
                className="w-full border rounded px-3 py-2"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory('');
                }}
              >
                <option value="">Select Category</option>
                {Object.keys(offeringCategories).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            {selectedCategory && offeringCategories[selectedCategory as keyof typeof offeringCategories].length > 0 && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Subcategory</label>
                <select 
                  className="w-full border rounded px-3 py-2"
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                >
                  <option value="">Select Subcategory</option>
                  {offeringCategories[selectedCategory as keyof typeof offeringCategories].map(subcategory => (
                    <option key={subcategory} value={subcategory}>{subcategory}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Amount</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Transaction Code</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mobile Number</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </form>
        </div>

        {/* Right card: Giving List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold">Giving List</span>
            <div className="text-xs text-gray-600">Number of Givings: <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">0</span></div>
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            <button className="px-3 py-2 bg-red-600 text-white rounded text-sm">Delete</button>
            <div className="flex items-center gap-2 ml-2">
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
            </div>
          </div>

          <div className="px-4 pb-4">
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border-b w-10"> </th>
                  <th className="text-left p-2 border-b">NAME</th>
                  <th className="text-left p-2 border-b">CATEGORY</th>
                  <th className="text-left p-2 border-b">SUBCATEGORY</th>
                  <th className="text-left p-2 border-b">AMOUNT</th>
                  <th className="text-left p-2 border-b">TRANSACTION ID</th>
                  <th className="text-left p-2 border-b">DATE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b"><input type="checkbox" /></td>
                  <td className="p-2 text-gray-600" colSpan={6}>No data available in table</td>
                </tr>
              </tbody>
            </table>

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
    </div>
  );
};

export default AddOffering;




