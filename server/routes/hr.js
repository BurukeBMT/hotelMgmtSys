const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { isManager } = require('../middleware/auth');

const router = express.Router();

// Get all departments
router.get('/departments', async (req, res) => {
  try {
    const result = await query(`
      SELECT d.*, u.first_name, u.last_name as manager_name
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      ORDER BY d.name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Departments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching departments' 
    });
  }
});

// Create new department
router.post('/departments', isManager, [
  body('name').notEmpty().withMessage('Department name is required'),
  body('description').optional(),
  body('manager_id').optional().isInt().withMessage('Manager ID must be a number')
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

    const { name, description, manager_id } = req.body;

    const result = await query(
      'INSERT INTO departments (name, description, manager_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, manager_id]
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Department creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating department' 
    });
  }
});

// Update department
router.put('/departments/:id', isManager, [
  body('name').optional().notEmpty().withMessage('Department name cannot be empty'),
  body('description').optional(),
  body('manager_id').optional().isInt().withMessage('Manager ID must be a number')
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
    const { name, description, manager_id } = req.body;

    const result = await query(
      `UPDATE departments SET 
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       manager_id = COALESCE($3, manager_id)
       WHERE id = $4 RETURNING *`,
      [name, description, manager_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Department not found' 
      });
    }

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Department update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating department' 
    });
  }
});

// Get all employees
router.get('/employees', async (req, res) => {
  try {
    const { page = 1, limit = 10, department_id, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      whereClause += ` AND e.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND e.status = $${paramCount}`;
      params.push(status);
    }

    const result = await query(`
      SELECT e.*, u.first_name, u.last_name, u.email, u.phone,
             d.name as department_name
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM employees e
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
    console.error('Employees error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching employees' 
    });
  }
});

// Create new employee
router.post('/employees', isManager, [
  body('user_id').isInt().withMessage('User ID is required'),
  body('employee_id').notEmpty().withMessage('Employee ID is required'),
  body('department_id').isInt().withMessage('Department ID is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('hire_date').isDate().withMessage('Valid hire date is required'),
  body('salary').isFloat({ min: 0 }).withMessage('Valid salary is required'),
  body('emergency_contact').optional(),
  body('emergency_phone').optional()
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

    const { 
      user_id, employee_id, department_id, position, hire_date, 
      salary, emergency_contact, emergency_phone 
    } = req.body;

    // Check if employee already exists
    const existingEmployee = await query(
      'SELECT id FROM employees WHERE employee_id = $1 OR user_id = $2',
      [employee_id, user_id]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Employee already exists' 
      });
    }

    const result = await query(
      `INSERT INTO employees (user_id, employee_id, department_id, position, hire_date, 
       salary, emergency_contact, emergency_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user_id, employee_id, department_id, position, hire_date, 
       salary, emergency_contact, emergency_phone]
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Employee creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating employee' 
    });
  }
});

// Update employee
router.put('/employees/:id', isManager, [
  body('department_id').optional().isInt().withMessage('Department ID must be a number'),
  body('position').optional().notEmpty().withMessage('Position cannot be empty'),
  body('salary').optional().isFloat({ min: 0 }).withMessage('Valid salary is required'),
  body('status').optional().isIn(['active', 'inactive', 'terminated']).withMessage('Invalid status'),
  body('emergency_contact').optional(),
  body('emergency_phone').optional()
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
    const { department_id, position, salary, status, emergency_contact, emergency_phone } = req.body;

    const result = await query(
      `UPDATE employees SET 
       department_id = COALESCE($1, department_id),
       position = COALESCE($2, position),
       salary = COALESCE($3, salary),
       status = COALESCE($4, status),
       emergency_contact = COALESCE($5, emergency_contact),
       emergency_phone = COALESCE($6, emergency_phone),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [department_id, position, salary, status, emergency_contact, emergency_phone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Employee update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating employee' 
    });
  }
});

// Get employee details
router.get('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT e.*, u.first_name, u.last_name, u.email, u.phone, u.address,
             d.name as department_name
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Employee details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching employee details' 
    });
  }
});

// Get HR dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Total employees
    const totalEmployees = await query('SELECT COUNT(*) as count FROM employees WHERE status = $1', ['active']);
    
    // Employees by department
    const employeesByDept = await query(`
      SELECT d.name, COUNT(e.id) as count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
      GROUP BY d.id, d.name
      ORDER BY count DESC
    `);

    // Recent hires (last 30 days)
    const recentHires = await query(`
      SELECT e.*, u.first_name, u.last_name, d.name as department_name
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.hire_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY e.hire_date DESC
      LIMIT 5
    `);

    // Average salary by department
    const avgSalaryByDept = await query(`
      SELECT d.name, AVG(e.salary) as avg_salary
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
      GROUP BY d.id, d.name
      HAVING AVG(e.salary) IS NOT NULL
      ORDER BY avg_salary DESC
    `);

    res.json({
      success: true,
      data: {
        totalEmployees: parseInt(totalEmployees.rows[0].count),
        employeesByDepartment: employeesByDept.rows,
        recentHires: recentHires.rows,
        averageSalaryByDepartment: avgSalaryByDept.rows
      }
    });
  } catch (error) {
    console.error('HR dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching HR dashboard data' 
    });
  }
});

module.exports = router; 