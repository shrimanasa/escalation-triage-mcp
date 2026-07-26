var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ControllerDecorator as Controller, ToolDecorator as Tool, z } from '@nitrostack/core';
import { findOrCreateCustomer, draftNotification, approveAndSendNotification, getPendingNotifications, getBugsForCustomerName, markBugFixed, } from '../db.js';
/**
 * AGENT: Notifier / Loop-Closer
 * - Internal alerts fire immediately (no approval needed).
 * - Customer-facing messages (assignment + resolution) are DRAFTED here but
 *   only marked "sent" once a human calls approve_and_send — this is what
 *   backs your approval-card UI.
 * - watch_bug_status / mark_bug_fixed is what triggers the resolution notice.
 */
let NotifierController = class NotifierController {
    async notifyInternal(input, ctx) {
        const message = `You've been assigned a ${input.label} issue for ${input.customerName}, risk ${input.riskScore}/10`;
        ctx.logger.info('Internal notification', { to: input.ownerName, message });
        return { sent: true, to: input.ownerName, message };
    }
    async draftCustomerMessage(input, ctx) {
        const customer = await findOrCreateCustomer(input.customerName);
        let message;
        if (input.kind === 'assignment') {
            message = `Hi ${customer.name}, thanks for reaching out. Your ${input.label ?? 'issue'} has been assigned to ${input.ownerName ?? 'our team'} and they're on it.`;
        }
        else {
            message = `Hi ${customer.name}, good news — the issue${input.bugTitle ? ` ("${input.bugTitle}")` : ''} you reported has been resolved. Let us know if anything else comes up.`;
        }
        const notificationId = await draftNotification(customer.id, input.kind, message);
        ctx.logger.info('Drafted customer message pending approval', { notificationId });
        return { notificationId, draft: message, status: 'pending_approval' };
    }
    async approveAndSend(input, ctx) {
        const result = await approveAndSendNotification(input.notificationId);
        ctx.logger.info('Notification approved and sent', { notificationId: input.notificationId });
        return { sent: true, notification: result };
    }
    async getPending(_input, _ctx) {
        return { pending: await getPendingNotifications() };
    }
    async markFixed(input, ctx) {
        await markBugFixed(input.bugId);
        ctx.logger.info('Bug marked fixed', { bugId: input.bugId });
        return { bugId: input.bugId, status: 'fixed' };
    }
    async getBugs(input, _ctx) {
        return { bugs: await getBugsForCustomerName(input.customerName) };
    }
};
__decorate([
    Tool({
        name: 'notify_internal',
        description: 'Immediately notify the assigned owner internally (e.g. Slack DM/log). No approval required.',
        inputSchema: z.object({
            ownerName: z.string(),
            customerName: z.string(),
            label: z.string(),
            riskScore: z.number(),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotifierController.prototype, "notifyInternal", null);
__decorate([
    Tool({
        name: 'draft_customer_message',
        description: 'Draft a customer-facing message (assignment notice or resolution notice). Returns a draft that must be approved via approve_and_send before it counts as sent — this backs the approval-card UI.',
        inputSchema: z.object({
            customerName: z.string(),
            kind: z.enum(['assignment', 'resolution']),
            ownerName: z.string().optional(),
            label: z.string().optional(),
            bugTitle: z.string().optional(),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotifierController.prototype, "draftCustomerMessage", null);
__decorate([
    Tool({
        name: 'approve_and_send',
        description: 'Human-approved: mark a drafted customer notification as sent. Call this only after a person clicks Approve.',
        inputSchema: z.object({ notificationId: z.number() }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotifierController.prototype, "approveAndSend", null);
__decorate([
    Tool({
        name: 'get_pending_approvals',
        description: 'List all drafted customer notifications waiting for human approval.',
        inputSchema: z.object({}),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotifierController.prototype, "getPending", null);
__decorate([
    Tool({
        name: 'mark_bug_fixed',
        description: 'Mark a bug as fixed. Use this to simulate an engineer resolving the linked bug live during a demo; it is what should trigger a resolution notice draft.',
        inputSchema: z.object({ bugId: z.number() }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotifierController.prototype, "markFixed", null);
__decorate([
    Tool({
        name: 'get_bugs_for_customer',
        description: 'Check bug status(es) for a customer, e.g. to answer "has the Globex bug shipped".',
        inputSchema: z.object({ customerName: z.string() }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotifierController.prototype, "getBugs", null);
NotifierController = __decorate([
    Controller('notify')
], NotifierController);
export { NotifierController };
