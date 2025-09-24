// Script to check Google tokens in the database
// Run with: node scripts/check-google-tokens.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url') {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGoogleTokens() {
  try {
    console.log('🔍 Checking Google tokens in database...\n');
    
    // Get all Google tokens
    const { data: tokens, error } = await supabase
      .from('google_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('📭 No Google tokens found in database');
      console.log('💡 Make sure you have:');
      console.log('   1. Signed in with Google');
      console.log('   2. Granted YouTube permissions');
      console.log('   3. Run the migration: supabase db reset');
      return;
    }

    console.log(`📊 Found ${tokens.length} Google token(s):\n`);

    tokens.forEach((token, index) => {
      const isExpired = token.expires_at <= Math.floor(Date.now() / 1000);
      const expiresAt = new Date(token.expires_at * 1000).toLocaleString();
      
      console.log(`🔑 Token ${index + 1}:`);
      console.log(`   User ID: ${token.user_id}`);
      console.log(`   Scope: ${token.scope || 'Not specified'}`);
      console.log(`   Expires: ${expiresAt} ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      console.log(`   Has Refresh Token: ${token.refresh_token ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${new Date(token.created_at).toLocaleString()}`);
      console.log('');
    });

    // Check for users with Google authentication
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email, app_metadata')
      .eq('app_metadata->provider', 'google');

    if (!userError && users) {
      console.log(`👥 Found ${users.length} user(s) who signed in with Google:`);
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkGoogleTokens();
