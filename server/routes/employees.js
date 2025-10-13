const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { isManager } = require('../middleware/auth');

const router = express.Router();

// Get all employees
router.get('/', async (req, res) => {
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
router.post('/', isManager, [
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
router.put('/:id', isManager, [
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
router.get('/:id', async (req, res) => {
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

// Delete employee
router.delete('/:id', isManager, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM employees WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Employee deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee'
    });
  }
});

module.exports = router;
