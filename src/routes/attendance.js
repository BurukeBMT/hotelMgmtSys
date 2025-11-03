const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');

const router = express.Router();

// Get attendance records
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, employee_id, date, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (employee_id) {
      paramCount++;
      whereClause += ` AND a.employee_id = ?`;
      params.push(employee_id);
    }

    if (date) {
      paramCount++;
      whereClause += ` AND a.date = ?`;
      params.push(date);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND a.status = ?`;
      params.push(status);
    }

    const result = await query(`
      SELECT a.*, e.first_name, e.last_name, e.employee_id, d.name as department_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY a.date DESC, e.first_name ASC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM attendance a
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching attendance records' 
    });
  }
});

// Mark attendance
router.post('/', [
  body('employee_id').isInt().withMessage('Employee ID is required'),
  body('date').isDate().withMessage('Valid date is required'),
  body('status').isIn(['present', 'absent', 'late', 'on_leave']).withMessage('Invalid status'),
  body('check_in_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
  body('check_out_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
  body('notes').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: errors.array() 
      });
    }

    const { employee_id, date, status, check_in_time, check_out_time, notes } = req.body;

    // Check if attendance already exists for this employee and date
    const existingAttendance = await query(
      'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    if (existingAttendance.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Attendance already marked for this date' 
      });
    }

    const result = await query(
      `INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employee_id, date, check_in_time, check_out_time, status, notes]
    );

    // Get the inserted attendance record with employee details
    const attendanceRecord = await query(`
      SELECT a.*, e.first_name, e.last_name, e.employee_id, d.name as department_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.employee_id = ? AND a.date = ?
    `, [employee_id, date]);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendanceRecord.rows[0]
    });
  } catch (error) {
    console.error('Attendance marking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking attendance' 
    });
  }
});

// Update attendance
router.put('/:id', [
  body('status').optional().isIn(['present', 'absent', 'late', 'on_leave']).withMessage('Invalid status'),
  body('check_in_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
  body('check_out_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
  body('notes').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { status, check_in_time, check_out_time, notes } = req.body;

    const result = await query(
      `UPDATE attendance SET 
       status = COALESCE(?, status),
       check_in_time = COALESCE(?, check_in_time),
       check_out_time = COALESCE(?, check_out_time),
       notes = COALESCE(?, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, check_in_time, check_out_time, notes, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Attendance record not found' 
      });
    }

    // Get updated attendance record
    const updatedRecord = await query(`
      SELECT a.*, e.first_name, e.last_name, e.employee_id, d.name as department_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: updatedRecord.rows[0]
    });
  } catch (error) {
    console.error('Attendance update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating attendance' 
    });
  }
});

// Get attendance summary for an employee
router.get('/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;

    let whereClause = 'WHERE a.employee_id = ?';
    const params = [id];

    if (month && year) {
      whereClause += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?';
      params.push(month, year);
    }

    const result = await query(`
      SELECT a.*, e.first_name, e.last_name, e.employee_id
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      ${whereClause}
      ORDER BY a.date DESC
    `, params);

    // Calculate summary statistics
    const summary = await query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as leave_days
      FROM attendance a
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        records: result.rows,
        summary: summary.rows[0]
      }
    });
  } catch (error) {
    console.error('Employee attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching employee attendance' 
    });
  }
});

// Get attendance dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Today's attendance
    const todayAttendance = await query(`
      SELECT 
        COUNT(*) as total_employees,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as on_leave
      FROM attendance a
      WHERE a.date = CURDATE()
    `);

    // This month's attendance summary
    const monthAttendance = await query(`
      SELECT 
        COUNT(DISTINCT employee_id) as total_employees,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as leave_days
      FROM attendance a
      WHERE MONTH(a.date) = MONTH(CURDATE()) AND YEAR(a.date) = YEAR(CURDATE())
    `);

    // Attendance by department
    const attendanceByDept = await query(`
      SELECT 
        d.name as department_name,
        COUNT(a.id) as total_records,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        ROUND(
          (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 2
        ) as attendance_rate
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.date = CURDATE()
      GROUP BY d.id, d.name
      ORDER BY attendance_rate DESC
    `);

    // Recent attendance records
    const recentAttendance = await query(`
      SELECT a.*, e.first_name, e.last_name, e.employee_id, d.name as department_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY a.date DESC, a.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        todayAttendance: todayAttendance.rows[0],
        monthAttendance: monthAttendance.rows[0],
        attendanceByDepartment: attendanceByDept.rows,
        recentAttendance: recentAttendance.rows
      }
    });
  } catch (error) {
    console.error('Attendance dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching attendance dashboard data' 
    });
  }
});

module.exports = router;
