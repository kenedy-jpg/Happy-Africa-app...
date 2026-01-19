/**
 * Upload Diagnostics Service
 * Helps troubleshoot video upload failures by testing database connectivity,
 * RLS policies, and table structure.
 */

import { supabase } from './supabaseClient';

export const uploadDiagnostics = {
  /**
   * Run full diagnostic suite for upload issues
   */
  async runFullDiagnostic(): Promise<{
    isDbConnected: boolean;
    isAuthenticated: boolean;
    canInsertVideos: boolean;
    canQueryVideos: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const results = {
      isDbConnected: false,
      isAuthenticated: false,
      canInsertVideos: false,
      canQueryVideos: false,
      errors: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // Test 1: Database Connection
      console.log('[Diagnostic] Testing database connection...');
      const { error: connError } = await supabase.from('videos').select('id').limit(1);
      
      if (connError) {
        if (connError.code === 'PGRST116') {
          results.errors.push('Database table "videos" does not exist');
          results.recommendations.push('Run Supabase migration to create videos table');
        } else if ((connError as any).status === 401) {
          results.errors.push('Unauthorized - check Supabase API key');
          results.isDbConnected = false;
        } else {
          results.warnings.push(`Database connection issue: ${connError.message}`);
          results.isDbConnected = true; // Server responded, just with an error
        }
      } else {
        results.isDbConnected = true;
      }

      // Test 2: Authentication
      console.log('[Diagnostic] Testing authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        results.errors.push('User not authenticated');
        results.recommendations.push('Ensure user is logged in before uploading');
      } else {
        results.isAuthenticated = true;
        console.log('[Diagnostic] Authenticated as:', user.id);
      }

      // Test 3: Query Permission
      console.log('[Diagnostic] Testing query permissions...');
      const { error: queryError } = await supabase
        .from('videos')
        .select('id, user_id')
        .limit(1);
      
      if (queryError) {
        results.errors.push(`Query permission denied: ${queryError.message}`);
        results.recommendations.push('Check RLS policies for "videos" table SELECT');
        results.canQueryVideos = false;
      } else {
        results.canQueryVideos = true;
      }

      // Test 4: Insert Permission (if authenticated)
      if (results.isAuthenticated && user) {
        console.log('[Diagnostic] Testing insert permissions with test record...');
        
        const testRecord = {
          id: `test_${Date.now()}`,
          user_id: user.id,
          file_path: 'test.mp4',
          video_url: 'https://example.com/test.mp4',
          description: 'Diagnostic test',
          poster_url: null,
          duration: 0,
          is_published: false,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('videos')
          .insert(testRecord);
        
        if (insertError) {
          results.errors.push(`Insert permission denied: ${insertError.message}`);
          
          if (insertError.code === 'PGRST501') {
            results.recommendations.push('Enable INSERT in RLS policies for videos table');
          } else if ((insertError as any).code === '42703') {
            results.recommendations.push('Check if all required columns exist in videos table');
          }
          
          results.canInsertVideos = false;
        } else {
          // Clean up test record
          try {
            await supabase.from('videos').delete().eq('id', `test_${Date.now()}`);
          } catch (e) {
            console.warn('[Diagnostic] Could not clean up test record');
          }
          
          results.canInsertVideos = true;
        }
      }

      // Test 5: Storage bucket
      console.log('[Diagnostic] Testing storage bucket...');
      const { data: buckets } = await supabase.storage.listBuckets();
      
      if (!buckets?.find(b => b.name === 'videos')) {
        results.warnings.push('Storage bucket "videos" not found');
        results.recommendations.push('Create "videos" bucket in Supabase Storage');
      }

    } catch (e: any) {
      results.errors.push(`Diagnostic error: ${e.message}`);
    }

    // Generate summary
    const hasErrors = results.errors.length > 0;
    const allTestsPassed = results.isDbConnected && 
                          results.isAuthenticated && 
                          results.canQueryVideos && 
                          results.canInsertVideos;

    if (allTestsPassed) {
      console.log('[Diagnostic] ✅ All tests passed - database setup is correct');
    } else {
      console.error('[Diagnostic] ❌ Issues detected:');
      results.errors.forEach(e => console.error('  ERROR:', e));
      results.warnings.forEach(w => console.warn('  WARNING:', w));
      results.recommendations.forEach(r => console.info('  FIX:', r));
    }

    return results;
  },

  /**
   * Get a user-friendly error message from diagnostic results
   */
  getUserMessage(diagnostic: Awaited<ReturnType<typeof uploadDiagnostics.runFullDiagnostic>>): string {
    if (!diagnostic.isAuthenticated) {
      return 'Please log in to upload videos';
    }

    if (!diagnostic.isDbConnected) {
      return 'Database connection failed. Please check your internet connection and try again.';
    }

    if (!diagnostic.canInsertVideos) {
      return 'Unable to save video to database. This is a server configuration issue. Please contact support.';
    }

    if (diagnostic.errors.length > 0) {
      return `Upload error: ${diagnostic.errors[0]}`;
    }

    return 'Unknown error occurred during upload';
  }
};
