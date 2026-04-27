import React from 'react';
import AuditLogPage from './AuditLogPage';

const ActivityLog: React.FC = () => {
  return (
    <AuditLogPage
      logTable="activity_logs"
      title="Activity log"
      description="A chronological record of data changes in the app—member profiles, events, visitors, and system user accounts. Use search and filters to find a specific change; expand a row to see the full before/after data."
    />
  );
};

export default ActivityLog;
