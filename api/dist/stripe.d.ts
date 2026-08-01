import { Request, Response } from 'express';
/**
 * NEW FLOW: No account created before payment.
 * User info (including hashed password) is stored in Stripe session metadata.
 * The webhook handler creates the account after payment confirmation.
 */
export declare function createCheckoutSession(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * UPGRADE FLOW (existing user): Create checkout session with userId
 */
export declare function createUpgradeCheckoutSession(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function verifyPaymentSession(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function cancelSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function reactivateSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createBillingPortalSession(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/stripe/check-session?sessionId=xxx
 * Vérifie si le compte a été créé suite au webhook checkout.session.completed
 */
export declare function checkSessionStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=stripe.d.ts.map