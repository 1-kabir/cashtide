const { supabase } = require('../utils/supabaseClient');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Send subscription reminder notifications
  async sendSubscriptionReminders() {
    try {
      // Find subscriptions that renew in the next 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const threeDaysISOString = threeDaysFromNow.toISOString().split('T')[0];

      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          wallets (user_id, users (email, name))
        `)
        .eq('status', 'active')
        .lte('end_date', threeDaysISOString);

      if (error) {
        console.error('Error fetching subscriptions for reminders:', error);
        return;
      }

      // Send reminder for each subscription
      for (const subscription of subscriptions) {
        const user = subscription.wallets.users;
        const daysUntilRenewal = Math.ceil(
          (new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)
        );

        const subject = `Subscription Renewal Reminder: ${subscription.name}`;
        const html = `
          <h2>Subscription Renewal Reminder</h2>
          <p>Hello ${user.name},</p>
          <p>Your subscription "<strong>${subscription.name}</strong>" is renewing in ${daysUntilRenewal} days.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Amount: ${subscription.amount} ${subscription.currency}</li>
            <li>Interval: ${subscription.interval_type}</li>
            <li>Renewal Date: ${subscription.end_date}</li>
          </ul>
          <p>Manage your subscriptions in your CashTide account.</p>
        `;

        await this.sendEmail(user.email, subject, html);
      }
    } catch (error) {
      console.error('Error in subscription reminder job:', error);
    }
  }

  // Send free trial expiration notifications
  async sendFreeTrialExpirations() {
    try {
      // Find free trials that expire in the next 2 days
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      const twoDaysISOString = twoDaysFromNow.toISOString().split('T')[0];

      const { data: freeTrials, error } = await supabase
        .from('free_trials')
        .select(`
          *,
          wallets (user_id, users (email, name))
        `)
        .eq('status', 'active')
        .lte('end_date', twoDaysISOString);

      if (error) {
        console.error('Error fetching free trials for expiration alerts:', error);
        return;
      }

      // Send alert for each expiring free trial
      for (const freeTrial of freeTrials) {
        const user = freeTrial.wallets.users;
        const daysUntilExpiration = Math.ceil(
          (new Date(freeTrial.end_date) - new Date()) / (1000 * 60 * 60 * 24)
        );

        const subject = `Free Trial Expiring Soon: ${freeTrial.name}`;
        const html = `
          <h2>Free Trial Expiration Alert</h2>
          <p>Hello ${user.name},</p>
          <p>Your free trial for "<strong>${freeTrial.name}</strong>" is ending in ${daysUntilExpiration} days.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Start Date: ${freeTrial.start_date}</li>
            <li>End Date: ${freeTrial.end_date}</li>
            ${freeTrial.related_subscription_name ? `<li>Related Subscription: ${freeTrial.related_subscription_name}</li>` : ''}
          </ul>
          <p>Don't miss out on this service after your trial ends.</p>
        `;

        await this.sendEmail(user.email, subject, html);
      }
    } catch (error) {
      console.error('Error in free trial expiration job:', error);
    }
  }

  // Send pending transaction review notifications
  async sendPendingReviewNotifications() {
    try {
      // Find AI extractions that are pending review for more than 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: pendingExtractions, error } = await supabase
        .from('ai_intentions')
        .select(`
          *,
          wallets (user_id, users (email, name))
        `)
        .eq('intent_type', 'extension_extraction')
        .eq('status', 'pending')
        .lt('created_at', yesterday.toISOString());

      if (error) {
        console.error('Error fetching pending extractions for review:', error);
        return;
      }

      // Send notification for each pending extraction
      for (const extraction of pendingExtractions) {
        const user = extraction.wallets.users;

        const subject = 'Pending Transaction Review';
        const html = `
          <h2>Pending Transaction Review</h2>
          <p>Hello ${user.name},</p>
          <p>You have a transaction extracted from the Chrome extension awaiting your review.</p>
          <p>Please log in to your CashTide account to review and confirm the extracted transaction.</p>
          <p>Extraction ID: ${extraction.id}</p>
        `;

        await this.sendEmail(user.email, subject, html);
      }
    } catch (error) {
      console.error('Error in pending review notification job:', error);
    }
  }

  // Send a generic system notification
  async sendSystemNotification(userId, subject, message) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user for system notification:', error);
        return false;
      }

      const html = `
        <h2>${subject}</h2>
        <p>Hello ${user.name},</p>
        <p>${message}</p>
        <p>This is an automated message from CashTide. Please do not reply to this email.</p>
      `;

      await this.sendEmail(user.email, subject, html);
      return true;
    } catch (error) {
      console.error('Error sending system notification:', error);
      return false;
    }
  }

  // Internal method to send emails
  async sendEmail(to, subject, html) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured, skipping email:', to);
      return;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cashtide.com',
        to,
        subject,
        html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to: ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Start periodic notification jobs
  startPeriodicJobs() {
    // Run subscription reminders daily
    setInterval(() => {
      this.sendSubscriptionReminders();
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    // Run free trial alerts daily
    setInterval(() => {
      this.sendFreeTrialExpirations();
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    // Run pending review notifications twice daily
    setInterval(() => {
      this.sendPendingReviewNotifications();
    }, 12 * 60 * 60 * 1000); // Every 12 hours

    // Initial run
    setTimeout(() => {
      this.sendSubscriptionReminders();
      this.sendFreeTrialExpirations();
      this.sendPendingReviewNotifications();
    }, 5000); // Run initial checks after 5 seconds
  }
}

// Singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;