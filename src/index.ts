import 'reflect-metadata';
import { McpApp, Module, McpApplicationFactory } from '@nitrostack/core';
import { SignalCollectorController } from './tools/signalCollector.controller.js';
import { CorrelatorController } from './tools/correlator.controller.js';
import { ClassifierController } from './tools/classifier.controller.js';
import { NotifierController } from './tools/notifier.controller.js';
import { QueryController } from './tools/query.controller.js';
import { initDb } from './db.js';

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

const isCloud = !!(process.env.PORT || process.env.NITRO_CLOUD || process.env.NODE_ENV === 'production');
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

@McpApp({
  module: AppModule,
  server: { name: 'escalation-triage', version: '2.0.0' },
  transport: {
    type: isCloud ? 'http' : 'stdio',
    ...(isCloud
      ? {
          http: {
            port,
            host: '0.0.0.0',
            basePath: '/mcp',
          },
        }
      : {}),
  },
})
class EscalationTriageApp {}

async function main() {
  await initDb();
  const app = await McpApplicationFactory.create(EscalationTriageApp);
  await app.start();
  console.error(`Escalation Triage MCP server running (${isCloud ? `HTTP port ${port}` : 'STDIO'}).`);
}

main().catch((err) => {
  console.error('Failed to start Escalation Triage MCP server:', err);
  process.exit(1);
});
