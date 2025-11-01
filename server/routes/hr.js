const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/hr/employees
 * Get all employees
 */
router.get('/employees', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    let query = db.collection('employees');

    if (req.query.status) {
      query = query.where('status', '==', req.query.status);
    }
    if (req.query.departmentId) {
      query = query.where('departmentId', '==', req.query.departmentId);
    }

    const snapshot = await query.get();
    const employees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/hr/employees
 * Create a new employee
 */
router.post('/employees', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const employeeData = {
      ...req.body,
      status: req.body.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.userId,
    };

    const docRef = await db.collection('employees').add(employeeData);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        id: docRef.id,
        ...employeeData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hr/departments
 * Get all departments
 */
router.get('/departments', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const snapshot = await db.collection('departments').get();
    const departments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/hr/departments
 * Create a new department
 */
router.post('/departments', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const departmentData = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.userId,
    };

    const docRef = await db.collection('departments').add(departmentData);

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: {
        id: docRef.id,
        ...departmentData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hr/attendance
 * Get attendance records
 */
router.get('/attendance', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    let query = db.collection('attendance');

    if (req.query.employeeId) {
      query = query.where('employeeId', '==', req.query.employeeId);
    }
    if (req.query.date) {
      query = query.where('date', '==', req.query.date);
    }

    const snapshot = await query.orderBy('date', 'desc').get();
    const attendance = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/hr/attendance
 * Create attendance record
 */
router.post('/attendance', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const attendanceData = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.userId,
    };

    const docRef = await db.collection('attendance').add(attendanceData);

    res.status(201).json({
      success: true,
      message: 'Attendance record created successfully',
      data: {
        id: docRef.id,
        ...attendanceData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hr/payroll
 * Get payroll records
 */
router.get('/payroll', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    let query = db.collection('payroll');

    if (req.query.employeeId) {
      query = query.where('employeeId', '==', req.query.employeeId);
    }
    if (req.query.month) {
      query = query.where('month', '==', parseInt(req.query.month));
    }
    if (req.query.year) {
      query = query.where('year', '==', parseInt(req.query.year));
    }

    const snapshot = await query.orderBy('year', 'desc').orderBy('month', 'desc').get();
    const payroll = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/hr/payroll
 * Generate payroll
 */
router.post('/payroll', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const payrollData = {
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.userId,
    };

    const docRef = await db.collection('payroll').add(payrollData);

    res.status(201).json({
      success: true,
      message: 'Payroll generated successfully',
      data: {
        id: docRef.id,
        ...payrollData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hr/dashboard
 * Get HR dashboard statistics
 */
router.get('/dashboard', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const [employeesSnapshot, departmentsSnapshot] = await Promise.all([
      db.collection('employees').where('status', '==', 'active').get(),
      db.collection('departments').get(),
    ]);

    const employees = employeesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    const departments = departmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Group employees by department
    const employeesByDepartment = departments.map(dept => ({
      name: dept.name,
      count: employees.filter(
        emp => emp.departmentId === dept.id || emp.department_id === dept.id
      ).length,
    }));

    res.json({
      success: true,
      data: {
        totalEmployees: employees.length,
        employeesByDepartment,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

