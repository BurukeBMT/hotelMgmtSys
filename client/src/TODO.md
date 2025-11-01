# TODO: Merge client/sources and client/src, Remove Firebase, Integrate with MAMP phpMyAdmin

## Phase 1: Remove Firebase Integration
- [x] Identify Firebase files in client/sources/
  - client/sources/config/firebase-config.js
  - client/sources/config/authMethods.js
  - client/sources/Context/UserAuthContext.js
- [x] Remove Firebase dependencies from client/package.json
- [x] Delete Firebase config files
- [x] Update authentication components to use API calls instead of Firebase

## Phase 2: Merge Source Folders
- [x] Analyze client/sources/ and client/src/ structures
- [x] Move unique components from sources/ to src/
  - Carousel, Cards components
  - About, Contact, Home screens
- [x] Integrate Redux store from sources/ into src/ if needed
- [x] Update routing in src/App.jsx to include merged routes
- [x] Move images from sources/imgs/ to src/assets/

## Phase 3: Update Authentication
- [x] Modify Login component to use authService.login()
- [x] Modify Signup component to use authService.register()
- [x] Update UserAuthContext to use AuthContext from src/
- [x] Ensure login/signup routes work with server API

## Phase 4: Database Integration
- [x] Confirm server uses MySQL (compatible with MAMP phpMyAdmin)
- [x] Verify server/database/config.js points to localhost:3306
- [x] Run database setup script
- [x] Test server connection to database

## Phase 5: Testing and Cleanup
- [ ] Test admin dashboard functionality
- [ ] Test client booking flows
- [ ] Test HR manager features
- [ ] Remove client/sources/ folder after successful merge
- [ ] Update documentation

## Current Status
- Server is running on port 5000 with MySQL connection
- Firebase files identified and ready for removal
- Source folders analyzed
- Ready to proceed with merge and Firebase removal
