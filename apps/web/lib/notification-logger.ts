// Sistema de Logs Estruturado para Notificações - Charlotte
// Registra entrega, engajamento e erros de notificações

import { getSupabase } from './supabase';
import { readAll } from '@/lib/db-batch';

export type NotificationLogType = 
  | 'practice_reminder' 
  | 'streak_reminder' 
  | 'weekly_challenge' 
  | 'goal_reminder' 
  | 'achievement' 
  | 'marketing';

export type NotificationStatus = 
  | 'sent' 
  | 'delivered' 
  | 'clicked' 
  | 'dismissed' 
  | 'failed' 
  | 'blocked';

export interface NotificationLogEntry {
  user_id: string;
  notification_type: NotificationLogType;
  status: NotificationStatus;
  message_title?: string;
  message_body?: string;
  platform?: 'web' | 'ios' | 'android' | 'fcm';
  error_message?: string;
  metadata?: Record<string, any>;
}

export class NotificationLogger {
  
  /**
   * 📝 Registrar envio de notificação
   */
  static async logNotificationSent(entry: NotificationLogEntry): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        console.warn('⚠️ Supabase not available for logging');
        return;
      }

      const logEntry = {
        user_id: entry.user_id,
        notification_type: entry.notification_type,
        status: entry.status,
        message_title: entry.message_title,
        message_body: entry.message_body,
        platform: entry.platform || 'web',
        error_message: entry.error_message,
        metadata: entry.metadata,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notification_logs')
        .insert(logEntry);

      if (error) {
        console.error('❌ Error logging notification:', error);
      } else {
        console.log(`📝 Logged ${entry.status} notification for user ${entry.user_id}`);
      }

    } catch (error) {
      console.error('❌ Exception in notification logging:', error);
    }
  }

  /**
   * 📊 Obter métricas de notificações por período
   */
  static async getNotificationMetrics(
    startDate: string, 
    endDate: string
  ): Promise<any> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      // Em páginas: o período tem mais de 1.000 envios (cerca de 1.100 por dia) e as métricas saíam cortadas.
      const data = await readAll<any>('envios do período', () => supabase
        .from('notification_logs')
        .select('notification_type, status, platform, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('id'));

      // Processar métricas
      const metrics = {
        total: data.length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        byPlatform: {} as Record<string, number>,
        successRate: 0,
        engagementRate: 0
      };

      let successful = 0;
      let engaged = 0;

      data.forEach(log => {
        // Por tipo
        metrics.byType[log.notification_type] = (metrics.byType[log.notification_type] || 0) + 1;
        
        // Por status
        metrics.byStatus[log.status] = (metrics.byStatus[log.status] || 0) + 1;
        
        // Por plataforma
        metrics.byPlatform[log.platform] = (metrics.byPlatform[log.platform] || 0) + 1;
        
        // Taxa de sucesso
        if (['sent', 'delivered', 'clicked'].includes(log.status)) {
          successful++;
        }
        
        // Taxa de engajamento
        if (log.status === 'clicked') {
          engaged++;
        }
      });

      metrics.successRate = data.length > 0 ? (successful / data.length) * 100 : 0;
      metrics.engagementRate = data.length > 0 ? (engaged / data.length) * 100 : 0;

      return metrics;

    } catch (error) {
      console.error('❌ Error getting notification metrics:', error);
      throw error;
    }
  }

  /**
   * 🔍 Obter logs de um usuário específico
   */
  static async getUserNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error(`❌ Error getting notification history for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 🧹 Limpar logs antigos (manter apenas últimos 90 dias)
   */
  static async cleanupOldLogs(): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        console.warn('⚠️ Supabase not available for cleanup');
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const { error } = await supabase
        .from('notification_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('❌ Error cleaning up old logs:', error);
      } else {
        console.log('🧹 Cleaned up notification logs older than 90 days');
      }

    } catch (error) {
      console.error('❌ Exception in log cleanup:', error);
    }
  }
} 