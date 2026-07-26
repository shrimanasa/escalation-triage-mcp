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
 * AGENT: Correlator & Risk-Scorer
 * Matches signals to the same customer (already done at collection time via
 * customer_id) and computes a 1-10 risk score with a short explanation,
 * based on signal volume, negative tone, and how long things have been open.
 */
const NEGATIVE_WORDS = [
    'angry', 'furious', 'unacceptable', 'frustrated', 'disappointed', 'urgent',
    'churn', 'cancel', 'terrible', 'worst', 'broken', 'still not', 'again',
    'escalate', 'refund', 'threaten', 'lawsuit', 'lawyer', 'switch to',
];
function scoreRisk(signals) {
    if (signals.length === 0) {
        return { score: 1, reasoning: 'No signals found for this customer.' };
    }
    const volumeScore = Math.min(signals.length, 5);
    const negativeHits = signals.reduce((count, s) => {
        const text = s.message.toLowerCase();
        return count + NEGATIVE_WORDS.filter((w) => text.includes(w)).length;
    }, 0);
    const toneScore = Math.min(negativeHits, 4);
    const oldestTs = signals[0].timestamp;
    const daysOpen = Math.max(0, Math.floor((Date.now() - new Date(oldestTs).getTime()) / (1000 * 60 * 60 * 24)));
    const ageScore = daysOpen >= 7 ? 1 : 0;
    const score = Math.min(10, 1 + volumeScore + toneScore + ageScore);
    const reasoning = `${signals.length} signal(s) across ${new Set(signals.map((s) => s.source)).size} source(s); ` +
        `${negativeHits} negative-tone keyword hit(s); oldest signal is ${daysOpen} day(s) old.`;
    return { score, reasoning };
}
let CorrelatorController = class CorrelatorController {
    async correlateAndScore(input, ctx) {
        const customer = await findOrCreateCustomer(input.customerName);
        const signals = await getSignalsForCustomer(customer.id, customer.name);
        const { score, reasoning } = scoreRisk(signals);
        ctx.logger.info('Scored risk', { customer: customer.name, score });
        return {
            customer: customer.name,
            riskScore: score,
            reasoning,
            signalCount: signals.length,
        };
    }
};
__decorate([
    Tool({
        name: 'correlate_and_score',
        description: 'Correlate all signals for a customer and produce a 1-10 risk score with reasoning, based on signal volume, negative tone, and how long the issue has been open.',
        inputSchema: z.object({
            customerName: z.string().describe('The customer/account name'),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CorrelatorController.prototype, "correlateAndScore", null);
CorrelatorController = __decorate([
    Controller('risk')
], CorrelatorController);
export { CorrelatorController };
