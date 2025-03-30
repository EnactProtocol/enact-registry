// file: src/enhanced-logger.ts
import pino from 'pino';

const pinoLogger = pino({
  level: 'debug',
  transport: { target: require.resolve('pino-pretty'), options: { colorize: true } }
});

const logger = {
  info: (...args: any[]) => {
    if (args.length === 1) {
      pinoLogger.info(args[0]);
    } else {
      const message = args.shift();
      pinoLogger.info({ additionalData: args }, message);
    }
  },
  error: (...args: any[]) => {
    if (args.length === 1) {
      pinoLogger.error(args[0]);
    } else {
      const message = args.shift();
      pinoLogger.error({ additionalData: args }, message);
    }
  },
  debug: (...args: any[]) => {
    if (args.length === 1) {
      pinoLogger.debug(args[0]);
    } else {
      const message = args.shift();
      pinoLogger.debug({ additionalData: args }, message);
    }
  },
  warn: (...args: any[]) => {
    if (args.length === 1) {
      pinoLogger.warn(args[0]);
    } else {
      const message = args.shift();
      pinoLogger.warn({ additionalData: args }, message);
    }
  }
};

export default logger;