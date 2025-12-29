import { WideEvent } from '../../domain/wide-event';
import { LoggingContext } from '../../domain/context';
/**
 * Logger interface - defines the contract for logging implementations.
 * This interface must not change, even when storage changes.
 */
export abstract class LoggerPort {
  abstract log(
    event: WideEvent,
    _metadata: LoggingContext['_metadata'],
    _summary: string,
  ): Promise<void>;
}
