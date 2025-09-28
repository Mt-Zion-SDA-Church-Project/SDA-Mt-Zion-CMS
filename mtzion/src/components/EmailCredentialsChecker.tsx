import React, { useEffect } from 'react';
import { checkForPendingCredentialsEmails } from '../lib/emailService';

const EmailCredentialsChecker: React.FC = () => {
  useEffect(() => {
    // Check for pending credentials emails when component mounts
    const checkEmails = async () => {
      try {
        await checkForPendingCredentialsEmails();
      } catch (error) {
        console.error('Error checking for pending credentials emails:', error);
      }
    };

    checkEmails();

    // Set up interval to check every 5 minutes
    const interval = setInterval(checkEmails, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything, it just runs in the background
  return null;
};

export default EmailCredentialsChecker;




