# Team-Based Role-Based Access Control (RBAC) System

## Overview

Your Dorwel backend now includes a comprehensive **Team-Based RBAC system** that allows you to create teams with granular permissions for different roles. This system builds on your existing global RBAC and adds team-specific access control.

## System Architecture

### **Two-Level Permission System:**

1. **Global Permissions** - System-wide roles (Studio Owner, Team Manager, etc.)
2. **Team Permissions** - Team-specific roles with granular resource access

### **Permission Hierarchy:**
```
Global Role → Team Membership → Team Role → Resource Permissions
```

## Models

### **1. Team Model (`teamModel.js`)**
- **Purpose:** Manages teams and team-specific permissions
- **Key Features:**
  - Team hierarchy (parent-child teams)
  - Member management with roles
  - Granular resource permissions
  - Team settings and preferences

### **2. Enhanced User Model (`userModel.js`)**
- **Purpose:** Extended to include team memberships
- **Key Features:**
  - Team memberships with roles
  - User preferences
  - Team-related methods

### **3. Team Authentication Middleware (`teamAuth.js`)**
- **Purpose:** Handles team-based permission checking
- **Key Features:**
  - Team membership verification
  - Role-based access control
  - Resource permission checking

## Team Structure

### **Team Types:**
- `design` - Design-focused teams
- `project` - Project-specific teams
- `department` - Departmental teams
- `client_service` - Client service teams
- `management` - Management teams

### **Team Roles:**
- `team_lead` - Full team management permissions
- `senior_member` - Can manage team members and resources
- `member` - Standard team member with assigned permissions
- `contributor` - Limited permissions for specific tasks
- `observer` - Read-only access

### **Resource Types:**
- `project` - Project management
- `client` - Client management
- `lead` - Lead management
- `estimate` - Estimate management
- `moodboard` - Moodboard management
- `team` - Team management
- `user` - User management

### **Actions:**
- `create` - Create new resources
- `read` - View resources
- `update` - Modify resources
- `delete` - Remove resources
- `assign` - Assign resources to others
- `approve` - Approve resources

### **Permission Scopes:**
- `team` - Access to team resources only
- `own` - Access to own resources only
- `all` - Access to all resources

## API Endpoints

### **Team Management:**
```
POST   /api/v1/teams                           - Create team
GET    /api/v1/teams                           - Get teams (with filters)
GET    /api/v1/teams/stats                     - Get team statistics
GET    /api/v1/teams/search                    - Search teams
GET    /api/v1/teams/my-teams                  - Get user's teams
GET    /api/v1/teams/type/:teamType            - Get teams by type
GET    /api/v1/teams/:teamId                   - Get specific team
PUT    /api/v1/teams/:teamId                   - Update team
DELETE /api/v1/teams/:teamId                   - Delete team
```

### **Team Member Management:**
```
POST   /api/v1/teams/:teamId/members           - Add member to team
DELETE /api/v1/teams/:teamId/members           - Remove member from team
PUT    /api/v1/teams/:teamId/members/role      - Update member role
GET    /api/v1/teams/:teamId/members           - Get team members
```

### **User Team Management:**
```
GET    /api/v1/teams/user/:userId/teams        - Get user's teams
```

### **Permission Checking:**
```
GET    /api/v1/teams/:teamId/permissions/check - Check user permissions
```

## Usage Examples

### **1. Creating a Team:**
```javascript
POST /api/v1/teams
{
  "name": "Design Team Alpha",
  "description": "Primary design team for residential projects",
  "teamType": "design",
  "settings": {
    "allowMemberInvites": true,
    "requireApprovalForJoins": false
  },
  "tags": ["residential", "design", "alpha"]
}
```

### **2. Adding a Member to Team:**
```javascript
POST /api/v1/teams/:teamId/members
{
  "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "role": "member",
  "permissions": [
    {
      "resource": "project",
      "actions": ["create", "read", "update"],
      "scope": "team"
    },
    {
      "resource": "moodboard",
      "actions": ["create", "read", "update", "delete"],
      "scope": "team"
    }
  ]
}
```

### **3. Checking Permissions:**
```javascript
GET /api/v1/teams/:teamId/permissions/check?userId=60f7b3b3b3b3b3b3b3b3b3b3&resource=project&action=create
```

## Middleware Usage

### **1. Basic Team Authentication:**
```javascript
import { authenticate } from '~/middlewares/teamAuth';

// Require team membership
router.get('/:teamId/projects', 
  authenticate('project:read'), 
  projectController.getProjects
);
```

### **2. Team Membership Required:**
```javascript
import { requireTeamMembership } from '~/middlewares/teamAuth';

router.get('/:teamId/projects', 
  requireTeamMembership('teamId'),
  projectController.getProjects
);
```

### **3. Specific Team Role Required:**
```javascript
import { requireTeamRole } from '~/middlewares/teamAuth';

router.post('/:teamId/members', 
  requireTeamRole(['team_lead', 'senior_member'], 'teamId'),
  teamController.addMember
);
```

### **4. Team Permission Required:**
```javascript
import { requireTeamPermission } from '~/middlewares/teamAuth';

router.post('/:teamId/projects', 
  requireTeamPermission('project', 'create', 'teamId'),
  projectController.createProject
);
```

### **5. Team Management Required:**
```javascript
import { requireTeamManagement } from '~/middlewares/teamAuth';

router.put('/:teamId/members/role', 
  requireTeamManagement('teamId'),
  teamController.updateMemberRole
);
```

## Permission Flow

### **1. Request Processing:**
```
1. User makes request to /api/v1/teams/:teamId/projects
2. Authentication middleware checks JWT token
3. Team authentication middleware extracts teamId
4. Checks global role permissions first
5. If no global permissions, checks team permissions
6. Verifies user is team member
7. Checks specific resource permission
8. Allows/denies access
```

### **2. Permission Priority:**
```
1. Global Role Permissions (highest priority)
2. Team Role Permissions
3. Team Resource Permissions
4. Permission Scope (team/own/all)
```

## Team Management Workflow

### **1. Creating a Team:**
1. User with `team:create` permission creates team
2. Creator automatically becomes `team_lead`
3. Team gets default permissions for lead role
4. Creator is added to user's team memberships

### **2. Adding Members:**
1. Team lead or senior member adds user to team
2. Specifies role and permissions
3. User is added to team members
4. User's team memberships are updated
5. Notification sent to new member

### **3. Managing Permissions:**
1. Team lead can update member roles
2. Permissions can be customized per member
3. Changes are applied immediately
4. Audit trail maintained

## Integration with Existing System

### **1. Project Teams:**
- Projects can be assigned to teams
- Team members can access project resources
- Project-specific permissions apply

### **2. Client Management:**
- Clients can be assigned to teams
- Team members can manage assigned clients
- Client access is team-scoped

### **3. Lead Management:**
- Leads can be assigned to teams
- Team members can work on team leads
- Lead conversion follows team permissions

## Security Features

### **1. Permission Validation:**
- All permissions are validated at multiple levels
- Team membership is verified for each request
- Resource access is scoped appropriately

### **2. Audit Trail:**
- All team changes are logged
- Member additions/removals are tracked
- Permission changes are recorded

### **3. Data Isolation:**
- Team data is isolated by team membership
- Cross-team access requires explicit permissions
- Resource ownership is respected

## Best Practices

### **1. Team Organization:**
- Create teams based on project types or departments
- Use clear naming conventions
- Set appropriate team types

### **2. Permission Management:**
- Follow principle of least privilege
- Grant minimum required permissions
- Regularly review and update permissions

### **3. Role Assignment:**
- Assign roles based on responsibilities
- Use team_lead sparingly
- Provide clear role descriptions

### **4. Security:**
- Regularly audit team memberships
- Monitor permission changes
- Use strong authentication

## Migration from Existing System

### **1. Existing Users:**
- All existing users retain their global roles
- No immediate changes to current permissions
- Teams can be created and users added gradually

### **2. Existing Projects:**
- Projects can be assigned to teams
- Existing project access remains unchanged
- Team permissions apply to new operations

### **3. Gradual Adoption:**
- Start with creating teams
- Add users to teams gradually
- Migrate projects to teams over time

## Monitoring and Analytics

### **1. Team Statistics:**
- Team member counts
- Permission usage
- Activity tracking

### **2. Performance Metrics:**
- Permission check performance
- Team operation efficiency
- Resource access patterns

### **3. Security Monitoring:**
- Failed permission checks
- Unusual access patterns
- Team membership changes

Your team-based RBAC system is now ready to provide granular, secure access control for your interior design management platform! 🎉
