import 'reflect-metadata';
import { McpApp, Module, McpApplicationFactory } from '@nitrostack/core';
import { SignalCollectorController } from './tools/signalCollector.controller.js';
import { CorrelatorController } from './tools/correlator.controller.js';
import { ClassifierController } from './tools/classifier.controller.js';
import { NotifierController } from './tools/notifier.controller.js';
import { QueryController } from './tools/query.controller.js';
import { initDb, closeDb } from './db.js';

@Module({
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
class AppModule {}

@McpApp({
  module: AppModule,
  server: { name: 'escalation-triage', version: '2.0.0' },
})
class EscalationTriageApp {}

async function main() {
  await initDb();
  const app = await McpApplicationFactory.create(EscalationTriageApp);
  await app.start();
  console.error('Escalation Triage MCP server is running (JSON file-backed).');
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    console.error(`Received ${signal}, shutting down...`);
    try {
      await closeDb();
    } finally {
      process.exit(0);
    }
  });
}

main().catch((err) => {
  console.error('Failed to start Escalation Triage MCP server:', err);
  process.exit(1);
});
