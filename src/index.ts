#!/usr/bin/env node

import { CranPackageReadmeMcpServer } from './server.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const server = new CranPackageReadmeMcpServer();
  
  // Handle process signals
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.run();
    logger.info('CRAN Package README MCP Server started successfully');
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error in main', { error });
  process.exit(1);
});