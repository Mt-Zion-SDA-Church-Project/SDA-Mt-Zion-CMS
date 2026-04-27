/** Central TanStack Query keys — use these with invalidateQueries for consistency. */
export const queryKeys = {
  auth: {
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },
  notifications: {
    header: () => ['notifications', 'header'] as const,
    mobileNav: (authUserId: string) => ['notifications', 'mobileNav', authUserId] as const,
  },
  sidebar: {
    privileges: (authUserId: string, role: string) => ['sidebar', 'privileges', authUserId, role] as const,
  },
  memberMobileNav: {
    notifications: (authUserId: string) => ['memberMobileNav', 'notifications', authUserId] as const,
    privileges: (authUserId: string) => ['memberMobileNav', 'privileges', authUserId] as const,
  },
  emailCredentials: {
    pendingCheck: () => ['emailCredentials', 'pendingCheck'] as const,
  },
  admin: {
    dashboardStats: () => ['admin', 'dashboard', 'stats'] as const,
    /** `activity_logs` list + filters (key usually JSON.stringify) */
    activityLogList: (key: string) => ['admin', 'logs', 'activity', key] as const,
    /** `user_login_sessions` — sign-in / duration log for admins */
    userSessionLogList: (key: string) => ['admin', 'logs', 'user', 'sessions', key] as const,
    reports: (rangeKey: string) => ['admin', 'reports', rangeKey] as const,
    /** Whether an admin may access a `user_privileges.tab_name` (e.g. financial_summaries). */
    tabAllowed: (tabName: string, authUserId: string) => ['admin', 'tabAllowed', tabName, authUserId] as const,
  },
  members: {
    memberDetails: () => ['members', 'memberDetails'] as const,
    familiesOptions: () => ['members', 'familiesOptions'] as const,
    list: () => ['members', 'list'] as const,
    birthdays: (scope: 'admin' | 'member') => ['members', 'birthdays', scope] as const,
    teensDetails: () => ['members', 'teens', 'details'] as const,
    /** Active members count for attendance rate */
    activeCount: () => ['members', 'activeCount'] as const,
  },
  sabbath: {
    classes: () => ['sabbath', 'classes'] as const,
    resources: () => ['sabbath', 'resources'] as const,
  },
  visitors: {
    /** Paginated-style lists by max row count from `visitors` table */
    list: (limit: number) => ['visitors', 'list', limit] as const,
  },
  tithes: {
    cashOfferingAccounts: () => ['givings', 'cashOfferingAccounts'] as const,
  },
  events: {
    upcoming: () => ['events', 'upcoming'] as const,
    list: () => ['events', 'list'] as const,
  },
  systemUsers: {
    manage: () => ['systemUsers', 'manage'] as const,
    /** Subset for “add system user” form list (same invalidate prefix as manage) */
    forAddUser: () => ['systemUsers', 'forAddUser'] as const,
  },
  privileges: {
    manage: (userType: 'admin' | 'member') => ['privileges', 'manage', userType] as const,
  },
  galleries: {
    admin: () => ['galleries', 'admin'] as const,
    member: () => ['galleries', 'member'] as const,
    memberEvents: () => ['galleries', 'member', 'events'] as const,
    memberPhotos: (galleryId: string) => ['galleries', 'member', 'photos', galleryId] as const,
    photos: (galleryId: string) => ['galleries', 'admin', 'photos', galleryId] as const,
  },
  attendance: {
    manager: (filtersKey: string) => ['attendance', 'manager', filtersKey] as const,
    eventSummary: () => ['attendance', 'eventSummary'] as const,
  },
  memberPortal: {
    dashboard: (userId: string) => ['member', 'dashboard', userId] as const,
    /** Aggregated member dashboard stats for the signed-in user (no userId in key — invalidate on auth change). */
    dashboardMe: () => ['member', 'dashboard', 'me'] as const,
    /** Singleton row `member_portal_settings` (e.g. show offerings on member dashboard). */
    settings: () => ['member', 'portal', 'settings'] as const,
    resources: () => ['member', 'sabbathResources'] as const,
    offertoryCategories: () => ['member', 'offertoryCategories'] as const,
    offertoryPayment: (id: string) => ['member', 'offertoryPayment', id] as const,
    memberRow: (userId: string) => ['member', 'row', userId] as const,
    events: () => ['member', 'events'] as const,
    eventsList: (filterType: string, filterDate: string) =>
      ['member', 'events', 'list', filterType, filterDate] as const,
    birthdays: () => ['member', 'birthdays'] as const,
    birthdaysMembers: () => ['member', 'birthdays', 'members'] as const,
  },
  qrCheckIn: {
    memberByUser: (userId: string) => ['qrCheckIn', 'member', userId] as const,
    events: () => ['qrCheckIn', 'events'] as const,
    recentCheckIns: () => ['qrCheckIn', 'recentCheckIns'] as const,
  },
  addMember: {
    families: () => ['addMember', 'families'] as const,
    ministries: () => ['addMember', 'ministries'] as const,
    systemUsers: () => ['addMember', 'systemUsers'] as const,
  },
  addSabbath: {
    systemUsers: () => ['addSabbath', 'systemUsers'] as const,
    members: () => ['addSabbath', 'members'] as const,
  },
  addTeen: {
    teens: () => ['addTeen', 'teens'] as const,
  },
} as const;
