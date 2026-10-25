import { parameterCount } from '@/domain/network/model';
import type { TrainingInput } from './session';
import { batchCount } from './batches';
/** Numeric lower bound, not a JavaScript heap or wall-time prediction. */
export function trainingBudget(input: TrainingInput) {
  const parameters = parameterCount(input.config.spec);
  const updates =
    batchCount(
      input.train.ids.length,
      input.config.batchSize,
      !!input.config.spec.batchNormalization,
    ) * input.config.epochs;
  const epochs = input.config.epochs,
    train = input.train.ids.length,
    validation = input.validation.ids.length;
  const lower = parameters * epochs * (3 * train + validation);
  const upper = parameters * epochs * (5 * train + validation);
  const numericBytes =
    ((train + validation) * (input.config.spec.inputs + 1) +
      (input.config.spec.batchNormalization
        ? (6 * Math.min(train, input.config.batchSize + 1) + 8) *
          input.config.spec.hidden.reduce((s, n) => s + n, 0)
        : 0) +
      (input.config.earlyStopping ? 7 : 4) * parameters +
      (input.config.earlyStopping ? 24 * (epochs + 1) : 0) +
      (input.config.dropout
        ? (input.config.earlyStopping ? 4 : 3) *
            input.config.spec.hidden.reduce((s, n) => s + n, 0) +
          4
        : 0)) *
    8;
  return {
    parameters,
    updates,
    lower,
    upper,
    numericBytes,
    extensive: upper > 1e9 || updates > 100000,
  };
}
