import * as cron from 'node-cron';
import { SecurityService } from './security';
import { logger } from '../utils/logger';

export class CronService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all cron jobs
   */
  static startAll(): void {
    this.startExpiredMessagesCleanup();
    logger.info('All cron jobs started');
  }

  /**
   * Stop all cron jobs
   */
  static stopAll(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped cron job: ${name}`);
    });
    this.jobs.clear();
    logger.info('All cron jobs stopped');
  }

  /**
   * Start expired messages cleanup job (runs every minute)
   */
  private static startExpiredMessagesCleanup(): void {
    const job = cron.schedule('* * * * *', async () => {
      try {
        const deletedCount = await SecurityService.deleteExpiredMessages();
        if (deletedCount > 0) {
          logger.info(`Cleaned up ${deletedCount} expired messages`);
        }
      } catch (error) {
        logger.error('Error in expired messages cleanup job:', error);
      }
    });

    job.start();
    job.destroy(); // Stop immediately and restart properly
    const restartedJob = cron.schedule('* * * * *', async () => {
      try {
        const deletedCount = await SecurityService.deleteExpiredMessages();
        if (deletedCount > 0) {
          logger.info(`Cleaned up ${deletedCount} expired messages`);
        }
      } catch (error) {
        logger.error('Error in expired messages cleanup job:', error);
      }
    });
    restartedJob.start();
    this.jobs.set('expiredMessagesCleanup', restartedJob);
    logger.info('Started expired messages cleanup job (runs every minute)');
  }

  /**
   * Get status of all jobs
   */
  static getJobsStatus(): Array<{ name: string; running: boolean }> {
    const status: Array<{ name: string; running: boolean }> = [];
    
    this.jobs.forEach((_, name) => {
      status.push({
        name,
        running: true // Assume running since we just started them
      });
    });

    return status;
  }
}