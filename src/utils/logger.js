import logConfig from './log-config.js';

export default class Logger {
    static info(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [INFO] ${message}`);
        logConfig.sendToDiscord('info', message).catch(() => { });
    }

    static warn(message) {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [WARN] ${message}`);
        logConfig.sendToDiscord('warn', message).catch(() => { });
    }

    static error(message, error = null) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [ERROR] ${message}`);
        if (error) {
            console.error(error);
        }
        const fullMessage = error ? `${message}\n${error.stack || error.message || error}` : message;
        logConfig.sendToDiscord('error', fullMessage).catch(() => { });
    }

    static success(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [SUCCESS] ${message}`);
        logConfig.sendToDiscord('success', message).catch(() => { });
    }
}
