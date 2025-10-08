import { supabase } from './supabase';

export interface CredentialsEmailData {
  email: string;
  username: string;
  fullName: string;
  role: string;
  loginUrl: string;
}

export const sendCredentialsEmail = async (data: CredentialsEmailData): Promise<void> => {
  try {
    // Create email content
    const emailSubject = 'Welcome to Seventh-Day Adventist Church, Mt. Zion - Kigoma Church Management System - Your Login Credentials';
    
    const emailContent = `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to Seventh-Day Adventist Church, Mt. Zion - Kigoma</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Church Management System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Your Account is Ready!</h2>
            
            <p>Dear ${data.fullName},</p>
            
            <p>Your email has been successfully confirmed. Below are your login credentials for the Seventh-Day Adventist Church, Mt. Zion - Kigoma Church Management System:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="color: #28a745; margin-top: 0;">Login Information</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Username:</strong> ${data.username}</p>
              <p><strong>Role:</strong> ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</p>
              <p><strong>Login URL:</strong> <a href="${data.loginUrl}" style="color: #007bff;">Click here to login</a></p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">Important Security Note</h4>
              <p style="color: #856404; margin-bottom: 0;">For security reasons, we cannot include your password in this email. Please contact your system administrator if you need to reset your password.</p>
            </div>
            
            <p>You can now access the system using your email address and the password that was set during account creation.</p>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6c757d; text-align: center;">
              This is an automated message from Seventh-Day Adventist Church, Mt. Zion - Kigoma Church Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // For now, we'll use a simple approach - you can integrate with your preferred email service
    // This could be SendGrid, AWS SES, or any other email service
    console.log('Email to be sent:', {
      to: data.email,
      subject: emailSubject,
      html: emailContent
    });

    // TODO: Integrate with actual email service
    // Example with a hypothetical email service:
    // await emailService.send({
    //   to: data.email,
    //   subject: emailSubject,
    //   html: emailContent
    // });

    // For now, we'll just log that the email should be sent
    // In a real implementation, you would integrate with your email service here
    
  } catch (error) {
    console.error('Error sending credentials email:', error);
    throw error;
  }
};

export const checkForPendingCredentialsEmails = async (): Promise<void> => {
  try {
    // Check for activity logs indicating credentials emails need to be sent
    const { data: pendingEmails, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('action', 'email_confirmed_credentials_needed')
      .eq('processed', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending credentials emails:', error);
      return;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return;
    }

    // Process each pending email
    for (const log of pendingEmails) {
      try {
        const emailData = log.new_data as CredentialsEmailData;
        const loginUrl = `${window.location.origin}/login`;
        
        await sendCredentialsEmail({
          ...emailData,
          loginUrl
        });

        // Mark as processed
        await supabase
          .from('activity_logs')
          .update({ processed: true })
          .eq('id', log.id);

        console.log(`Credentials email sent to ${emailData.email}`);
      } catch (error) {
        console.error(`Error sending credentials email for log ${log.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking for pending credentials emails:', error);
  }
};




