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
import { findOrCreateCustomer, getSignalsForCustomer } from '../db.js';
/**
 * AGENT: Signal Collector
 * Pulls raw data from tickets, CRM/slack, and bug tracker; normalizes into
 * one common shape: { source, timestamp, message, customer }.
 */
let SignalCollectorController = class SignalCollectorController {
    async getSignals(input, ctx) {
        ctx.logger.info('Collecting signals', { customer: input.customerName });
        const customer = await findOrCreateCustomer(input.customerName);
        const signals = await getSignalsForCustomer(customer.id, customer.name);
        return {
            customer: customer.name,
            signalCount: signals.length,
            signals,
        };
    }
};
__decorate([
    Tool({
        name: 'get_signals_for_customer',
        description: 'Pull and normalize every raw signal (support tickets, Slack/CRM messages, bug tracker entries) for a given customer name into one unified timeline.',
        inputSchema: z.object({
            customerName: z.string().describe('The customer/account name, e.g. "Acme Corp"'),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SignalCollectorController.prototype, "getSignals", null);
SignalCollectorController = __decorate([
    Controller('signals')
], SignalCollectorController);
export { SignalCollectorController };
