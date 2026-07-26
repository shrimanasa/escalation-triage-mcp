var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import 'reflect-metadata';
import { McpApp, Module, McpApplicationFactory } from '@nitrostack/core';
import { SignalCollectorController } from './tools/signalCollector.controller.js';
import { CorrelatorController } from './tools/correlator.controller.js';
import { ClassifierController } from './tools/classifier.controller.js';
import { NotifierController } from './tools/notifier.controller.js';
import { QueryController } from './tools/query.controller.js';
import { initDb, closeDb } from './db.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        name: 'escalation-triage',
        description: 'Escalation Triage agents: signal collection, correlation/risk, classification/assignment, notification, and status queries',
        controllers: [
            SignalCollectorController,
            CorrelatorController,
            ClassifierController,
            NotifierController,
            QueryController,
        ],
    })
], AppModule);
let EscalationTriageApp = class EscalationTriageApp {
};
EscalationTriageApp = __decorate([
    McpApp({
        module: AppModule,
        server: { name: 'escalation-triage', version: '2.0.0' },
    })
], EscalationTriageApp);
async function main() {
    await initDb();
    const app = await McpApplicationFactory.create(EscalationTriageApp);
    await app.start();
    console.error('Escalation Triage MCP server is running (JSON file-backed).');
}
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
        console.error(`Received ${signal}, shutting down...`);
        try {
            await closeDb();
        }
        finally {
            process.exit(0);
        }
    });
}
main().catch((err) => {
    console.error('Failed to start Escalation Triage MCP server:', err);
    process.exit(1);
});
