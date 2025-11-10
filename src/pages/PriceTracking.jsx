import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw
} from 'lucide-react';
import { pricingService } from '../services/api';
import toast from 'react-hot-toast';

const PriceTracking = () => {
  const [priceData, setPriceData] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [filters, setFilters] = useState({
    room_type_id: '',
    date_from: '',
    date_to: ''
  });

  const [newPrice, setNewPrice] = useState({
    room_type_id: '',
    base_price: '',
    seasonal_multiplier: 1.00,
    weekend_multiplier: 1.20,
    holiday_multiplier: 1.50,
    demand_multiplier: 1.00,
    effective_date: new Date().toISOString().split('T')[0]
  });

  const loadPriceData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await pricingService.getPriceTracking(filters);
      // pricingService already returns response.data in the service layer
      // but some endpoints may return a wrapped payload ({ data: [...] })
      // so be defensive and support both shapes to avoid `undefined.map` errors
      const payload = response?.data ?? response ?? [];
      setPriceData(Array.isArray(payload) ? payload : (payload.rows ?? payload.items ?? []));
    } catch (error) {
      toast.error('Failed to load price data');
      console.error('Load price data error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadRoomTypes = useCallback(async () => {
    try {
      const response = await pricingService.getRoomTypes();
      const payload = response?.data ?? response ?? [];
      setRoomTypes(Array.isArray(payload) ? payload : (payload.rows ?? payload.items ?? []));
    } catch (error) {
      console.error('Load room types error:', error);
    }
  }, []);

  useEffect(() => {
    loadPriceData();
    loadRoomTypes();
  }, [loadPriceData, loadRoomTypes]);

  const handleAddPrice = async (e) => {
    e.preventDefault();
    try {
      await pricingService.createPriceTracking(newPrice);
      toast.success('Price tracking entry created successfully');
      setShowAddModal(false);
      setNewPrice({
        room_type_id: '',
        base_price: '',
        seasonal_multiplier: 1.00,
        weekend_multiplier: 1.20,
        holiday_multiplier: 1.50,
        demand_multiplier: 1.00,
        effective_date: new Date().toISOString().split('T')[0]
      });
      loadPriceData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create price entry');
    }
  };

  const handleEditPrice = async (e) => {
    e.preventDefault();
    try {
      await pricingService.updatePriceTracking(selectedPrice.id, selectedPrice);
      toast.success('Price tracking entry updated successfully');
      setShowEditModal(false);
      setSelectedPrice(null);
      loadPriceData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update price entry');
    }
  };

  const handleDeletePrice = async (id) => {
    if (window.confirm('Are you sure you want to delete this price entry?')) {
      try {
        await pricingService.deletePriceTracking(id);
        toast.success('Price tracking entry deleted successfully');
        loadPriceData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete price entry');
      }
    }
  };

  const openEditModal = (price) => {
    setSelectedPrice({ ...price });
    setShowEditModal(true);
  };

  const calculatePriceChange = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(2);
  };

  const getPriceChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPriceChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Price Tracking</h1>
            <p className="text-gray-600">Manage dynamic pricing and seasonal rates</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadPriceData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Price
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
            <select
              value={filters.room_type_id}
              onChange={(e) => setFilters(prev => ({ ...prev, room_type_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Room Types</option>
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ room_type_id: '', date_from: '', date_to: '' })}
              className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Price Data Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Multipliers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {priceData.map((price, index) => {
                const previousPrice = index > 0 ? priceData[index - 1] : null;
                const priceChange = calculatePriceChange(price.final_price, previousPrice?.final_price);
                
                return (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {price.room_type_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {price.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${price.base_price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 space-y-1">
                        <div>Seasonal: {price.seasonal_multiplier}x</div>
                        <div>Weekend: {price.weekend_multiplier}x</div>
                        <div>Holiday: {price.holiday_multiplier}x</div>
                        <div>Demand: {price.demand_multiplier}x</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          ${price.final_price.toFixed(2)}
                        </span>
                        {priceChange !== 0 && (
                          <span className={`ml-2 flex items-center ${getPriceChangeColor(priceChange)}`}>
                            {getPriceChangeIcon(priceChange)}
                            <span className="ml-1 text-xs">
                              {priceChange > 0 ? '+' : ''}{priceChange}%
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(price.effective_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(price)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Price"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrice(price.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Price"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Price Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Price Tracking Entry</h3>
              <form onSubmit={handleAddPrice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                  <select
                    required
                    value={newPrice.room_type_id}
                    onChange={(e) => setNewPrice(prev => ({ ...prev, room_type_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Room Type</option>
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Price</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPrice.base_price}
                    onChange={(e) => setNewPrice(prev => ({ ...prev, base_price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seasonal Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPrice.seasonal_multiplier}
                      onChange={(e) => setNewPrice(prev => ({ ...prev, seasonal_multiplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weekend Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPrice.weekend_multiplier}
                      onChange={(e) => setNewPrice(prev => ({ ...prev, weekend_multiplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Holiday Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPrice.holiday_multiplier}
                      onChange={(e) => setNewPrice(prev => ({ ...prev, holiday_multiplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Demand Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPrice.demand_multiplier}
                      onChange={(e) => setNewPrice(prev => ({ ...prev, demand_multiplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={newPrice.effective_date}
                    onChange={(e) => setNewPrice(prev => ({ ...prev, effective_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Price
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Price Modal */}
      {showEditModal && selectedPrice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Price Tracking Entry</h3>
              <form onSubmit={handleEditPrice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Price</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={selectedPrice.base_price}
                    onChange={(e) => setSelectedPrice(prev => ({ ...prev, base_price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seasonal Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedPrice.seasonal_multiplier}
                      onChange={(e) => setSelectedPrice(prev => ({ ...prev, seasonal_multiplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weekend Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedPrice.weekend_multiplier}
                      onChange={(e) => setSelectedPrice(prev => ({ ...prev, weekend_multiplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Holiday Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedPrice.holiday_multiplier}
                      onChange={(e) => setSelectedPrice(prev => ({ ...prev, holiday_multiplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Demand Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedPrice.demand_multiplier}
                      onChange={(e) => setSelectedPrice(prev => ({ ...prev, demand_multiplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={selectedPrice.effective_date}
                    onChange={(e) => setSelectedPrice(prev => ({ ...prev, effective_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Price
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceTracking;
