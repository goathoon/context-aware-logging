import { WideEvent } from '../../domain/wide-event';

/**
 * Logger interface - defines the contract for logging implementations.
 * This interface must not change, even when storage changes.
 */
export abstract class LoggerPort {
  abstract log(event: WideEvent): Promise<void>;
}
