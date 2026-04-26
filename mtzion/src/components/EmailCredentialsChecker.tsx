import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkForPendingCredentialsEmails } from '../lib/emailService';
import { queryKeys } from '../lib/queryKeys';

const EmailCredentialsChecker: React.FC = () => {
  useQuery({
    queryKey: queryKeys.emailCredentials.pendingCheck(),
    queryFn: () => checkForPendingCredentialsEmails(),
    refetchInterval: 5 * 60 * 1000,
  });

  return null;
};

export default EmailCredentialsChecker;
