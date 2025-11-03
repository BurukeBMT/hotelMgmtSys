# TODO: Integrate Firebase Authentication Throughout Project

## Tasks

- [x] Update src/routes/auth.js to use Firebase Auth for registration, login, and profile management, storing user data in Firestore
- [x] Update src/middleware/rbac.js to use Firestore for role hierarchy and privilege checks instead of SQL
- [x] Verify index.js and middlewares are consistent with Firebase integration
- [x] Remove or adapt SQL dependencies for auth-related operations in routes/auth.js
- [x] Test authentication flow with Firebase
- [ ] Verify role-based access control works with Firestore
- [ ] Update any other routes that depend on SQL user data to use Firestore
