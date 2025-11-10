import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Download,
  RefreshCw
} from 'lucide-react';
import { reportsService, adminService } from '../services/api';
import toast from 'react-hot-toast';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [reportType, setReportType] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState({});
  const [bookingStats, setBookingStats] = useState({});
  const [revenueStats, setRevenueStats] = useState({});
  const [occupancyStats, setOccupancyStats] = useState({});

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const dashboardResponse = await adminService.getDashboardStats();
      setDashboardStats(dashboardResponse.data);

      // Load booking stats
      const bookingResponse = await reportsService.getBookingStats(selectedPeriod);
      setBookingStats(bookingResponse.data);

      // Load revenue stats
      const revenueResponse = await reportsService.getRevenueStats(selectedPeriod);
      setRevenueStats(revenueResponse.data);

      // Load occupancy stats
      const occupancyResponse = await reportsService.getOccupancyStats(selectedPeriod);
      setOccupancyStats(occupancyResponse.data);
    } catch (error) {
      toast.error('Failed to load report data');
      console.error('Load report data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const exportReport = (type) => {
    // Simple CSV export functionality
    const csvContent = generateCSVContent(type);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report-${selectedPeriod}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const generateCSVContent = (type) => {
    const headers = ['Metric', 'Value', 'Period'];
    const data = [
      ['Total Users', dashboardStats.totalUsers || 0, selectedPeriod],
      ['Total Bookings', dashboardStats.totalBookings || 0, selectedPeriod],
      ['Total Revenue', `$${dashboardStats.totalRevenue || 0}`, selectedPeriod],
      ['Active Users', dashboardStats.activeUsers || 0, selectedPeriod],
      ['Pending Bookings', dashboardStats.pendingBookings || 0, selectedPeriod]
    ];
    
    return [headers, ...data].map(row => row.join(',')).join('\n');
  };

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'bookings', name: 'Bookings', icon: Calendar },
    { id: 'revenue', name: 'Revenue', icon: DollarSign },
    { id: 'occupancy', name: 'Occupancy', icon: Users }
  ];

  const periods = [
    { id: '7d', name: 'Last 7 Days' },
    { id: '30d', name: 'Last 30 Days' },
    { id: '90d', name: 'Last 90 Days' },
    { id: '1y', name: 'Last Year' }
  ];

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
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600">Comprehensive insights into your hotel operations</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadReportData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => exportReport(reportType)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <div className="flex space-x-2">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                    reportType === type.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <type.icon className="h-4 w-4 mr-2" />
                  {type.name}
                </button>
              ))}
            </div>
          </div>
    <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Report */}
      {reportType === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{dashboardStats.totalUsers || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                    <dd className="text-lg font-medium text-gray-900">{dashboardStats.totalBookings || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">${dashboardStats.totalRevenue?.toLocaleString() || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{dashboardStats.activeUsers || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Trends</h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Chart visualization would go here</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Analysis</h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Chart visualization would go here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bookings Report */}
      {reportType === 'bookings' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{bookingStats.total || 0}</div>
                <div className="text-sm text-gray-500">Total Bookings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{bookingStats.confirmed || 0}</div>
                <div className="text-sm text-gray-500">Confirmed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{bookingStats.pending || 0}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Trends</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Booking trends chart would go here</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Report */}
      {reportType === 'revenue' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">${revenueStats.total || 0}</div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">${revenueStats.average || 0}</div>
                <div className="text-sm text-gray-500">Average per Booking</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{revenueStats.growth || 0}%</div>
                <div className="text-sm text-gray-500">Growth Rate</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trends</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Revenue trends chart would go here</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Occupancy Report */}
      {reportType === 'occupancy' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Occupancy Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{occupancyStats.rate || 0}%</div>
                <div className="text-sm text-gray-500">Occupancy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{occupancyStats.available || 0}</div>
                <div className="text-sm text-gray-500">Available Rooms</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{occupancyStats.occupied || 0}</div>
                <div className="text-sm text-gray-500">Occupied Rooms</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Occupancy Trends</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Occupancy trends chart would go here</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => exportReport('overview')}
            className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-left transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Export Overview</h4>
            <p className="text-sm text-gray-500">Download comprehensive overview report</p>
          </button>
          <button
            onClick={() => exportReport('bookings')}
            className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-left transition-colors"
          >
            <Calendar className="h-8 w-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Export Bookings</h4>
            <p className="text-sm text-gray-500">Download detailed booking report</p>
          </button>
          <button
            onClick={() => exportReport('revenue')}
            className="bg-yellow-50 hover:bg-yellow-100 p-4 rounded-lg text-left transition-colors"
          >
            <DollarSign className="h-8 w-8 text-yellow-600 mb-2" />
            <h4 className="font-medium text-gray-900">Export Revenue</h4>
            <p className="text-sm text-gray-500">Download financial revenue report</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
