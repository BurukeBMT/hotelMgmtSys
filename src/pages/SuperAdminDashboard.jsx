import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  Settings,
  UserPlus,
  Key,
  Activity,
  CreditCard,
  Calendar,
  AlertCircle,
  Home,
  Plus,
  Edit,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { adminService, usersService, bookingsService, paymentsService, roomsService, authService } from '../services/api';
import { storageService } from '../services/storage';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingBookings: 0,
    totalRooms: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState(null);
  const [listData, setListData] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load dashboard statistics and compute missing fields
      const [statsResponse, usersResponse, bookingsResponse, paymentsResponse, roomsResponse, activityResponse] = await Promise.all([
        adminService.getDashboardStats(),
        usersService.getAll(),
        bookingsService.getAll(),
        paymentsService.getAll(),
        roomsService.getAll(),
        adminService.getRecentActivity(),
      ]);

      const rawStats = statsResponse?.data || {};
      const users = Array.isArray(usersResponse?.data) ? usersResponse.data : (usersResponse?.data?.users || []);
      const bookings = Array.isArray(bookingsResponse?.data) ? bookingsResponse.data : (bookingsResponse?.data || []);
      const payments = Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : (paymentsResponse?.data || []);
      const rooms = Array.isArray(roomsResponse?.data) ? roomsResponse.data : (roomsResponse?.data?.rooms || []);

      const totalUsers = users.length;
      const totalAdmins = users.filter(u => (u.role || '').toLowerCase() === 'admin' || (u.role || '').toLowerCase() === 'super_admin').length;
      const activeUsers = users.filter(u => u.isActive === undefined ? true : !!u.isActive).length;
      const pendingBookings = bookings.filter(b => (b.status || '').toLowerCase() === 'pending').length;

      setStats({
        totalUsers: totalUsers || rawStats.totalUsers || rawStats.total_users || 0,
        totalAdmins: totalAdmins || rawStats.totalAdmins || 0,
        totalBookings: rawStats.totalBookings || bookings.length || 0,
        totalRevenue: rawStats.totalRevenue || (payments.reduce((s, p) => s + (parseFloat(p.amount || p.total || 0)), 0)),
        activeUsers: activeUsers || rawStats.activeUsers || 0,
        pendingBookings: pendingBookings || rawStats.pendingBookings || 0,
        totalRooms: rawStats.totalRooms || rooms.length || 0,
      });

      // Load recent activity
      setRecentActivity(activityResponse?.data || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };



  // Add Admin modal state
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [privilegesModal, setPrivilegesModal] = useState({ open: false, user: null, availablePrivileges: [], userPrivileges: [] });

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        email: newAdmin.email,
        password: newAdmin.password,
        username: newAdmin.email ? newAdmin.email.split('@')[0] : '',
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        role: 'admin'
      };
      await authService.register(payload);
      toast.success('Admin user created');
      setShowAddAdmin(false);
      setNewAdmin({ email: '', password: '', firstName: '', lastName: '' });
      loadDashboardData();
    } catch (err) {
      console.error('Create admin error:', err);
      toast.error(err.message || 'Failed to create admin');
    }
  };

  const openPrivilegesFor = async (user) => {
    try {
      setPrivilegesModal(prev => ({ ...prev, open: true, user }));
      const [allPrivsResp, userPrivsResp] = await Promise.all([adminService.getPrivileges(), adminService.getUserPrivileges(user.id)]);
      setPrivilegesModal({ open: true, user, availablePrivileges: allPrivsResp.data || [], userPrivileges: userPrivsResp.data || [] });
    } catch (err) {
      console.error('Open privileges error:', err);
      toast.error('Failed to load privileges');
    }
  };

  const grantPrivilege = async (priv) => {
    try {
      await adminService.grantPrivilege(privilegesModal.user.id, priv);
      toast.success('Privilege granted');
      // refresh
      const userPrivsResp = await adminService.getUserPrivileges(privilegesModal.user.id);
      setPrivilegesModal(prev => ({ ...prev, userPrivileges: userPrivsResp.data || [] }));
    } catch (err) {
      console.error('Grant error:', err);
      toast.error(err.message || 'Failed to grant');
    }
  };

  const revokePrivilege = async (priv) => {
    try {
      await adminService.revokePrivilege(privilegesModal.user.id, priv);
      toast.success('Privilege revoked');
      const userPrivsResp = await adminService.getUserPrivileges(privilegesModal.user.id);
      setPrivilegesModal(prev => ({ ...prev, userPrivileges: userPrivsResp.data || [] }));
    } catch (err) {
      console.error('Revoke error:', err);
      toast.error(err.message || 'Failed to revoke');
    }
  };

  const resolveList = (res) => {
    if (!res) return [];
    // If API returns { success, data }
    if (res.success && res.data) {
      // data might be an object like { users, pagination }
      if (Array.isArray(res.data)) return res.data;
      if (res.data.users) return res.data.users;
      return res.data;
    }
    // If service returns directly an array
    if (Array.isArray(res)) return res;
    // If { data: [...] }
    if (res.data && Array.isArray(res.data)) return res.data;
    return [];
  };

  const formatDate = (value) => {
    if (!value) return '-';
    // Firestore Timestamp has toDate()
    if (value.toDate && typeof value.toDate === 'function') {
      return value.toDate().toLocaleString();
    }
    try {
      return new Date(value).toLocaleString();
    } catch (e) {
      return String(value);
    }
  };

  const loadListFor = async (type) => {
    try {
      setSelectedView(type);
      setListLoading(true);
      setListData([]);

      let res;
  switch (type) {
        case 'totalUsers':
          res = await usersService.getAll();
          setListData(resolveList(res));
          break;
        case 'adminUsers':
          // list users with role 'admin' (exclude super_admin)
          res = await usersService.getAll({ role: 'admin' });
          setListData(resolveList(res));
          break;
        case 'totalBookings':
          res = await bookingsService.getAll();
          setListData(resolveList(res));
          break;
        case 'revenue':
          res = await paymentsService.getAll();
          setListData(resolveList(res));
          break;
        case 'activeUsers':
          // get users where isActive == true
          res = await usersService.getAll({ isActive: true });
          setListData(resolveList(res));
          break;
        case 'pendingBookings':
          res = await bookingsService.getAll({ status: 'pending' });
          setListData(resolveList(res));
          break;
        case 'totalRooms':
          res = await roomsService.getAll();
          setListData(resolveList(res));
          break;
        default:
          setListData([]);
      }
    } catch (error) {
      console.error('Error loading list:', error);
      toast.error('Failed to load list');
      setListData([]);
    } finally {
      setListLoading(false);
    }
  };

  const statCards = [
    {
      key: 'totalUsers',
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      key: 'adminUsers',
      title: 'Admin Users',
      value: stats.totalAdmins,
      icon: Shield,
      color: 'bg-purple-500',
      change: '+3',
      changeType: 'positive'
    },
    {
      key: 'totalBookings',
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      key: 'revenue',
      title: 'Revenue',
      value: `$${Number(stats.totalRevenue || 0).toLocaleString()}`,
      icon: CreditCard,
      color: 'bg-yellow-500',
      change: '+15%',
      changeType: 'positive'
    },
    {
      key: 'activeUsers',
      title: 'Active Users',
      value: stats.activeUsers,
      icon: Activity,
      color: 'bg-indigo-500',
      change: '+5%',
      changeType: 'positive'
    },
    {
      key: 'pendingBookings',
      title: 'Pending Bookings',
      value: stats.pendingBookings,
      icon: AlertCircle,
      color: 'bg-red-500',
      change: '-2',
      changeType: 'negative'
    },
    {
      key: 'totalRooms',
      title: 'Total Rooms',
      value: stats.totalRooms,
      icon: Home,
      color: 'bg-orange-500',
      change: '+1',
      changeType: 'positive'
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your hotel management system</p>
          </div>
          <div className="flex space-x-3">
            <button onClick={() => setShowAddAdmin(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin
            </button>
            <button onClick={async () => {
              // open a simple selection list to pick a user to manage privileges
              try {
                const usersResp = await usersService.getAll({ role: 'admin' });
                const usersList = usersResp?.data?.users || usersResp?.data || [];
                if (usersList.length === 0) {
                  toast('No admin users found');
                  return;
                }
                // default to first admin user for quick access
                openPrivilegesFor(usersList[0]);
              } catch (err) {
                console.error('Open manage privileges error:', err);
                toast.error('Failed to open privileges');
              }
            }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center">
              <Key className="h-4 w-4 mr-2" />
              Manage Privileges
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg cursor-pointer" onClick={() => loadListFor(stat.key)}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* List panel when a stat is selected */}
      {selectedView && (
        <div className="bg-white shadow rounded-lg mt-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {selectedView === 'totalUsers' && 'All Users'}
                {selectedView === 'adminUsers' && 'Admin Users'}
                {selectedView === 'totalBookings' && 'Bookings'}
                {selectedView === 'revenue' && 'Payments'}
                {selectedView === 'activeUsers' && 'Active Users'}
                {selectedView === 'pendingBookings' && 'Pending Bookings'}
                {selectedView === 'totalRooms' && 'Rooms'}
              </h3>
              <button className="text-sm text-blue-600" onClick={() => { setSelectedView(null); setListData([]); }}>Close</button>
            </div>

            {listLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {listData && listData.length > 0 ? listData.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {selectedView.includes('Users') || selectedView === 'totalUsers' || selectedView === 'adminUsers' || selectedView === 'activeUsers'
                            ? `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || item.username
                            : selectedView === 'totalBookings' || selectedView === 'pendingBookings'
                              ? `Booking: ${item.room_id || item.roomNumber || item.id}`
                              : selectedView === 'revenue'
                                ? `Payment: $${item.amount || '0'}`
                                : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {selectedView.includes('Users') || selectedView === 'totalUsers' || selectedView === 'adminUsers' || selectedView === 'activeUsers'
                            ? item.email || item.username || ''
                            : selectedView === 'totalBookings' || selectedView === 'pendingBookings'
                              ? `Guest: ${item.guest_name || item.guest_id || item.guestId || 'N/A'}`
                              : selectedView === 'revenue'
                                ? `User: ${item.userId || item.email || 'N/A'}`
                                : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.createdAt || item.time)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-left transition-colors">
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Manage Users</h4>
              <p className="text-sm text-gray-500">View and manage all users</p>
            </button>
            <button className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg text-left transition-colors">
              <Shield className="h-8 w-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Admin Management</h4>
              <p className="text-sm text-gray-500">Add and manage admin users</p>
            </button>
            <button className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-left transition-colors">
              <Key className="h-8 w-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Privileges</h4>
              <p className="text-sm text-gray-500">Manage admin privileges</p>
            </button>
            <button className="bg-yellow-50 hover:bg-yellow-100 p-4 rounded-lg text-left transition-colors">
              <Settings className="h-8 w-8 text-yellow-600 mb-2" />
              <h4 className="font-medium text-gray-900">System Settings</h4>
              <p className="text-sm text-gray-500">Configure system settings</p>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {recentActivity.map((activity, index) => (
                <li key={index}>
                  <div className="relative pb-8">
                    {index !== recentActivity.length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full ${activity.color} flex items-center justify-center ring-8 ring-white`}>
                          <activity.icon className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            {activity.message}
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time>{activity.time}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              User Distribution
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Clients</span>
                <span className="text-sm font-medium text-gray-900">{stats.totalUsers - stats.totalAdmins}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Admins</span>
                <span className="text-sm font-medium text-gray-900">{stats.totalAdmins}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="text-sm font-medium text-gray-900">{stats.activeUsers}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              System Health
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Database Status</span>
                <span className="text-sm font-medium text-green-600">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">API Status</span>
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Backup</span>
                <span className="text-sm font-medium text-gray-900">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Admin</h3>
            <form onSubmit={handleAddAdmin} className="space-y-3">
              <input required placeholder="First name" value={newAdmin.firstName} onChange={e => setNewAdmin(prev => ({ ...prev, firstName: e.target.value }))} className="w-full border px-3 py-2 rounded" />
              <input required placeholder="Last name" value={newAdmin.lastName} onChange={e => setNewAdmin(prev => ({ ...prev, lastName: e.target.value }))} className="w-full border px-3 py-2 rounded" />
              <input required type="email" placeholder="Email" value={newAdmin.email} onChange={e => setNewAdmin(prev => ({ ...prev, email: e.target.value }))} className="w-full border px-3 py-2 rounded" />
              <input required type="password" placeholder="Password" value={newAdmin.password} onChange={e => setNewAdmin(prev => ({ ...prev, password: e.target.value }))} className="w-full border px-3 py-2 rounded" />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAddAdmin(false)} className="px-3 py-2 bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Privileges Modal */}
      {privilegesModal.open && privilegesModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Manage Privileges — {privilegesModal.user.firstName || privilegesModal.user.email}</h3>
              <button onClick={() => setPrivilegesModal({ open: false, user: null, availablePrivileges: [], userPrivileges: [] })} className="text-sm text-gray-500">Close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Available Privileges</h4>
                <ul className="space-y-2">
                  {privilegesModal.availablePrivileges.map(p => (
                    <li key={p.id || p.name} className="flex items-center justify-between border px-3 py-2 rounded">
                      <span>{p.name || p.privilege || p.title}</span>
                      <button onClick={() => grantPrivilege(p.privilege || p.name)} className="text-sm text-green-600">Grant</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Granted Privileges</h4>
                <ul className="space-y-2">
                  {privilegesModal.userPrivileges.map(up => (
                    <li key={up.id || up.privilege} className="flex items-center justify-between border px-3 py-2 rounded">
                      <span>{up.privilege}</span>
                      <button onClick={() => revokePrivilege(up.privilege)} className="text-sm text-red-600">Revoke</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
