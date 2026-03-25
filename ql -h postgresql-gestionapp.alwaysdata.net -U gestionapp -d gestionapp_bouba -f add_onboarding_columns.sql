                                                                                                                               Table "public.profiles"
        Column        |           Type           | Collation | Nullable |                                                                                                  Default                                                                                                   
----------------------+--------------------------+-----------+----------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 id                   | uuid                     |           | not null | 
 first_name           | text                     |           |          | 
 last_name            | text                     |           |          | 
 avatar_url           | text                     |           |          | 
 role                 | text                     |           | not null | 'user'::text
 plan_id              | text                     |           | not null | 'starter'::text
 messages_used        | integer                  |           | not null | 0
 messages_limit       | integer                  |           | not null | 500
 subscription_status  | text                     |           | not null | 'active'::text
 stripe_customer_id   | text                     |           |          | 
 google_access_token  | text                     |           |          | 
 google_refresh_token | text                     |           |          | 
 google_token_expiry  | timestamp with time zone |           |          | 
 google_scopes        | text[]                   |           | not null | '{}'::text[]
 preferences          | jsonb                    |           | not null | '{"language": "Français", "timezone": "Europe/Paris", "work_type": null, "bouba_tone": "professional", "notifications": {"weekly_report": true, "daily_briefing": true, "important_emails": true}}'::jsonb
 onboarding_complete  | boolean                  |           | not null | false
 onboarding_step      | integer                  |           | not null | 0
 last_active_at       | timestamp with time zone |           |          | 
 created_at           | timestamp with time zone |           | not null | now()
 updated_at           | timestamp with time zone |           | not null | now()
 company              | text                     |           |          | 
 phone                | text                     |           |          | 
 website              | text                     |           |          | 
 work_type            | text                     |           |          | 'entrepreneur'::text
Indexes:
    "profiles_pkey" PRIMARY KEY, btree (id)
    "idx_profiles_last_active_at" btree (last_active_at DESC)
    "idx_profiles_plan_id" btree (plan_id)
    "idx_profiles_role" btree (role)
    "profiles_stripe_customer_id_key" UNIQUE CONSTRAINT, btree (stripe_customer_id)
Check constraints:
    "profiles_onboarding_step_check" CHECK (onboarding_step >= 0 AND onboarding_step <= 4)
    "profiles_role_check" CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'superadmin'::text]))
    "profiles_subscription_status_check" CHECK (subscription_status = ANY (ARRAY['active'::text, 'inactive'::text, 'cancelled'::text, 'past_due'::text]))
Foreign-key constraints:
    "profiles_plan_fkey" FOREIGN KEY (plan_id) REFERENCES plans(id)
    "profiles_user_fkey" FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
Triggers:
    trg_profiles_sync_plan BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION sync_messages_limit()
    trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()

