import { parameterCount } from '@/domain/network/model';
import type { TrainingInput } from './session';
/** Numeric lower bound, not a JavaScript heap or wall-time prediction. */
export function trainingBudget(input: TrainingInput) {
  const parameters = parameterCount(input.config.spec);
  const updates = Math.ceil(input.train.ids.length / input.config.batchSize) * input.config.epochs;
  const epochs = input.config.epochs,
    train = input.train.ids.length,
    validation = input.validation.ids.length;
  const lower = parameters * epochs * (3 * train + validation);
  const upper = parameters * epochs * (5 * train + validation);
  const numericBytes = ((train + validation) * (input.config.spec.inputs + 1) + 4 * parameters) * 8;
  return {
    parameters,
    updates,
    lower,
    upper,
    numericBytes,
    extensive: upper > 1e9 || updates > 100000,
  };
}
