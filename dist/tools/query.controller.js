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
import { findOrCreateCustomer, getSignalsForCustomer, getAllOwnerLoads, getBugsForCustomerName, } from '../db.js';
/**
 * Supports the "Stay queryable" step: lets the orchestrator answer things
 * like "what's going on with Acme Corp" or "who's overloaded right now"
 * without the person digging through three tools.
 */
let QueryController = class QueryController {
    async getCustomerStatus(input, _ctx) {
        const customer = await findOrCreateCustomer(input.customerName);
        const signals = await getSignalsForCustomer(customer.id, customer.name);
        const bugs = await getBugsForCustomerName(customer.name);
        return { customer: customer.name, signals, bugs };
    }
    async getTeamLoad(_input, _ctx) {
        const loads = await getAllOwnerLoads();
        return {
            loads,
            overloaded: loads.filter((l) => l.load >= l.max_load).map((l) => l.owner),
        };
    }
};
__decorate([
    Tool({
        name: 'get_customer_status',
        description: 'Get a full status snapshot for a customer: signals, bugs, and timeline — for answering "what\'s going on with X".',
        inputSchema: z.object({ customerName: z.string() }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], QueryController.prototype, "getCustomerStatus", null);
__decorate([
    Tool({
        name: 'get_team_load',
        description: 'List every owner\'s current open-issue load vs. their max threshold, to answer "who\'s overloaded right now".',
        inputSchema: z.object({}),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], QueryController.prototype, "getTeamLoad", null);
QueryController = __decorate([
    Controller('query')
], QueryController);
export { QueryController };
