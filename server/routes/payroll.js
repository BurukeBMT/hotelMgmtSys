const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');

const router = express.Router();

// Get payroll records
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, employee_id, month, year, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (employee_id) {
      paramCount++;
      whereClause += ` AND p.employee_id = ?`;
      params.push(employee_id);
    }

    if (month) {
      paramCount++;
      whereClause += ` AND p.month = ?`;
      params.push(month);
    }

    if (year) {
      paramCount++;
      whereClause += ` AND p.year = ?`;
      params.push(year);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND p.status = ?`;
      params.push(status);
    }

    const result = await query(`
      SELECT p.*, e.first_name, e.last_name, e.employee_id, d.name as department_name
      FROM payroll p
      LEFT JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY p.year DESC, p.month DESC, e.first_name ASC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM payroll p
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
    console.error('Payroll error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payroll records' 
    });
  }
});

// Generate payroll for an employee
router.post('/generate', [
  body('employee_id').isInt().withMessage('Employee ID is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required'),
  body('year').isInt({ min: 2020 }).withMessage('Valid year is required')
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

    const { employee_id, month, year } = req.body;

    // Check if payroll already exists for this employee and month/year
    const existingPayroll = await query(
      'SELECT id FROM payroll WHERE employee_id = ? AND month = ? AND year = ?',
      [employee_id, month, year]
    );

    if (existingPayroll.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Payroll already generated for this month' 
      });
    }

    // Get employee details
    const employee = await query(
      'SELECT * FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employee.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    const emp = employee.rows[0];

    // Calculate days worked from attendance
    const attendanceData = await query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
      FROM attendance 
      WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
    `, [employee_id, month, year]);

    const attendance = attendanceData.rows[0];
    const daysWorked = parseInt(attendance.present_days) + parseInt(attendance.late_days);

    // Calculate salary components
    const baseSalary = parseFloat(emp.salary) || 0;
    const dailyRate = baseSalary / 30; // Assuming 30 days per month
    const grossSalary = daysWorked * dailyRate;
    
    // Calculate overtime (if any)
    const overtimeHours = 0; // This would need to be calculated based on actual overtime records
    const overtimeRate = dailyRate * 1.5; // 1.5x daily rate for overtime
    const overtimePay = overtimeHours * overtimeRate;

    // Calculate deductions (tax, insurance, etc.)
    const deductions = 0; // This would be calculated based on company policies

    // Calculate bonuses
    const bonuses = 0; // This would be added based on performance or other criteria

    // Calculate net salary
    const netSalary = grossSalary + overtimePay + bonuses - deductions;

    const result = await query(
      `INSERT INTO payroll (employee_id, month, year, base_salary, days_worked, overtime_hours, 
       overtime_rate, deductions, bonuses, net_salary, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, month, year, baseSalary, daysWorked, overtimeHours, 
       overtimeRate, deductions, bonuses, netSalary, 'pending']
    );

    // Get the generated payroll record
    const payrollRecord = await query(`
      SELECT p.*, e.first_name, e.last_name, e.employee_id, d.name as department_name
      FROM payroll p
      LEFT JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE p.employee_id = ? AND p.month = ? AND p.year = ?
    `, [employee_id, month, year]);

    res.status(201).json({
      success: true,
      message: 'Payroll generated successfully',
      data: payrollRecord.rows[0]
    });
  } catch (error) {
    console.error('Payroll generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating payroll' 
    });
  }
});

// Update payroll record
router.put('/:id', [
  body('status').optional().isIn(['pending', 'paid', 'cancelled']).withMessage('Invalid status'),
  body('payment_date').optional().isDate().withMessage('Valid payment date is required'),
  body('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be non-negative'),
  body('bonuses').optional().isFloat({ min: 0 }).withMessage('Bonuses must be non-negative'),
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
    const { status, payment_date, deductions, bonuses, notes } = req.body;

    // Get current payroll record
    const currentPayroll = await query(
      'SELECT * FROM payroll WHERE id = ?',
      [id]
    );

    if (currentPayroll.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payroll record not found' 
      });
    }

    const payroll = currentPayroll.rows[0];

    // Recalculate net salary if deductions or bonuses changed
    let netSalary = payroll.net_salary;
    if (deductions !== undefined || bonuses !== undefined) {
      const newDeductions = deductions !== undefined ? deductions : payroll.deductions;
      const newBonuses = bonuses !== undefined ? bonuses : payroll.bonuses;
      netSalary = payroll.base_salary + payroll.overtime_hours * payroll.overtime_rate + newBonuses - newDeductions;
    }

    const result = await query(
      `UPDATE payroll SET 
       status = COALESCE(?, status),
       payment_date = COALESCE(?, payment_date),
       deductions = COALESCE(?, deductions),
       bonuses = COALESCE(?, bonuses),
       net_salary = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, payment_date, deductions, bonuses, netSalary, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payroll record not found' 
      });
    }

    // Get updated payroll record
    const updatedRecord = await query(`
      SELECT p.*, e.first_name, e.last_name, e.employee_id, d.name as department_name
      FROM payroll p
      LEFT JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE p.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Payroll updated successfully',
      data: updatedRecord.rows[0]
    });
  } catch (error) {
    console.error('Payroll update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating payroll' 
    });
  }
});

// Get payroll details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT p.*, e.first_name, e.last_name, e.employee_id, e.position, d.name as department_name
      FROM payroll p
      LEFT JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE p.id = ?
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payroll record not found' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Payroll details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payroll details' 
    });
  }
});

// Get payroll dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Current month payroll summary
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const currentMonthPayroll = await query(`
      SELECT 
        COUNT(*) as total_employees,
        SUM(base_salary) as total_base_salary,
        SUM(net_salary) as total_net_salary,
        SUM(deductions) as total_deductions,
        SUM(bonuses) as total_bonuses,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM payroll 
      WHERE month = ? AND year = ?
    `, [currentMonth, currentYear]);

    // Payroll by department
    const payrollByDept = await query(`
      SELECT 
        d.name as department_name,
        COUNT(p.id) as employee_count,
        SUM(p.net_salary) as total_salary,
        AVG(p.net_salary) as avg_salary
      FROM payroll p
      LEFT JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE p.month = ? AND p.year = ?
      GROUP BY d.id, d.name
      ORDER BY total_salary DESC
    `, [currentMonth, currentYear]);

    // Recent payroll records
    const recentPayroll = await query(`
      SELECT p.*, e.first_name, e.last_name, e.employee_id, d.name as department_name
      FROM payroll p
      LEFT JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY p.year DESC, p.month DESC, p.created_at DESC
      LIMIT 10
    `);

    // Monthly payroll trend (last 6 months)
    const monthlyTrend = await query(`
      SELECT 
        month,
        year,
        COUNT(*) as employee_count,
        SUM(net_salary) as total_salary,
        AVG(net_salary) as avg_salary
      FROM payroll 
      WHERE year = ? OR (year = ? AND month >= ?)
      GROUP BY year, month
      ORDER BY year DESC, month DESC
      LIMIT 6
    `, [currentYear, currentYear - 1, currentMonth]);

    res.json({
      success: true,
      data: {
        currentMonthPayroll: currentMonthPayroll.rows[0],
        payrollByDepartment: payrollByDept.rows,
        recentPayroll: recentPayroll.rows,
        monthlyTrend: monthlyTrend.rows
      }
    });
  } catch (error) {
    console.error('Payroll dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payroll dashboard data' 
    });
  }
});

// Bulk generate payroll for all employees
router.post('/bulk-generate', [
  body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required'),
  body('year').isInt({ min: 2020 }).withMessage('Valid year is required')
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

    const { month, year } = req.body;

    // Get all active employees
    const employees = await query(
      'SELECT id FROM employees WHERE is_active = TRUE',
      []
    );

    const results = [];
    const errorList = [];

    for (const employee of employees.rows) {
      try {
        // Check if payroll already exists
        const existingPayroll = await query(
          'SELECT id FROM payroll WHERE employee_id = ? AND month = ? AND year = ?',
          [employee.id, month, year]
        );

        if (existingPayroll.rows.length > 0) {
          errorList.push(`Payroll already exists for employee ${employee.id}`);
          continue;
        }

        // Generate payroll for this employee (same logic as individual generation)
        const emp = await query('SELECT * FROM employees WHERE id = ?', [employee.id]);
        const empData = emp.rows[0];

        const attendanceData = await query(`
          SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
          FROM attendance 
          WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
        `, [employee.id, month, year]);

        const attendance = attendanceData.rows[0];
        const daysWorked = parseInt(attendance.present_days) + parseInt(attendance.late_days);
        const baseSalary = parseFloat(empData.salary) || 0;
        const dailyRate = baseSalary / 30;
        const grossSalary = daysWorked * dailyRate;
        const netSalary = grossSalary; // Simplified calculation

        await query(
          `INSERT INTO payroll (employee_id, month, year, base_salary, days_worked, net_salary, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [employee.id, month, year, baseSalary, daysWorked, netSalary, 'pending']
        );

        results.push(`Payroll generated for employee ${employee.id}`);
      } catch (error) {
        errorList.push(`Error generating payroll for employee ${employee.id}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Bulk payroll generation completed',
      data: {
        successful: results.length,
        failed: errorList.length,
        results,
        errors: errorList
      }
    });
  } catch (error) {
    console.error('Bulk payroll generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating bulk payroll' 
    });
  }
});

module.exports = router;
