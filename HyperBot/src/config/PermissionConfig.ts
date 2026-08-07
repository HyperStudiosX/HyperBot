export interface PermissionConfig{

    /* --------------------------------------------------------
     * General
     * -------------------------------------------------------- */

    enabled:boolean;

    defaultPolicy:

        "allow"|

        "deny";

    inheritanceEnabled:boolean;

    /* --------------------------------------------------------
     * Permission Checks
     * -------------------------------------------------------- */

    checkAdministrator:boolean;

    checkOwner:boolean;

    checkRoleHierarchy:boolean;

    cachePermissions:boolean;

    cacheDuration:number;

    /* --------------------------------------------------------
     * Default Roles
     * -------------------------------------------------------- */

    adminRoles:string[];

    moderatorRoles:string[];

    supportRoles:string[];

    bypassRoles:string[];

    /* --------------------------------------------------------
     * Overrides
     * -------------------------------------------------------- */

    allowOverrides:boolean;

    maximumOverrides:number;

    /* --------------------------------------------------------
     * Audit
     * -------------------------------------------------------- */

    auditPermissionChanges:boolean;

    logFailedChecks:boolean;

}
