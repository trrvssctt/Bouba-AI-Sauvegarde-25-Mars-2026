import { Pool, PoolClient } from 'pg';
export declare const pool: Pool;
export declare function query<T = any>(text: string, params?: any[]): Promise<T[]>;
export declare function queryOne<T = any>(text: string, params?: any[]): Promise<T | null>;
export declare function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
export declare function testConnection(): Promise<boolean>;
export interface Role {
    id: string;
    name: 'user' | 'admin' | 'superadmin';
    description?: string;
    permissions: string[];
    created_at: Date;
}
export interface User {
    id: string;
    email: string;
    email_verified: boolean;
    name?: string;
    image?: string;
    provider: 'google' | 'email' | 'magic_link';
    provider_id?: string;
    password_hash?: string;
    role_id: string;
    role_name?: 'user' | 'admin' | 'superadmin';
    created_at: Date;
    updated_at: Date;
}
export interface Profile {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    role: 'user' | 'admin' | 'superadmin';
    plan_id: string;
    messages_used: number;
    messages_limit: number;
    subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'suspended' | 'pending';
    stripe_customer_id?: string;
    google_access_token?: string;
    google_refresh_token?: string;
    google_token_expiry?: Date;
    google_scopes: string[];
    preferences: Record<string, any>;
    onboarding_complete: boolean;
    onboarding_step: number;
    last_active_at?: Date;
    created_at: Date;
    updated_at: Date;
}
export interface Plan {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    billing_interval: 'monthly' | 'yearly';
    trial_days: number;
    agents_limit: number;
    messages_limit: number;
    features: any[];
    limits: Record<string, any>;
    stripe_price_id?: string;
    popular: boolean;
    active: boolean;
    created_at: Date;
}
//# sourceMappingURL=db.d.ts.map