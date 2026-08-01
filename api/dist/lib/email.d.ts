export declare function sendWelcomeEmail(email: string, firstName?: string | null): Promise<void>;
export declare function sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
export declare function sendPaymentConfirmationEmail(email: string, firstName: string | null | undefined, planId: string, amountCents: number, currency: string): Promise<void>;
export declare function sendPlanChangeEmail(email: string, firstName: string | null | undefined, oldPlanId: string, newPlanId: string): Promise<void>;
//# sourceMappingURL=email.d.ts.map